"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { QuotaDisplay } from "@/components/QuotaDisplay";
import { BulkInviteForm } from "@/components/BulkInviteForm";
import { QuotaStatus } from "@/lib/schemas";
import { useRouter } from "next/navigation";

interface QuotaData {
    quota: QuotaStatus;
    expiryOptions: Array<{ value: string; label: string }>;
    allowMultiUse: boolean;
    sourceGroup: string | null;
    groups: any[]; // Or proper type {name: string, groups: string[]}[]
    requireGroupSelection: boolean;
}

export default function BulkPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [quotaData, setQuotaData] = useState<QuotaData | null>(null);
    const [isLoadingQuota, setIsLoadingQuota] = useState(true);

    const fetchQuota = useCallback(async () => {
        try {
            // Need both quota and groups for the form
            const [quotaRes, groupsRes] = await Promise.all([
                fetch("/api/user/quota"),
                fetch("/api/user/groups")
            ]);

            if (quotaRes.ok && groupsRes.ok) {
                const qData = await quotaRes.json();
                const gData = await groupsRes.json();

                setQuotaData({
                    ...qData,
                    groups: gData.groups || [],
                    requireGroupSelection: !!gData.required
                });
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setIsLoadingQuota(false);
        }
    }, []);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/");
        } else if (status === "authenticated") {
            fetchQuota();
        }
    }, [status, fetchQuota, router]);

    const handleBulkInvite = async (data: any) => {
        const response = await fetch("/api/bulk-invite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Failed to process bulk invites");
        }

        // Refresh quota
        fetchQuota();

        // If there were failed items, maybe show them? 
        // For now, the form handles the success/error summary display implicitly via its own local state or toast
        if (result.results && result.results.failed > 0) {
            throw new Error(`Completed with errors: ${result.results.successful} successful, ${result.results.failed} failed.`);
        }
    };

    if (status === "loading" || isLoadingQuota) {
        return <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center">Loading...</div>;
    }

    // Optional: Redirect if not unlimited?
    // if (quotaData && !quotaData.quota.isUnlimited) {
    //    return <div>Access Denied</div>;
    // }

    return (
        <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-surface-900 dark:text-white mb-2">
                        Bulk Invite System
                    </h1>
                    <p className="text-surface-500 dark:text-surface-400">
                        Send invitations to multiple recipients at once
                    </p>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Quota & Info */}
                    <div className="lg:col-span-1 space-y-6">
                        <QuotaDisplay
                            quota={quotaData?.quota ?? null}
                            isLoading={isLoadingQuota}
                            sourceGroup={quotaData?.sourceGroup}
                        />

                        <div className="card p-6">
                            <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">
                                Instructions
                            </h3>
                            <ul className="space-y-2 text-sm text-surface-600 dark:text-surface-400 list-disc list-inside">
                                <li>Enter one email address per line.</li>
                                <li>Select <strong>Single Use</strong> to generate unique links for everyone.</li>
                                <li>Select <strong>Multi Use</strong> to send the same link to everyone (counts as 1 quota).</li>
                                <li>Emails are sent automatically.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Right Column - Form */}
                    <div className="lg:col-span-2">
                        <BulkInviteForm
                            quota={quotaData?.quota ?? null}
                            expiryOptions={quotaData?.expiryOptions ?? []}
                            groups={quotaData?.groups ?? []}
                            onBulkInvite={handleBulkInvite}
                            requireGroupSelection={quotaData?.requireGroupSelection ?? false}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
