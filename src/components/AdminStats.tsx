"use client";

interface StatsData {
    totalInvites: number;
    uniqueUsers: number;
    invitesToday: number;
    invitesThisMonth: number;
}

interface AdminStatsProps {
    stats: StatsData | null;
    isLoading: boolean;
}

export function AdminStats({ stats, isLoading }: AdminStatsProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="card p-6">
                        <div className="skeleton h-4 w-20 mb-3 rounded" />
                        <div className="skeleton h-8 w-16 rounded" />
                    </div>
                ))}
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="card p-6 text-center text-surface-500">
                Unable to load statistics
            </div>
        );
    }

    const statItems = [
        {
            label: "Total Invites",
            value: stats.totalInvites,
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                </svg>
            ),
            color: "from-primary-500 to-primary-600",
            bgColor: "bg-primary-100 dark:bg-primary-900/30",
            textColor: "text-primary-600 dark:text-primary-400",
        },
        {
            label: "Unique Users",
            value: stats.uniqueUsers,
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                </svg>
            ),
            color: "from-emerald-500 to-emerald-600",
            bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
            textColor: "text-emerald-600 dark:text-emerald-400",
        },
        {
            label: "Today",
            value: stats.invitesToday,
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
            ),
            color: "from-amber-500 to-amber-600",
            bgColor: "bg-amber-100 dark:bg-amber-900/30",
            textColor: "text-amber-600 dark:text-amber-400",
        },
        {
            label: "This Month",
            value: stats.invitesThisMonth,
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                </svg>
            ),
            color: "from-violet-500 to-violet-600",
            bgColor: "bg-violet-100 dark:bg-violet-900/30",
            textColor: "text-violet-600 dark:text-violet-400",
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statItems.map((item) => (
                <div
                    key={item.label}
                    className="card p-6 relative overflow-hidden group hover:shadow-lg transition-shadow"
                >
                    {/* Background gradient on hover */}
                    <div
                        className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-5 transition-opacity`}
                    />

                    <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-surface-500 dark:text-surface-400">
                                {item.label}
                            </span>
                            <div
                                className={`w-8 h-8 rounded-lg ${item.bgColor} ${item.textColor} flex items-center justify-center`}
                            >
                                {item.icon}
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-surface-900 dark:text-white">
                            {item.value.toLocaleString()}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
