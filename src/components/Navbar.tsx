"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";

export function Navbar() {
    const { data: session } = useSession();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isUnlimited, setIsUnlimited] = useState(false);

    const adminGroup = session?.adminGroup ?? "Invite Portal Admins";
    const isAdmin = session?.user?.groups?.includes(adminGroup);

    useEffect(() => {
        if (session?.user) {
            fetch("/api/user/quota")
                .then(res => res.json())
                .then(data => {
                    if (data?.quota?.isUnlimited) {
                        setIsUnlimited(true);
                    }
                })
                .catch(err => console.error("Failed to check quota for navbar:", err));
        }
    }, [session]);

    return (
        <nav className="glass sticky top-0 z-50 border-b border-surface-200 dark:border-surface-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link href="/dashboard" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/25">
                            <svg
                                className="w-6 h-6 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                />
                            </svg>
                        </div>
                        <span className="text-xl font-semibold text-surface-900 dark:text-white">
                            Invite Portal
                        </span>
                    </Link>

                    {/* Navigation Links */}
                    <div className="hidden md:flex items-center gap-2">
                        <Link
                            href="/dashboard"
                            className="btn-ghost text-sm"
                        >
                            Dashboard
                        </Link>
                        {isUnlimited && (
                            <Link
                                href="/dashboard/bulk"
                                className="btn-ghost text-sm flex items-center gap-2"
                            >
                                <span className="text-primary-600 dark:text-primary-400">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </span>
                                Bulk Invites
                            </Link>
                        )}
                        {isAdmin && (
                            <Link
                                href="/admin"
                                className="btn-ghost text-sm"
                            >
                                Admin
                            </Link>
                        )}
                    </div>

                    {/* User Menu */}
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                            >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium text-sm">
                                    {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
                                </div>
                                <div className="hidden sm:block text-left">
                                    <p className="text-sm font-medium text-surface-900 dark:text-white">
                                        {session?.user?.name ?? "User"}
                                    </p>
                                    <p className="text-xs text-surface-500 dark:text-surface-400">
                                        {session?.user?.email}
                                    </p>
                                </div>
                                <svg
                                    className={`w-4 h-4 text-surface-400 transition-transform ${isMenuOpen ? "rotate-180" : ""
                                        }`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </button>

                            {/* Dropdown Menu */}
                            {isMenuOpen && (
                                <div className="absolute right-0 mt-2 w-56 card p-2 shadow-xl animate-fade-in">
                                    <div className="md:hidden">
                                        <Link
                                            href="/dashboard"
                                            className="block px-4 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            Dashboard
                                        </Link>
                                        {isUnlimited && (
                                            <Link
                                                href="/dashboard/bulk"
                                                className="block px-4 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg"
                                                onClick={() => setIsMenuOpen(false)}
                                            >
                                                Bulk Invites
                                            </Link>
                                        )}
                                        {isAdmin && (
                                            <Link
                                                href="/admin"
                                                className="block px-4 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg"
                                                onClick={() => setIsMenuOpen(false)}
                                            >
                                                Admin
                                            </Link>
                                        )}
                                        <hr className="my-2 border-surface-200 dark:border-surface-700" />
                                    </div>
                                    <div className="px-4 py-2 border-b border-surface-200 dark:border-surface-700 mb-2">
                                        <p className="text-xs text-surface-500 dark:text-surface-400 mb-1">
                                            Groups
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {session?.user?.groups?.slice(0, 3).map((group) => (
                                                <span key={group} className="badge-primary text-xs">
                                                    {group}
                                                </span>
                                            ))}
                                            {(session?.user?.groups?.length ?? 0) > 3 && (
                                                <span className="badge-primary text-xs">
                                                    +{(session?.user?.groups?.length ?? 0) - 3}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => signOut({ callbackUrl: "/" })}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
                                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                            />
                                        </svg>
                                        Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
