import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { policyEngine } from "@/lib/policy-engine";
import { getAuthentikAPI } from "@/lib/authentik-api";
import { GenerateInviteRequestSchema, GenerateInviteResponseSchema, Policy } from "@/lib/schemas";

const AUTHENTIK_FLOW_SLUG = process.env.AUTHENTIK_FLOW_SLUG || "default-enrollment-flow";

export async function POST(req: NextRequest) {
    try {
        // 1. Verify session
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        // 1.5. Validate user status in Authentik
        const api = getAuthentikAPI();
        const username = session.user.username;

        if (!username) {
            console.error("Session missing username:", session.user);
            return NextResponse.json(
                { success: false, error: "Invalid session: missing username" },
                { status: 401 }
            );
        }

        console.log("Verifying user status for username:", username);
        const user = await api.getUserByUsername(username);

        if (!user || user.is_active === false) {
            console.log("User verification failed:", user ? "Inactive" : "Not Found");
            return NextResponse.json(
                { success: false, error: "Account is inactive or disabled" },
                { status: 403 }
            );
        }

        // 2. Parse and validate request body
        const body = await req.json();
        const validation = GenerateInviteRequestSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: validation.error.errors.map((e) => e.message).join(", "),
                },
                { status: 400 }
            );
        }

        const { name, expiry, singleUse, group: inviteGroup } = validation.data;

        // 3. Check if user has quota
        const userSub = session.user.id; // Changed from session.user.sub to session.user.id
        const groupNames = session.user.groups || [];

        const policy = policyEngine.getUserPolicy(groupNames);
        const quotaStatus = await policyEngine.calculateQuotaStatus(userSub, policy);

        if (!quotaStatus.isUnlimited && (quotaStatus.remaining ?? 0) <= 0) {
            return NextResponse.json(
                { success: false, error: "Quota exhausted" },
                { status: 403 }
            );
        }

        // 4. Validate custom expiry and group
        if (!policyEngine.isExpiryAllowed(policy, expiry)) {
            return NextResponse.json(
                { success: false, error: "Expiry duration not allowed" },
                { status: 400 }
            );
        }

        if (inviteGroup && !policyEngine.isGroupAllowed(policy, inviteGroup)) {
            return NextResponse.json(
                { success: false, error: "Group not allowed" },
                { status: 403 }
            );
        }

        if (!singleUse && !policy.invite.allow_multi_use) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Multi-use invites are not allowed for your account",
                },
                { status: 403 }
            );
        }

        // 5. Get static flow info
        // const api = getAuthentikAPI(); // Already instantiated above

        const flow = await api.getFlow(AUTHENTIK_FLOW_SLUG);

        if (!flow) {
            return NextResponse.json(
                { success: false, error: "Configuration Error: Invalid Flow Slug" },
                { status: 500 }
            );
        }

        // 6. Create invite in Authentik
        const result = await api.createInvitation({
            name,
            expiry,
            singleUse,
            flowSlug: AUTHENTIK_FLOW_SLUG,
            flowPk: flow.pk,
            creatorUsername: session.user.username || session.user.name || undefined,
            fixedData: inviteGroup ? { invite_group: inviteGroup } : undefined,
        });

        if (!result.success || !result.invitation) {
            return NextResponse.json(
                { success: false, error: result.error ?? "Failed to create invite" },
                { status: 500 }
            );
        }

        // 7. Log to database
        // Use the expires timestamp from Authentik response for accuracy
        let expiresAt: Date | undefined;
        if (result.invitation.expires) {
            expiresAt = new Date(result.invitation.expires);
        }

        await policyEngine.logInvite(userSub, result.invitation.pk, expiresAt, inviteGroup);

        return NextResponse.json({
            success: true,
            inviteUrl: result.inviteUrl,
            inviteId: result.invitation.pk,
        });
    } catch (error) {
        console.error("Error generating invite:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Internal server error",
            },
            { status: 500 }
        );
    }
}
