"use client";

import { useState } from "react";
import { QuotaStatus } from "@/lib/schemas";

interface ExpiryOption {
    value: string;
    label: string;
}
interface BulkInviteFormProps {
    quota: QuotaStatus | null;
    expiryOptions: ExpiryOption[];
    groups: { name: string; groups: string[] }[]; // Updated type
    onBulkInvite: (data: any) => Promise<void>;
}

const DEFAULT_EMAIL_MESSAGE = `You have been invited by {{inviter_username}} to create an account.
Please accept this invitation to access your resources by clicking the link below:
{{invite_url}}

Note: This invitation is valid until {{expiration_date}}.`;
export function BulkInviteForm({
    quota,
    expiryOptions,
    groups,
    onBulkInvite,
    requireGroupSelection = false,
}: BulkInviteFormProps & { requireGroupSelection?: boolean }) {
    const [emails, setEmails] = useState("");
    const [message, setMessage] = useState(DEFAULT_EMAIL_MESSAGE);
    const [expiry, setExpiry] = useState(expiryOptions[0]?.value ?? "24h");
    const [singleUse, setSingleUse] = useState(true);
    // Initialize with first group if available
    const [selectedGroupings, setSelectedGroupings] = useState<string[]>(groups.length > 0 ? [groups[0].name] : []);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Calculate approximate count based on lines/commas
    const emailCount = emails
        .split(/[\n,]/)
        .map(e => e.trim())
        .filter(e => e.length > 0).length;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus(null);
        setIsLoading(true);

        if (emailCount === 0) {
            setStatus({ type: 'error', message: "Please enter at least one email address." });
            setIsLoading(false);
            return;
        }

        if (requireGroupSelection && selectedGroupings.length === 0) {
            setStatus({ type: 'error', message: "Group selection is required." });
            setIsLoading(false);
            return;
        }

        try {
            await onBulkInvite({
                emails,
                message,
                expiry,
                singleUse,
                groups: selectedGroupings,
            });
            setStatus({ type: 'success', message: "Bulk invite process started." });
            setEmails("");
        } catch (err) {
            setStatus({
                type: 'error',
                message: err instanceof Error ? err.message : "Failed to process bulk invites"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const toggleGrouping = (groupName: string) => {
        setSelectedGroupings(prev => {
            if (prev.includes(groupName)) {
                return prev.filter(g => g !== groupName);
            } else {
                return [...prev, groupName];
            }
        });
    };

    return (
        <div className="card p-6">
            <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-6">
                Bulk Invite
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email List */}
                <div>
                    <label htmlFor="emails" className="label flex justify-between">
                        <span>Email Addresses (CSV or one per line)</span>
                        <span className="text-xs font-normal text-surface-500">
                            {emailCount} recipient{emailCount !== 1 ? 's' : ''}
                        </span>
                    </label>
                    <textarea
                        id="emails"
                        value={emails}
                        onChange={(e) => setEmails(e.target.value)}
                        placeholder="alice@example.com&#10;bob@example.com"
                        className="input min-h-[150px] font-mono text-sm"
                        required
                    />
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {/* Group Selection */}
                    {groups.length > 0 && (
                        <div>
                            <label className="label mb-2">
                                Add to Group
                                {requireGroupSelection && <span className="text-primary-500 ml-1">*</span>}
                            </label>
                            <div className="space-y-2 border border-surface-200 dark:border-surface-700 rounded-xl p-3 bg-surface-50 dark:bg-surface-800/50">
                                {groups.map((grouping) => {
                                    const isSelected = selectedGroupings.includes(grouping.name);
                                    return (
                                        <div
                                            key={grouping.name}
                                            onClick={() => toggleGrouping(grouping.name)}
                                            className={`
                                                relative flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-all
                                                ${isSelected
                                                    ? "bg-primary-50 border-primary-200 dark:bg-primary-900/20 dark:border-primary-800"
                                                    : "bg-surface-100 dark:bg-surface-800 border-transparent hover:border-surface-300 dark:hover:border-surface-600"
                                                }
                                            `}
                                        >
                                            <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors
                                                ${isSelected
                                                    ? "bg-primary-500 border-primary-500 text-white"
                                                    : "bg-white dark:bg-surface-900 border-surface-300 dark:border-surface-600"
                                                }
                                            `}>
                                                {isSelected && (
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-medium text-surface-900 dark:text-white text-sm">
                                                    {grouping.name}
                                                </div>
                                                <div className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                                                    Includes: {grouping.groups.join(", ")}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Expiry Select */}
                    <div>
                        <label htmlFor="expiry" className="label">
                            Expires After
                        </label>
                        <select
                            id="expiry"
                            value={expiry}
                            onChange={(e) => setExpiry(e.target.value)}
                            className="input"
                        >
                            {expiryOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Message Body */}
                <div>
                    <label htmlFor="message" className="label">
                        Email Message
                    </label>
                    <textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="input min-h-[120px]"
                        required
                    />
                    <p className="text-xs text-surface-500 mt-1">
                        Variables: {`{{inviter_username}}`}, {`{{expiration_date}}`}, {`{{invite_url}}`}
                    </p>
                </div>

                {/* Multi-use Toggle */}
                <div className="flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-800 rounded-xl">
                    <div>
                        <p className="font-medium text-surface-900 dark:text-white">
                            Single Use Links
                        </p>
                        <p className="text-sm text-surface-500 dark:text-surface-400">
                            {singleUse
                                ? "Generates a unique link for each recipient"
                                : "Generates ONE link shared by all recipients"}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setSingleUse(!singleUse)}
                        className={`relative w-14 h-8 rounded-full transition-colors ${singleUse
                            ? "bg-primary-500"
                            : "bg-surface-300 dark:bg-surface-600"
                            }`}
                    >
                        <span
                            className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${singleUse ? "translate-x-6" : "translate-x-0"
                                }`}
                        />
                    </button>
                </div>

                {/* Status Message */}
                {status && (
                    <div className={`p-4 rounded-xl border ${status.type === 'error'
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                        : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                        }`}>
                        {status.message}
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isLoading || (!!quota && !quota.isUnlimited)}
                    className="btn-primary w-full py-3"
                >
                    {isLoading ? (
                        <span className="flex items-center gap-2">
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Processing Bulk Invite...
                        </span>
                    ) : (
                        "Send Bulk Invites"
                    )}
                </button>
            </form>
        </div>
    );
}
