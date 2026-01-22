import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { policyEngine } from "@/lib/policy-engine";

export async function GET() {
    try {
        // 1. Verify session
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const userGroups = session.user.groups ?? [];

        // 2. Get user's policy
        const policy = policyEngine.getUserPolicy(userGroups);

        // 3. Get allowed groups from policy
        const allowedGroups = policy.invite.allowed_groups ?? [];

        // Return simpler structure for frontend
        return NextResponse.json({
            groups: allowedGroups,
            required: policy.invite.require_group_selection ?? false
        });
    } catch (error) {
        console.error("Error fetching allowed groups:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
