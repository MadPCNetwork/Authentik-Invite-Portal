"use client";

import { useState, useEffect } from "react";

interface EmailInviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (email: string, message: string) => Promise<void>;
    defaultMessage: string;
    isLoading: boolean;
}

export function EmailInviteModal({
    isOpen,
    onClose,
    onSend,
    defaultMessage,
    isLoading,
}: EmailInviteModalProps) {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState(defaultMessage);
    const [error, setError] = useState<string | null>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setEmail("");
            setMessage(defaultMessage);
            setError(null);
        }
    }, [isOpen, defaultMessage]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email || !email.includes("@")) {
            setError("Please enter a valid email address");
            return;
        }

        try {
            await onSend(email, message);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to send email");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-surface-200 dark:border-surface-700 animate-slide-up">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold text-surface-900 dark:text-white">
                        Send Invite via Email
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="emailRecipient" className="label">
                            Recipient Email
                        </label>
                        <input
                            id="emailRecipient"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="friend@example.com"
                            className="input"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="emailBody" className="label">
                            Message
                        </label>
                        <textarea
                            id="emailBody"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="input min-h-[150px] resize-y font-normal"
                            required
                        />
                        <p className="text-xs text-surface-500 mt-1">
                            Supported variables: {`{{inviter_username}}`}, {`{{expiration_date}}`}, {`{{invite_url}}`}
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-ghost"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary"
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Sending...
                                </span>
                            ) : (
                                "Send Invite"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
