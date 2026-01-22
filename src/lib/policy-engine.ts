import { prisma } from "./db";
import {
    PolicyConfig,
    PolicyConfigSchema,
    QuotaConfig,
    InviteConfig,
    ResolvedPolicy,
    QuotaStatus,
} from "./schemas";
import policiesConfig from "../../config/invite-policies.json";

// Duration parsing utilities
const DURATION_MAP: Record<string, number> = {
    "1h": 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "12h": 12 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000,
    "3d": 3 * 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "14d": 14 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
    "1m": 30 * 24 * 60 * 60 * 1000,
    "3m": 90 * 24 * 60 * 60 * 1000,
    "6m": 180 * 24 * 60 * 60 * 1000,
    "1y": 365 * 24 * 60 * 60 * 1000,
    never: Infinity,
};

const DURATION_LABELS: Record<string, string> = {
    "1h": "1 Hour",
    "6h": "6 Hours",
    "12h": "12 Hours",
    "24h": "24 Hours",
    "1d": "1 Day",
    "3d": "3 Days",
    "7d": "7 Days",
    "14d": "2 Weeks",
    "30d": "30 Days",
    "1m": "1 Month",
    "3m": "3 Months",
    "6m": "6 Months",
    "1y": "1 Year",
    never: "Never",
};

const PERIOD_DURATIONS: Record<string, number> = {
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
};

export function parseDuration(duration: string): number {
    return DURATION_MAP[duration] ?? 0;
}

export function getDurationLabel(duration: string): string {
    return DURATION_LABELS[duration] ?? duration;
}

export class PolicyEngine {
    private config: PolicyConfig;

    constructor() {
        // Validate and parse the config at startup
        this.config = PolicyConfigSchema.parse(policiesConfig);
    }

    /**
     * Resolves the most permissive policy for a user based on their groups.
     * Priority: Higher limits and more permissions win.
     */
    getUserPolicy(groups: string[]): ResolvedPolicy {
        const matchingPolicies = this.config.policies.filter((p) =>
            groups.includes(p.group)
        );

        if (matchingPolicies.length === 0) {
            return {
                quota: this.config.default.quota,
                invite: this.config.default.invite,
                sourceGroup: null,
            };
        }

        // Find the most permissive policy
        let bestPolicy = matchingPolicies[0];
        let bestScore = this.calculatePermissivenessScore(matchingPolicies[0].quota);

        for (const policy of matchingPolicies.slice(1)) {
            const score = this.calculatePermissivenessScore(policy.quota);
            if (score > bestScore) {
                bestScore = score;
                bestPolicy = policy;
            }
        }

        // Merge invite settings (most permissive wins for each setting)
        // Merge allowed_groups from all matching policies (union of all groups)
        const allGroups = new Set<string>();
        for (const policy of matchingPolicies) {
            for (const group of policy.invite.allowed_groups ?? []) {
                allGroups.add(group);
            }
        }

        const mergedInvite: InviteConfig = {
            max_expiry: this.getMostPermissiveExpiry(matchingPolicies.map((p) => p.invite.max_expiry)),
            allow_multi_use: matchingPolicies.some((p) => p.invite.allow_multi_use),
            allowed_groups: allGroups.size > 0 ? Array.from(allGroups) : this.config.default.invite.allowed_groups,
        };

        return {
            quota: bestPolicy.quota,
            invite: mergedInvite,
            sourceGroup: bestPolicy.group,
        };
    }

    private calculatePermissivenessScore(quota: QuotaConfig): number {
        if (quota.strategy === "unlimited") {
            return Infinity;
        }
        if (quota.strategy === "recurring") {
            // Recurring is more permissive than fixed for same limit
            return (quota.limit ?? 0) * 1000;
        }
        return quota.limit ?? 0;
    }

    private getMostPermissiveExpiry(expiries: string[]): string {
        let maxDuration = 0;
        let maxExpiry = expiries[0];

        for (const expiry of expiries) {
            const duration = parseDuration(expiry);
            if (duration > maxDuration) {
                maxDuration = duration;
                maxExpiry = expiry;
            }
        }

        return maxExpiry;
    }

    /**
     * Calculates the current quota status for a user.
     */
    async calculateQuotaStatus(
        userSub: string,
        policy: ResolvedPolicy
    ): Promise<QuotaStatus> {
        const { quota } = policy;

        if (quota.strategy === "unlimited") {
            const used = await this.countUserInvites(userSub);
            return {
                used,
                limit: null,
                strategy: "unlimited",
                remaining: null,
                isUnlimited: true,
            };
        }

        let used: number;

        if (quota.strategy === "recurring" && quota.period) {
            // Count invites within the current period
            const periodStart = this.getPeriodStart(quota.period);
            used = await this.countUserInvites(userSub, periodStart);
        } else {
            // Fixed: count all invites ever
            used = await this.countUserInvites(userSub);
        }

        const limit = quota.limit ?? 0;
        const remaining = Math.max(0, limit - used);

        return {
            used,
            limit,
            strategy: quota.strategy,
            period: quota.period,
            remaining,
            isUnlimited: false,
        };
    }

    private getPeriodStart(period: string): Date {
        const now = new Date();
        const duration = PERIOD_DURATIONS[period] ?? 0;
        return new Date(now.getTime() - duration);
    }

    private async countUserInvites(userSub: string, since?: Date): Promise<number> {
        const where: { user_sub: string; createdAt?: { gte: Date } } = {
            user_sub: userSub,
        };

        if (since) {
            where.createdAt = { gte: since };
        }

        return prisma.userQuotaLog.count({ where });
    }

    /**
     * Returns available expiry options based on the policy's max_expiry.
     */
    getExpiryOptions(policy: ResolvedPolicy): Array<{ value: string; label: string }> {
        const maxDuration = parseDuration(policy.invite.max_expiry);
        const options: Array<{ value: string; label: string }> = [];

        const orderedDurations = [
            "24h",
            "3d",
            "7d",
            "14d",
            "never",
        ];

        for (const duration of orderedDurations) {
            const ms = parseDuration(duration);
            if (ms <= maxDuration) {
                options.push({
                    value: duration,
                    label: getDurationLabel(duration),
                });
            }
        }

        return options;
    }

    /**
     * Validates if the requested expiry is allowed by the policy.
     */
    isExpiryAllowed(policy: ResolvedPolicy, requestedExpiry: string): boolean {
        const maxDuration = parseDuration(policy.invite.max_expiry);
        const requestedDuration = parseDuration(requestedExpiry);
        return requestedDuration <= maxDuration;
    }

    /**
     * Validates if the requested group is allowed by the policy.
     */
    isGroupAllowed(policy: ResolvedPolicy, requestedGroup: string): boolean {
        const allowedGroups = policy.invite.allowed_groups ?? [];
        return allowedGroups.length === 0 || allowedGroups.includes(requestedGroup);
    }

    /**
     * Logs an invite creation to the database.
     */
    async logInvite(userSub: string, inviteUuid: string, expiresAt?: Date, inviteGroup?: string): Promise<void> {
        await prisma.userQuotaLog.create({
            data: {
                user_sub: userSub,
                invite_uuid: inviteUuid,
                expiresAt,
                invite_group: inviteGroup,
                status: "ACTIVE",
            },
        });
    }

    /**
     * Gets invite history for a user.
     */
    async getInviteHistory(
        userSub: string,
        limit: number = 50
    ): Promise<Array<{ id: string; invite_uuid: string; createdAt: Date; expiresAt: Date | null; status: string, invite_group: string | null }>> {
        const logs = await prisma.userQuotaLog.findMany({
            where: { user_sub: userSub },
            orderBy: { createdAt: "desc" },
            take: limit,
        });
        return logs;
    }

    /**
     * Admin: Reset a user's quota (delete their invite logs).
     */
    async resetUserQuota(userSub: string): Promise<number> {
        const result = await prisma.userQuotaLog.deleteMany({
            where: { user_sub: userSub },
        });
        return result.count;
    }

    /**
     * Updates an invite status to EXHAUSTED.
     */
    async markInviteExhausted(id: string): Promise<void> {
        await prisma.userQuotaLog.update({
            where: { id },
            data: { status: "EXHAUSTED" },
        });
    }

    /**
     * Admin: Get global statistics.
     */
    async getGlobalStats(): Promise<{
        totalInvites: number;
        uniqueUsers: number;
        invitesToday: number;
        invitesThisMonth: number;
    }> {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [totalInvites, uniqueUsersResult, invitesToday, invitesThisMonth] =
            await Promise.all([
                prisma.userQuotaLog.count(),
                prisma.userQuotaLog.groupBy({
                    by: ["user_sub"],
                }),
                prisma.userQuotaLog.count({
                    where: { createdAt: { gte: startOfDay } },
                }),
                prisma.userQuotaLog.count({
                    where: { createdAt: { gte: startOfMonth } },
                }),
            ]);

        return {
            totalInvites,
            uniqueUsers: uniqueUsersResult.length,
            invitesToday,
            invitesThisMonth,
        };
    }
}

// Singleton instance
export const policyEngine = new PolicyEngine();
