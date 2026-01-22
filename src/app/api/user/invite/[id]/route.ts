import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthentikAPI } from "@/lib/authentik-api";
import { policyEngine } from "@/lib/policy-engine";

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const inviteUuid = params.id;

        // Verify ownership (optional but recommended) or at least that it belongs to the user
        // But for now, since we only store "invited_by" in Authentik fixed_data or verify via local DB if we had strict mapping.
        // The policyEngine.getInviteHistory returns items for the user. We should verify this invite belongs to the user.
        // However, the invite UUID is unique.
        // Let's first check if the invite exists in our local DB history for this user to verify ownership.

        const history = await policyEngine.getInviteHistory(session.user.id, 100);
        const ownsInvite = history.some(item => item.invite_uuid === inviteUuid);

        if (!ownsInvite) {
            return NextResponse.json({ error: "Invite not found or access denied" }, { status: 404 });
        }

        const authentikApi = getAuthentikAPI();
        const success = await authentikApi.deleteInvitation(inviteUuid);

        if (success) {
            // We should also update the local status immediately to EXHAUSTED so the interaction is consistent
            // Find the local ID from the invite UUID
            const localInvite = history.find(item => item.invite_uuid === inviteUuid);
            if (localInvite) {
                await policyEngine.markInviteDeleted(localInvite.id);
            }

            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: "Failed to delete invite in Authentik" }, { status: 500 });
        }

    } catch (error) {
        console.error("Error deleting invite:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
