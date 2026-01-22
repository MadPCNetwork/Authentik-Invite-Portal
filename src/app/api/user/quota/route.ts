import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { policyEngine } from "@/lib/policy-engine";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userSub = session.user.id;
        const userGroups = session.user.groups ?? [];

        // Get user's policy
        const policy = policyEngine.getUserPolicy(userGroups);

        // Calculate quota status
        const quotaStatus = await policyEngine.calculateQuotaStatus(userSub, policy);

        // Get expiry options
        const expiryOptions = policyEngine.getExpiryOptions(policy);

        return NextResponse.json({
            quota: quotaStatus,
            expiryOptions,
            allowMultiUse: policy.invite.allow_multi_use,
            sourceGroup: policy.sourceGroup,
        });
    } catch (error) {
        console.error("Error fetching quota:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
