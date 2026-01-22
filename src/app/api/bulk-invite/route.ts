import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { policyEngine } from "@/lib/policy-engine";
import { prisma } from "@/lib/db";
import { processBulkInviteJob } from "@/lib/bulk-invite-processor"; // Import our new processor
import { z } from "zod";

const BulkInviteRequestSchema = z.object({
    emails: z.string(),
    message: z.string(),
    expiry: z.string(),
    singleUse: z.boolean(),
    groups: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const validation = BulkInviteRequestSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: "Invalid request data" },
                { status: 400 }
            );
        }

        const { emails, message, expiry, singleUse, groups: inviteGroups = [] } = validation.data;

        // Parse emails
        const emailList = emails
            .split(/[\n,]/)
            .map(e => e.trim())
            .filter(e => e.length > 0 && e.includes('@')); // distinct valid emails

        if (emailList.length === 0) {
            return NextResponse.json({ success: false, error: "No valid emails provided" }, { status: 400 });
        }

        // Check Quota / Permissions
        const userSub = session.user.id;
        const groupNames = session.user.groups || [];
        const policy = policyEngine.getUserPolicy(groupNames);
        const quotaStatus = await policyEngine.calculateQuotaStatus(userSub, policy);

        // For now, strict rule: Bulk invites only for unlimited users OR if they have enough remaining
        if (!quotaStatus.isUnlimited) {
            const remaining = quotaStatus.remaining ?? 0;
            const required = singleUse ? emailList.length : 1;

            if (remaining < required) {
                return NextResponse.json(
                    { success: false, error: `Insufficient quota. You need ${required} invites but have ${remaining} left.` },
                    { status: 403 }
                );
            }
        }

        // Validate Groups
        if (policy.invite.require_group_selection && inviteGroups.length === 0) {
            return NextResponse.json(
                { success: false, error: "Group selection is required" },
                { status: 400 }
            );
        }

        if (inviteGroups.length > 0 && !policyEngine.isGroupAllowed(policy, inviteGroups)) {
            return NextResponse.json(
                { success: false, error: "One or more selected groups are not allowed" },
                { status: 403 }
            );
        }

        // --- NEW: Create Background Job ---
        const job = await prisma.bulkInviteJob.create({
            data: {
                status: "PENDING",
                total: emailList.length,
                creatorSub: userSub,
            }
        });

        // Start processing in background (do not await)
        processBulkInviteJob(job.id, {
            emailList,
            message,
            expiry,
            singleUse,
            inviteGroups,
            userSub,
            username: session.user.username || "unknown",
            name: session.user.name,
            userGroups: groupNames
        });

        return NextResponse.json({ success: true, jobId: job.id });

    } catch (error) {
        console.error("Bulk invite init error:", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
