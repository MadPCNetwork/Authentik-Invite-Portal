"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { QuotaDisplay } from "@/components/QuotaDisplay";
import { CreateInviteForm } from "@/components/CreateInviteForm";
import { InviteHistory } from "@/components/InviteHistory";
import { QuotaStatus, InviteHistoryItem } from "@/lib/schemas";

interface QuotaData {
    quota: QuotaStatus;
    expiryOptions: Array<{ value: string; label: string }>;
    allowMultiUse: boolean;
    sourceGroup: string | null;
}

export default function DashboardPage() {
    const { data: session } = useSession();
    const [quotaData, setQuotaData] = useState<QuotaData | null>(null);
    const [history, setHistory] = useState<InviteHistoryItem[]>([]);
    const [isLoadingQuota, setIsLoadingQuota] = useState(true);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    const fetchQuota = useCallback(async () => {
        try {
            const response = await fetch("/api/user/quota");
            if (response.ok) {
                const data = await response.json();
                setQuotaData(data);
            }
        } catch (error) {
            console.error("Failed to fetch quota:", error);
        } finally {
            setIsLoadingQuota(false);
        }
    }, []);

    const fetchHistory = useCallback(async () => {
        try {
            const response = await fetch("/api/user/history");
            if (response.ok) {
                const data = await response.json();
                setHistory(data.history);
            }
        } catch (error) {
            console.error("Failed to fetch history:", error);
        } finally {
            setIsLoadingHistory(false);
        }
    }, []);

    useEffect(() => {
        fetchQuota();
        fetchHistory();
    }, [fetchQuota, fetchHistory]);

    const handleInviteCreated = () => {
        // Refresh both quota and history
        fetchQuota();
        fetchHistory();
    };

    return (
        <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-surface-900 dark:text-white mb-2">
                        Welcome back, {session?.user?.name?.split(" ")[0] ?? "User"}
                    </h1>
                    <p className="text-surface-500 dark:text-surface-400">
                        Generate and manage your invitation links
                    </p>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Quota & Form */}
                    <div className="lg:col-span-1 space-y-6">
                        <QuotaDisplay
                            quota={quotaData?.quota ?? null}
                            isLoading={isLoadingQuota}
                            sourceGroup={quotaData?.sourceGroup}
                        />

                        <CreateInviteForm
                            quota={quotaData?.quota ?? null}
                            expiryOptions={quotaData?.expiryOptions ?? []}
                            allowMultiUse={quotaData?.allowMultiUse ?? false}
                            onInviteCreated={handleInviteCreated}
                        />
                    </div>

                    <div className="lg:col-span-2">
                        <InviteHistory
                            history={history}
                            isLoading={isLoadingHistory}
                            onDelete={async (id) => {
                                try {
                                    const response = await fetch(`/api/user/invite/${id}`, {
                                        method: 'DELETE',
                                    });
                                    if (response.ok) {
                                        fetchHistory(); // Refresh list
                                        fetchQuota();   // Refresh quota (if applicable)
                                    } else {
                                        console.error('Failed to delete invite');
                                        alert('Failed to delete invite');
                                    }
                                } catch (error) {
                                    console.error('Error deleting invite:', error);
                                    alert('Error deleting invite');
                                }
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
