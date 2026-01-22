"use client";

import { QuotaStatus } from "@/lib/schemas";

interface QuotaDisplayProps {
    quota: QuotaStatus | null;
    isLoading: boolean;
    sourceGroup?: string | null;
}

export function QuotaDisplay({ quota, isLoading, sourceGroup }: QuotaDisplayProps) {
    if (isLoading) {
        return (
            <div className="card p-6">
                <div className="skeleton h-6 w-32 mb-4 rounded-lg" />
                <div className="skeleton h-4 w-full mb-2 rounded-lg" />
                <div className="skeleton h-8 w-24 rounded-lg" />
            </div>
        );
    }

    if (!quota) {
        return (
            <div className="card p-6 text-center text-surface-500">
                Unable to load quota information
            </div>
        );
    }

    const percentage = quota.isUnlimited
        ? 100
        : quota.limit
            ? Math.min(100, ((quota.limit - (quota.remaining ?? 0)) / quota.limit) * 100)
            : 0;

    const remainingDisplay = quota.isUnlimited
        ? "∞"
        : quota.remaining ?? 0;

    const limitDisplay = quota.isUnlimited
        ? "Unlimited"
        : quota.limit ?? 0;

    const periodLabel = quota.period
        ? ` / ${quota.period.charAt(0).toUpperCase() + quota.period.slice(1)}`
        : "";

    return (
        <div className="card p-6 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />

            <div className="relative">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
                        Invite Quota
                    </h3>
                    {sourceGroup && (
                        <span className="badge-primary">
                            {sourceGroup}
                        </span>
                    )}
                </div>

                <div className="flex items-end gap-2 mb-4">
                    <span className="text-4xl font-bold gradient-text">
                        {quota.used}
                    </span>
                    <span className="text-2xl text-surface-400 dark:text-surface-500 mb-1">
                        / {limitDisplay}
                    </span>
                    <span className="text-sm text-surface-500 dark:text-surface-400 mb-1.5">
                        used{periodLabel}
                    </span>
                </div>

                {/* Progress bar */}
                <div className="relative h-3 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden mb-4">
                    <div
                        className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${quota.isUnlimited
                            ? "bg-surface-400 dark:bg-surface-600 opacity-50"
                            : percentage >= 100
                                ? "bg-gradient-to-r from-red-500 to-red-600"
                                : percentage >= 75
                                    ? "bg-gradient-to-r from-amber-500 to-amber-600"
                                    : "bg-gradient-to-r from-primary-500 to-primary-600"
                            }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                </div>

                <div className="flex items-center justify-between text-sm">
                    <span className="text-surface-500 dark:text-surface-400">
                        {quota.strategy === "recurring"
                            ? `Resets every ${quota.period}`
                            : quota.strategy === "fixed"
                                ? "Lifetime limit"
                                : "No limit"}
                    </span>
                    <span
                        className={`font-medium ${quota.isUnlimited
                            ? "text-emerald-600 dark:text-emerald-400"
                            : (quota.remaining ?? 0) <= 0
                                ? "text-red-600 dark:text-red-400"
                                : "text-surface-700 dark:text-surface-300"
                            }`}
                    >
                        {quota.isUnlimited ? (
                            "Unlimited invites"
                        ) : (quota.remaining ?? 0) <= 0 ? (
                            "Quota exhausted"
                        ) : (
                            <>{remainingDisplay} remaining</>
                        )}
                    </span>
                </div>
            </div>
        </div>
    );
}
