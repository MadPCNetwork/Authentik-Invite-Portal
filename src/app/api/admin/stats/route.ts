import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { policyEngine } from "@/lib/policy-engine";

const ADMIN_GROUP = process.env.ADMIN_GROUP_NAME ?? "Invite Portal Admins";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userGroups = session.user.groups ?? [];
        if (!userGroups.includes(ADMIN_GROUP)) {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        // Get global statistics
        const stats = await policyEngine.getGlobalStats();

        return NextResponse.json({ stats });
    } catch (error) {
        console.error("Error fetching admin stats:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
