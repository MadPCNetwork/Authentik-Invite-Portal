import { useState, useEffect } from "react";
import { QuotaStatus } from "@/lib/schemas";
import { EmailInviteModal } from "./EmailInviteModal";

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

const DEFAULT_EMAIL_MESSAGE = `You have been invited by {{inviter_username}} to create an account.
Please accept this invitation to access your resources by clicking the link below:
{{invite_url}}

Note: This invitation is valid until {{expiration_date}}.`;

export function CreateInviteForm({
    quota,
    expiryOptions,
    allowMultiUse,
    onInviteCreated,
}: CreateInviteFormProps) {
    const [name, setName] = useState("");
    const [expiry, setExpiry] = useState(expiryOptions[0]?.value ?? "24h");
    const [singleUse, setSingleUse] = useState(true);
    const [availableGroupings, setAvailableGroupings] = useState<{ name: string, groups: string[] }[]>([]);
    const [selectedGroupings, setSelectedGroupings] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successUrl, setSuccessUrl] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Email Modal State
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

    // Fetch allowed groups on mount
    useEffect(() => {
        fetch("/api/user/groups")
            .then(res => res.json())
            .then(data => {
                if (data.groups && Array.isArray(data.groups)) {
                    setAvailableGroupings(data.groups);
                    // Pre-select first one if desired, or none
                    // setSelectedGroupings([]);
                }
            })
            .catch(err => console.error("Failed to fetch groups:", err));
    }, []);

    const isDisabled =
        isLoading ||
        (!quota?.isUnlimited && (quota?.remaining ?? 0) <= 0);

    const handleGenerate = async (emailData?: { recipient: string; message: string }) => {
        setError(null);
        setWarning(null);
        setSuccessUrl(null);
        setIsLoading(true);

        try {
            const body: any = {
                name: name || `Invite ${new Date().toLocaleDateString()}`,
                expiry,
                singleUse,
                groups: selectedGroupings,
            };

            if (emailData) {
                body.emailRecipient = emailData.recipient;
                body.emailMessage = emailData.message;
            }

            const response = await fetch("/api/generate-invite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error ?? "Failed to create invite");
            }

            if (emailData) {
                if (data.message) {
                    // Email failed, but invite created. Show URL and Warning.
                    setSuccessUrl(data.inviteUrl);
                    setWarning(data.message);
                    setIsEmailModalOpen(false);
                    onInviteCreated();
                } else {
                    // Success fully
                    onInviteCreated();
                    setIsEmailModalOpen(false);
                    setName("");
                    // Maybe just show a simple toast or status check
                    // For now, clear everything as "Done"
                }
            } else {
                setSuccessUrl(data.inviteUrl);
                setName("");
                onInviteCreated();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await handleGenerate();
    };

    const handleSendEmail = async (recipient: string, message: string) => {
        await handleGenerate({ recipient, message });
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
                Create Invitation
            </h3>

            {successUrl ? (
                <div className="animate-slide-up">
                    {warning && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 mb-4">
                            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span className="text-sm font-medium">{warning}</span>
                            </div>
                        </div>
                    )}

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
                        onClick={() => {
                            setSuccessUrl(null);
                            setWarning(null);
                        }}
                        className="btn-ghost text-sm w-full"
                    >
                        Create Another Invite
                    </button>
                </div>
            ) : (
                <>
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

                        {/* Group Selection */}
                        {availableGroupings.length > 0 && (
                            <div>
                                <label className="label mb-2">
                                    Attach Groups
                                    <span className="ml-2 text-xs font-normal text-surface-500">
                                        (Select which groups effectively get applied)
                                    </span>
                                </label>
                                <div className="space-y-2 border border-surface-200 dark:border-surface-700 rounded-xl p-3 bg-surface-50 dark:bg-surface-800/50">
                                    {availableGroupings.map((grouping) => {
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

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-1">
                            <button
                                type="submit"
                                disabled={isDisabled}
                                className="btn-primary"
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Creating...
                                    </span>
                                ) : !quota?.isUnlimited && (quota?.remaining ?? 0) <= 0 ? (
                                    "Quota Exhausted"
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                        </svg>
                                        Generate Link
                                    </span>
                                )}
                            </button>

                            <button
                                type="button"
                                disabled={isDisabled}
                                onClick={() => setIsEmailModalOpen(true)}
                                className="btn-secondary"
                            >
                                <span className="flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    Send via Email
                                </span>
                            </button>
                        </div>
                    </form>

                    <EmailInviteModal
                        isOpen={isEmailModalOpen}
                        onClose={() => setIsEmailModalOpen(false)}
                        onSend={handleSendEmail}
                        defaultMessage={DEFAULT_EMAIL_MESSAGE}
                        isLoading={isLoading}
                    />
                </>
            )}
        </div>
    );
}
