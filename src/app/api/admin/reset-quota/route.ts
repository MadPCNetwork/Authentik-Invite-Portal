import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { policyEngine } from "@/lib/policy-engine";
import { z } from "zod";

const ADMIN_GROUP = process.env.ADMIN_GROUP_NAME ?? "Invite Portal Admins";

const ResetQuotaSchema = z.object({
    userSub: z.string().min(1, "User subject ID is required"),
});

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userGroups = session.user.groups ?? [];
        if (!userGroups.includes(ADMIN_GROUP)) {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        // Parse request body
        const body = await req.json();
        const validation = ResetQuotaSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.errors.map((e) => e.message).join(", ") },
                { status: 400 }
            );
        }

        const { userSub } = validation.data;

        // Reset the user's quota
        const deletedCount = await policyEngine.resetUserQuota(userSub);

        return NextResponse.json({
            success: true,
            message: `Reset quota for user. Deleted ${deletedCount} invite logs.`,
            deletedCount,
        });
    } catch (error) {
        console.error("Error resetting quota:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
