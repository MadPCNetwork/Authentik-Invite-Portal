"use client";

import { useState, useEffect } from "react";
import { QuotaStatus } from "@/lib/schemas";

interface ExpiryOption {
    value: string;
    label: string;
}

interface CreateInviteFormProps {
    quota: QuotaStatus | null;
    expiryOptions: ExpiryOption[];
    allowMultiUse: boolean;
    onInviteCreated: () => void;
}

export function CreateInviteForm({
    quota,
    expiryOptions,
    allowMultiUse,
    onInviteCreated,
}: CreateInviteFormProps) {
    const [name, setName] = useState("");
    const [expiry, setExpiry] = useState(expiryOptions[0]?.value ?? "24h");
    const [singleUse, setSingleUse] = useState(true);
    const [groups, setGroups] = useState<string[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successUrl, setSuccessUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Fetch allowed groups on mount
    useEffect(() => {
        fetch("/api/user/groups")
            .then(res => res.json())
            .then(data => {
                if (data.groups && Array.isArray(data.groups)) {
                    setGroups(data.groups);
                    if (data.groups.length > 0) {
                        setSelectedGroup(data.groups[0]);
                    }
                }
            })
            .catch(err => console.error("Failed to fetch groups:", err));
    }, []);

    const isDisabled =
        isLoading ||
        (!quota?.isUnlimited && (quota?.remaining ?? 0) <= 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessUrl(null);
        setIsLoading(true);

        try {
            const response = await fetch("/api/generate-invite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name || `Invite ${new Date().toLocaleDateString()}`,
                    expiry,
                    singleUse,
                    group: selectedGroup,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error ?? "Failed to create invite");
            }

            setSuccessUrl(data.inviteUrl);
            setName("");
            onInviteCreated();
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = async () => {
        if (!successUrl) return;

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(successUrl);
            } else {
                throw new Error("Clipboard API unavailable");
            }
        } catch (err) {
            console.warn("Clipboard API failed, using fallback", err);
            // Fallback for insecure context
            const textArea = document.createElement("textarea");
            textArea.value = successUrl;
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
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="card p-6">
            <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-6">
                Create Invitation
            </h3>

            {successUrl ? (
                <div className="animate-slide-up">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 mb-4">
                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 mb-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="font-medium">Invite Created!</span>
                        </div>
                        <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-3">
                            Share this link with the person you want to invite:
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={successUrl}
                                readOnly
                                className="input flex-1 text-sm font-mono bg-white dark:bg-surface-900"
                            />
                            <button
                                onClick={handleCopy}
                                className={`btn-secondary min-w-[80px] ${copied ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" : ""
                                    }`}
                            >
                                {copied ? "Copied!" : "Copy"}
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={() => setSuccessUrl(null)}
                        className="btn-ghost text-sm w-full"
                    >
                        Create Another Invite
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Name Input */}
                    <div>
                        <label htmlFor="name" className="label">
                            Invite Name <span className="text-surface-400">(optional)</span>
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., John's Invite"
                            className="input"
                            maxLength={100}
                        />
                    </div>

                    {/* Group Select */}
                    {groups.length > 0 && (
                        <div>
                            <label htmlFor="group" className="label">
                                Add to Group
                            </label>
                            <select
                                id="group"
                                value={selectedGroup}
                                onChange={(e) => setSelectedGroup(e.target.value)}
                                className="input"
                            >
                                {groups.map((group) => (
                                    <option key={group} value={group}>
                                        {group}
                                    </option>
                                ))}
                            </select>
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

                    {/* Multi-use Toggle */}
                    {allowMultiUse && (
                        <div className="flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-800 rounded-xl">
                            <div>
                                <p className="font-medium text-surface-900 dark:text-white">
                                    Single Use
                                </p>
                                <p className="text-sm text-surface-500 dark:text-surface-400">
                                    Invite can only be used once
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
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                            <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                                <span className="text-sm">{error}</span>
                            </div>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isDisabled}
                        className="btn-primary w-full text-base py-3"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        fill="none"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                                Creating...
                            </span>
                        ) : !quota?.isUnlimited && (quota?.remaining ?? 0) <= 0 ? (
                            "Quota Exhausted"
                        ) : (
                            <span className="flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 4v16m8-8H4"
                                    />
                                </svg>
                                Generate Invite
                            </span>
                        )}
                    </button>
                </form>
            )}
        </div>
    );
}
