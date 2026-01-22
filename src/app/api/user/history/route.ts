import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { policyEngine } from "@/lib/policy-engine";

import { getAuthentikAPI } from "@/lib/authentik-api";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userSub = session.user.id;
        const authentikApi = getAuthentikAPI();

        // Fetch all flows to map PK -> Slug for accurate URL generation
        const flows = await authentikApi.getFlows();
        const flowMap = new Map<string, string>();
        flows.forEach(f => flowMap.set(f.pk, f.slug));

        // Get invite history
        const history = await policyEngine.getInviteHistory(userSub, 50);

        // Sync ACTIVE invites with Authentik
        const syncedHistory = await Promise.all(history.map(async (item) => {
            // Default to ACTIVE if status is undefined (migration) or "ACTIVE"
            let currentStatus = item.status || "ACTIVE";
            let flowSlug = "default-enrollment-flow"; // Default fallback

            if (currentStatus === 'ACTIVE') {
                // Check if it exists in Authentik
                const remoteInvite = await authentikApi.getInvitation(item.invite_uuid);

                // If getInvitation returns null, it's deleted/expired/used
                if (!remoteInvite) {
                    await policyEngine.markInviteExhausted(item.id);
                    currentStatus = 'EXHAUSTED';
                } else {
                    // Resolve the correct flow slug using the Flow PK from the invite
                    if (remoteInvite.flow && flowMap.has(remoteInvite.flow)) {
                        flowSlug = flowMap.get(remoteInvite.flow)!;
                    }
                }
            }
            // Note: For EXHAUSTED invites, we can't resolve the flow as the invite is gone.
            // Using default-enrollment-flow is the best fallback.

            return { ...item, status: currentStatus, flowSlug };
        }));

        // Format for response
        const baseUrl = process.env.AUTHENTIK_API_URL?.replace(/\/$/, "") ?? "";

        const formattedHistory = syncedHistory.map((item) => ({
            id: item.id,
            invite_uuid: item.invite_uuid,
            invite_url: `${baseUrl}/if/flow/${item.flowSlug}/?itoken=${item.invite_uuid}`,
            createdAt: item.createdAt.toISOString(),
            expiresAt: item.expiresAt?.toISOString() ?? null,
            status: item.status,
            invite_group: item.invite_group ?? null,
        }));

        return NextResponse.json({ history: formattedHistory });
    } catch (error) {
        console.error("Error fetching history:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
