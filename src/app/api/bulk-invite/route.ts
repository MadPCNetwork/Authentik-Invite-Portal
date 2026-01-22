import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { policyEngine } from "@/lib/policy-engine";
import { getAuthentikAPI } from "@/lib/authentik-api";
import { emailService } from "@/lib/email";
import { z } from "zod";

const BulkInviteRequestSchema = z.object({
    emails: z.string(),
    message: z.string(),
    expiry: z.string(),
    singleUse: z.boolean(),
    group: z.string().optional(),
});

const AUTHENTIK_FLOW_SLUG = process.env.AUTHENTIK_FLOW_SLUG || "default-enrollment-flow";

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

        const { emails, message, expiry, singleUse, group: inviteGroup } = validation.data;

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
            const required = singleUse ? emailList.length : 1; // Multi-use consumes 1 quota

            if (remaining < required) {
                return NextResponse.json(
                    { success: false, error: `Insufficient quota. You need ${required} invites but have ${remaining} left.` },
                    { status: 403 }
                );
            }
        }

        const api = getAuthentikAPI();
        const flow = await api.getFlow(AUTHENTIK_FLOW_SLUG);

        if (!flow) {
            return NextResponse.json({ success: false, error: "Flow configuration error" }, { status: 500 });
        }

        const results = {
            successful: 0,
            failed: 0,
            errors: [] as string[]
        };

        if (singleUse) {
            // Generate unique invite for each email
            for (const email of emailList) {
                try {
                    // Create Invite
                    const inviteRes = await api.createInvitation({
                        name: `Invite for ${email}`,
                        expiry,
                        singleUse: true,
                        flowSlug: AUTHENTIK_FLOW_SLUG,
                        flowPk: flow.pk,
                        creatorUsername: session.user.username,
                        fixedData: inviteGroup ? { invite_group: inviteGroup } : undefined,
                    });

                    if (inviteRes.success && inviteRes.invitation) {
                        // Log quota
                        let expiresAt: Date | undefined;
                        if (inviteRes.invitation.expires) {
                            expiresAt = new Date(inviteRes.invitation.expires);
                        }
                        await policyEngine.logInvite(userSub, inviteRes.invitation.pk, expiresAt, inviteGroup);

                        // Send Email
                        if (emailService.isConfigured()) {
                            const variableMap = {
                                inviter_username: session.user.name || session.user.username || "A user",
                                expiration_date: expiresAt ? expiresAt.toLocaleString() : "Never",
                                invite_url: inviteRes.inviteUrl || "",
                            };
                            const finalBody = emailService.processTemplate(message, variableMap);

                            await emailService.sendEmail({
                                to: email,
                                subject: `Invitation to join ${process.env.APP_NAME || "Authentik"}`,
                                text: finalBody
                            });
                        }
                        results.successful++;
                    } else {
                        results.failed++;
                        results.errors.push(`Failed to create invite for ${email}: ${inviteRes.error}`);
                    }
                } catch (e) {
                    console.error(`Error processing ${email}`, e);
                    results.failed++;
                    results.errors.push(`Error for ${email}`);
                }
            }
        } else {
            // Multi-use: Generate ONE invite, send to ALL
            try {
                const inviteRes = await api.createInvitation({
                    name: `Bulk Invite (${emailList.length} recipients)`,
                    expiry,
                    singleUse: false,
                    flowSlug: AUTHENTIK_FLOW_SLUG,
                    flowPk: flow.pk,
                    creatorUsername: session.user.username,
                    fixedData: inviteGroup ? { invite_group: inviteGroup } : undefined
                });

                if (inviteRes.success && inviteRes.invitation) {
                    // Log quota (counts as 1)
                    let expiresAt: Date | undefined;
                    if (inviteRes.invitation.expires) {
                        expiresAt = new Date(inviteRes.invitation.expires);
                    }
                    await policyEngine.logInvite(userSub, inviteRes.invitation.pk, expiresAt, inviteGroup);

                    // Send Emails in Loop
                    if (emailService.isConfigured()) {
                        const variableMap = {
                            inviter_username: session.user.name || session.user.username || "A user",
                            expiration_date: expiresAt ? expiresAt.toLocaleString() : "Never",
                            invite_url: inviteRes.inviteUrl || "",
                        };
                        const finalBody = emailService.processTemplate(message, variableMap);

                        // Parallel send for speed? Or sequential to avoid rate limits?
                        // Simple sequential for safety
                        for (const email of emailList) {
                            try {
                                await emailService.sendEmail({
                                    to: email,
                                    subject: `Invitation to join ${process.env.APP_NAME || "Authentik"}`,
                                    text: finalBody
                                });
                                results.successful++;
                            } catch (e) {
                                console.error(`Failed to send email to ${email}`, e);
                                results.failed++; // counts as failed delivery, though invite exists
                            }
                        }
                    } else {
                        // No email service? Then just considered "successful" generation but didn't send.
                        results.successful = emailList.length;
                    }

                } else {
                    results.failed = emailList.length;
                    results.errors.push("Failed to generate multi-use invite");
                }

            } catch (e) {
                console.error("Error creating multi-use invite", e);
                return NextResponse.json({ success: false, error: "Internal Error" }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error) {
        console.error("Bulk invite error:", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
