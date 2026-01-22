"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { AdminStats } from "@/components/AdminStats";
import { QuotaResetForm } from "@/components/QuotaResetForm";

interface StatsData {
    totalInvites: number;
    uniqueUsers: number;
    invitesToday: number;
    invitesThisMonth: number;
}

export default function AdminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [stats, setStats] = useState<StatsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const adminGroup = session?.adminGroup ?? "Invite Portal Admins";
    const isAdmin = session?.user?.groups?.includes(adminGroup);

    const fetchStats = useCallback(async () => {
        try {
            const response = await fetch("/api/admin/stats");
            if (response.ok) {
                const data = await response.json();
                setStats(data.stats);
            }
        } catch (error) {
            console.error("Failed to fetch stats:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (status === "authenticated" && !isAdmin) {
            router.push("/dashboard");
            return;
        }
        if (status === "authenticated" && isAdmin) {
            fetchStats();
        }
    }, [status, isAdmin, router, fetchStats]);

    if (status === "loading" || (status === "authenticated" && !isAdmin)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse-soft">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-surface-900 dark:text-white">
                            Admin Panel
                        </h1>
                        <span className="badge-warning">Admin Only</span>
                    </div>
                    <p className="text-surface-500 dark:text-surface-400">
                        View usage statistics and manage user quotas
                    </p>
                </div>

                {/* Stats */}
                <div className="mb-8">
                    <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">
                        Global Statistics
                    </h2>
                    <AdminStats stats={stats} isLoading={isLoading} />
                </div>

                {/* Quota Management */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <QuotaResetForm onReset={fetchStats} />

                    {/* Info Card */}
                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">
                            Admin Information
                        </h3>
                        <div className="space-y-4 text-sm text-surface-600 dark:text-surface-400">
                            <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                                <p className="font-medium text-surface-900 dark:text-white mb-1">
                                    Quota Reset
                                </p>
                                <p>
                                    Resetting a user&apos;s quota will delete all their invite logs from the
                                    database. This restores their invite count to zero, allowing them to
                                    create invites up to their policy limit.
                                </p>
                            </div>
                            <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                                <p className="font-medium text-surface-900 dark:text-white mb-1">
                                    Finding User IDs
                                </p>
                                <p>
                                    User subject IDs can be found in the Authentik admin panel under
                                    Directory → Users, or by decoding a user&apos;s JWT token.
                                </p>
                            </div>
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                <p className="font-medium text-amber-800 dark:text-amber-300 mb-1">
                                    Caution
                                </p>
                                <p className="text-amber-700 dark:text-amber-400">
                                    All admin actions are logged. Quota resets should only be performed
                                    when necessary and in accordance with your organization&apos;s policies.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
