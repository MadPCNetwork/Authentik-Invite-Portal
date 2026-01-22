import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthentikAPI } from "@/lib/authentik-api";

export async function GET(req: NextRequest) {
    try {
        // 1. Verify session and admin access
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const adminGroup = process.env.ADMIN_GROUP_NAME ?? "Invite Portal Admins";
        const groups = session.user.groups ?? [];
        if (!groups.includes(adminGroup)) {
            return NextResponse.json(
                { error: "Admin access required" },
                { status: 403 }
            );
        }

        // 2. Get search query
        const searchParams = req.nextUrl.searchParams;
        const query = searchParams.get("q");

        if (!query || query.length < 2) {
            return NextResponse.json({ users: [] });
        }

        // 3. Search users
        const authentikApi = getAuthentikAPI();
        const users = await authentikApi.searchUsers(query);

        return NextResponse.json({ users });
    } catch (error) {
        console.error("Error searching users:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
