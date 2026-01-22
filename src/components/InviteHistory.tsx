"use client";

import { useState } from "react";
import { InviteHistoryItem } from "@/lib/schemas";

interface InviteHistoryProps {
    history: InviteHistoryItem[];
    isLoading: boolean;
}

export function InviteHistory({ history, isLoading, onDelete }: InviteHistoryProps & { onDelete: (id: string) => Promise<void> }) {
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCopy = async (item: InviteHistoryItem) => {
        if (item.status === 'EXHAUSTED') return;

        const inviteUrl = item.invite_url;

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(inviteUrl);
            } else {
                throw new Error("Clipboard API unavailable");
            }
        } catch (err) {
            console.warn("Clipboard API failed, using fallback", err);
            const textArea = document.createElement("textarea");
            textArea.value = inviteUrl;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                document.execCommand('copy');
            } catch (e) {
                console.error("Copy failed", e);
                return;
            } finally {
                document.body.removeChild(textArea);
            }
        }

        setCopiedId(item.invite_uuid);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    if (isLoading) {
        return (
            <div className="card p-6">
                <div className="skeleton h-6 w-32 mb-6 rounded-lg" />
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="skeleton h-16 w-full rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
                    Invite History
                </h3>
                <span className="badge-primary">
                    {history.length} {history.length === 1 ? "invite" : "invites"}
                </span>
            </div>

            {history.length === 0 ? (
                <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                        <svg
                            className="w-8 h-8 text-surface-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                        </svg>
                    </div>
                    <p className="text-surface-500 dark:text-surface-400 mb-1">
                        No invites yet
                    </p>
                    <p className="text-sm text-surface-400 dark:text-surface-500">
                        Create your first invite above
                    </p>
                </div>
            ) : (
                <div className="overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-surface-200 dark:border-surface-700">
                                <th className="text-left py-3 px-4 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                                    Invite ID
                                </th>
                                <th className="text-left py-4 px-6 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                                    Assigned Group
                                </th>

                                <th className="text-left py-3 px-4 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                                    Expires
                                </th>
                                <th className="text-right py-3 px-4 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                            {history.map((item) => (
                                <tr
                                    key={item.id}
                                    className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
                                >
                                    <td className="py-4 px-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(item.status || 'ACTIVE') === 'ACTIVE'
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                            : 'bg-surface-100 text-surface-800 dark:bg-surface-800 dark:text-surface-400'
                                            }`}>
                                            {(item.status || 'ACTIVE') === 'ACTIVE'
                                                ? 'Active'
                                                : item.status === 'DELETED'
                                                    ? 'Deleted'
                                                    : 'Exhausted'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <code className="text-sm font-mono text-surface-700 dark:text-surface-300 bg-surface-100 dark:bg-surface-800 px-2 py-1 rounded">
                                            {item.invite_uuid.slice(0, 8)}...
                                        </code>
                                    </td>
                                    <td className="py-4 px-4">
                                        {item.invite_group ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                                                {item.invite_group}
                                            </span>
                                        ) : (
                                            <span className="text-surface-400">-</span>
                                        )}
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className="text-sm text-surface-600 dark:text-surface-400">
                                            {item.expiresAt ? formatDate(item.expiresAt) : 'Never'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleCopy(item)}
                                                disabled={item.status === 'EXHAUSTED' || item.status === 'DELETED'}
                                                className={`btn-ghost text-sm ${item.status === 'EXHAUSTED' || item.status === 'DELETED'
                                                    ? "opacity-40 cursor-not-allowed"
                                                    : copiedId === item.invite_uuid
                                                        ? "text-emerald-600 dark:text-emerald-400"
                                                        : ""
                                                    }`}
                                            >
                                                {copiedId === item.invite_uuid ? (
                                                    <span className="flex items-center gap-1">
                                                        <svg
                                                            className="w-4 h-4"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M5 13l4 4L19 7"
                                                            />
                                                        </svg>
                                                        Copied
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1">
                                                        <svg
                                                            className="w-4 h-4"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                                                            />
                                                        </svg>
                                                        Copy Link
                                                    </span>
                                                )}
                                            </button>

                                            {(item.status || 'ACTIVE') === 'ACTIVE' && (
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm("Are you sure you want to delete this invite? It will no longer be usable.")) {
                                                            onDelete(item.invite_uuid);
                                                        }
                                                    }}
                                                    className="btn-ghost text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    title="Delete Invite"
                                                >
                                                    <svg
                                                        className="w-4 h-4"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                        />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
