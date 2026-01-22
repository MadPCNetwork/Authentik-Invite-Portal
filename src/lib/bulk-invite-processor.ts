
import { prisma } from "@/lib/db";
import { getAuthentikAPI } from "@/lib/authentik-api";
import { emailService } from "@/lib/email";
import { policyEngine } from "@/lib/policy-engine";

const AUTHENTIK_FLOW_SLUG = process.env.AUTHENTIK_FLOW_SLUG || "default-enrollment-flow";

export async function processBulkInviteJob(
    jobId: string,
    payload: {
        emailList: string[];
        message: string;
        expiry: string;
        singleUse: boolean;
        inviteGroups: string[];
        userSub: string;
        username: string;
        name?: string | null;
        userGroups?: string[];
    }
) {
    console.log(`[Job ${jobId}] Starting processing...`);

    try {
        await prisma.bulkInviteJob.update({
            where: { id: jobId },
            data: { status: "PROCESSING", total: payload.emailList.length }
        });

        const { emailList, message, expiry, singleUse, inviteGroups, userSub, username, name, userGroups } = payload;

        // --- Re-initialize context if needed or just use passed data ---
        // Note: We are running in background, so we don't have request context.
        // We rely on payload data.

        const policy = policyEngine.getUserPolicy(userGroups || []);
        const expandedGroups = policyEngine.expandGroups(policy, inviteGroups);
        const loggedGroups = inviteGroups.length > 0 ? inviteGroups.join(", ") : undefined;

        const api = getAuthentikAPI();
        const flow = await api.getFlow(AUTHENTIK_FLOW_SLUG);

        if (!flow) {
            throw new Error(`Flow configuration error: Could not find flow '${AUTHENTIK_FLOW_SLUG}'`);
        }

        let processed = 0;
        let failed = 0;
        const errors: string[] = [];

        // Helper to update progress periodically (every 5 items or so)
        const updateProgress = async () => {
            await prisma.bulkInviteJob.update({
                where: { id: jobId },
                data: { processed, failed }
            });
        };

        if (singleUse) {
            for (let i = 0; i < emailList.length; i++) {
                const email = emailList[i];
                try {
                    const inviteRes = await api.createInvitation({
                        name: `Invite for ${email}`,
                        expiry,
                        singleUse: true,
                        flowSlug: AUTHENTIK_FLOW_SLUG,
                        flowPk: flow.pk,
                        creatorUsername: username,
                        fixedData: expandedGroups.length > 0 ? { invite_groups: expandedGroups } : undefined,
                    });

                    if (inviteRes.success && inviteRes.invitation) {
                        let expiresAt: Date | undefined;
                        if (inviteRes.invitation.expires) {
                            expiresAt = new Date(inviteRes.invitation.expires);
                        }
                        await policyEngine.logInvite(userSub, inviteRes.invitation.pk, expiresAt, loggedGroups);

                        // Send Email
                        if (emailService.isConfigured()) {
                            const variableMap = {
                                inviter_username: name || username || "A user",
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
                    } else {
                        throw new Error(inviteRes.error || "Unknown creation error");
                    }
                } catch (e: any) {
                    console.error(`[Job ${jobId}] Error for ${email}:`, e);
                    failed++;
                    errors.push(`${email}: ${e.message}`);
                } finally {
                    processed++;
                    if (processed % 5 === 0) await updateProgress();
                }
            }
        } else {
            // Multi-use logic
            try {
                const inviteRes = await api.createInvitation({
                    name: `Bulk Invite (${emailList.length} recipients)`,
                    expiry,
                    singleUse: false,
                    flowSlug: AUTHENTIK_FLOW_SLUG,
                    flowPk: flow.pk,
                    creatorUsername: username,
                    fixedData: expandedGroups.length > 0 ? { invite_groups: expandedGroups } : undefined,
                });

                if (inviteRes.success && inviteRes.invitation) {
                    let expiresAt: Date | undefined;
                    if (inviteRes.invitation.expires) {
                        expiresAt = new Date(inviteRes.invitation.expires);
                    }
                    await policyEngine.logInvite(userSub, inviteRes.invitation.pk, expiresAt, loggedGroups);

                    if (emailService.isConfigured()) {
                        const variableMap = {
                            inviter_username: name || username || "A user",
                            expiration_date: expiresAt ? expiresAt.toLocaleString() : "Never",
                            invite_url: inviteRes.inviteUrl || "",
                        };
                        const finalBody = emailService.processTemplate(message, variableMap);

                        for (const email of emailList) {
                            try {
                                await emailService.sendEmail({
                                    to: email,
                                    subject: `Invitation to join ${process.env.APP_NAME || "Authentik"}`,
                                    text: finalBody
                                });
                            } catch (e: any) {
                                console.error(`[Job ${jobId}] Email failed for ${email}`, e);
                                failed++; // valid invite, but email failed
                                errors.push(`${email} (Delivery): ${e.message}`);
                            } finally {
                                processed++;
                                if (processed % 5 === 0) await updateProgress();
                            }
                        }
                    } else {
                        processed = emailList.length;
                    }
                } else {
                    throw new Error(inviteRes.error || "Failed to create multi-use invite");
                }
            } catch (e: any) {
                failed = emailList.length;
                errors.push(`Multi-use creation failed: ${e.message}`);
            }
        }

        await prisma.bulkInviteJob.update({
            where: { id: jobId },
            data: {
                status: errors.length === emailList.length ? "FAILED" : "COMPLETED",
                processed: emailList.length, // Ensure it says 100% at end
                failed,
                result: JSON.stringify({ errors })
            }
        });
        console.log(`[Job ${jobId}] Finished.`);

    } catch (err: any) {
        console.error(`[Job ${jobId}] System Error:`, err);
        await prisma.bulkInviteJob.update({
            where: { id: jobId },
            data: {
                status: "FAILED",
                result: JSON.stringify({ error: err.message })
            }
        });
    }
}
