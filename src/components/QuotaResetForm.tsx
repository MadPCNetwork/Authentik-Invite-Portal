"use client";

import { useState, useEffect, useRef } from "react";

interface QuotaResetFormProps {
    onReset: () => void;
}

interface UserResult {
    id: string;
    username: string;
    name: string;
    email: string;
}

export function QuotaResetForm({ onReset }: QuotaResetFormProps) {
    const [userSub, setUserSub] = useState("");
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<UserResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close results when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Debounced search
    const handleSearch = (value: string) => {
        setQuery(value);
        setUserSub(""); // Reset selection if typing
        setShowResults(true);

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        if (value.length < 2) {
            setResults([]);
            return;
        }

        setIsSearching(true);
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(value)}`);
                if (res.ok) {
                    const data = await res.json();
                    setResults(data.users || []);
                }
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    };

    const handleSelectUser = (user: UserResult) => {
        setUserSub(user.id);
        const displayName = user.username || user.name || user.email;
        setQuery(displayName); // Show name in input
        setShowResults(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setIsLoading(true);

        // Fallback: If they typed a full UUID manually, use it
        const finalSub = userSub || (query.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ? query : "");

        if (!finalSub) {
            setError("Please select a valid user or enter a valid UUID");
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch("/api/admin/reset-quota", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userSub: finalSub }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error ?? "Failed to reset quota");
            }

            setSuccess(`Quota reset for ${query}`);
            setUserSub("");
            setQuery("");
            onReset();
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="card p-6 h-fit" ref={containerRef}>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">
                Reset User Quota
            </h3>
            <p className="text-sm text-surface-500 dark:text-surface-400 mb-6">
                Search for a user by username or email to reset their invite quota.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                    <label htmlFor="userSearch" className="label">
                        Search User
                    </label>
                    <div className="relative">
                        <input
                            id="userSearch"
                            type="text"
                            value={query}
                            onChange={(e) => handleSearch(e.target.value)}
                            onFocus={() => query.length >= 2 && setShowResults(true)}
                            placeholder="Type username or email..."
                            className="input w-full"
                            autoComplete="off"
                        />
                        {isSearching && (
                            <div className="absolute right-3 top-3">
                                <svg className="animate-spin h-5 w-5 text-primary-500" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Results Dropdown */}
                    {showResults && results.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-surface-800 rounded-xl shadow-lg border border-surface-200 dark:border-surface-700 max-h-60 overflow-auto">
                            {results.map((user) => (
                                <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => handleSelectUser(user)}
                                    className="w-full text-left px-4 py-3 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors border-b border-surface-100 dark:border-surface-700/50 last:border-0"
                                >
                                    <div className="font-medium text-surface-900 dark:text-white">
                                        {user.username}
                                        {user.name && user.name !== user.username && (
                                            <span className="ml-2 text-sm text-surface-500 font-normal">({user.name})</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-surface-500 dark:text-surface-400">
                                        {user.email}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {showResults && query.length >= 2 && results.length === 0 && !isSearching && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-surface-800 rounded-xl shadow-lg border border-surface-200 dark:border-surface-700 p-4 text-center text-sm text-surface-500">
                            No users found.
                        </div>
                    )}
                </div>

                {userSub && (
                    <div className="text-xs font-mono text-surface-400 dark:text-surface-500 bg-surface-50 dark:bg-surface-900 p-2 rounded break-all">
                        Selected UUID: {userSub}
                    </div>
                )}

                {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">{success}</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading || !userSub}
                    className="btn-primary w-full"
                >
                    {isLoading ? (
                        <span className="flex items-center gap-2 justify-center">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Resetting...
                        </span>
                    ) : (
                        <span className="flex items-center gap-2 justify-center">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Reset Quota
                        </span>
                    )}
                </button>
            </form>
        </div>
    );
}
