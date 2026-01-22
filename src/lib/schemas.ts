import { z } from "zod";

// Policy configuration schemas
export const QuotaStrategySchema = z.enum(["fixed", "recurring", "unlimited"]);

export const QuotaConfigSchema = z.object({
    strategy: QuotaStrategySchema,
    limit: z.number().optional(),
    period: z.enum(["day", "week", "month", "year"]).optional(),
});

export const GroupingSchema = z.object({
    name: z.string(),
    groups: z.array(z.string()),
});

export const InviteConfigSchema = z.object({
    max_expiry: z.string(),
    allow_multi_use: z.boolean(),
    allowed_groups: z.array(GroupingSchema).optional(),
});

export const PolicySchema = z.object({
    group: z.string(),
    quota: QuotaConfigSchema,
    invite: InviteConfigSchema,
});

export const PolicyConfigSchema = z.object({
    policies: z.array(PolicySchema),
    default: z.object({
        quota: QuotaConfigSchema,
        invite: InviteConfigSchema,
    }),
});

// API request/response schemas
export const GenerateInviteRequestSchema = z.object({
    name: z.string().min(1, "Invite name is required").max(100),
    expiry: z.string().min(1, "Expiry is required"),
    singleUse: z.boolean().default(true),
    // Changed: group -> groups (array of strings)
    groups: z.array(z.string()).optional(),
    emailRecipient: z.string().email().optional(),
    emailMessage: z.string().optional(),
});

export const GenerateInviteResponseSchema = z.object({
    success: z.boolean(),
    inviteUrl: z.string().optional(),
    inviteId: z.string().optional(),
    error: z.string().optional(),
});

export const QuotaStatusSchema = z.object({
    used: z.number(),
    limit: z.number().nullable(),
    strategy: QuotaStrategySchema,
    period: z.string().optional(),
    remaining: z.number().nullable(),
    isUnlimited: z.boolean(),
});

export const InviteHistoryItemSchema = z.object({
    id: z.string(),
    invite_uuid: z.string(),
    invite_url: z.string(),
    createdAt: z.string(),
    expiresAt: z.string().nullable().optional(),
    status: z.string().optional(),
    invite_group: z.string().nullable().optional(),
});

// Flow option for UI
export const FlowOptionSchema = z.object({
    slug: z.string(),
    name: z.string(),
});

// Type exports
export type QuotaStrategy = z.infer<typeof QuotaStrategySchema>;
export type QuotaConfig = z.infer<typeof QuotaConfigSchema>;
export type InviteConfig = z.infer<typeof InviteConfigSchema>;
export type Policy = z.infer<typeof PolicySchema>;
export type PolicyConfig = z.infer<typeof PolicyConfigSchema>;
export type GenerateInviteRequest = z.infer<typeof GenerateInviteRequestSchema>;
export type GenerateInviteResponse = z.infer<typeof GenerateInviteResponseSchema>;
export type QuotaStatus = z.infer<typeof QuotaStatusSchema>;
export type InviteHistoryItem = z.infer<typeof InviteHistoryItemSchema>;
export type FlowOption = z.infer<typeof FlowOptionSchema>;

// Resolved policy (after multi-group resolution)
export interface ResolvedPolicy {
    quota: QuotaConfig;
    invite: InviteConfig;
    sourceGroup: string | null;
}
