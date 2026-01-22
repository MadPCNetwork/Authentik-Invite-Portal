"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    // Redirect to dashboard if already logged in
    useEffect(() => {
        if (session) {
            router.push("/dashboard");
        }
    }, [session, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse-soft">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-xl shadow-primary-500/25">
                        <svg
                            className="w-8 h-8 text-white"
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
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            {/* Hero Section */}
            <div className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="max-w-lg w-full text-center">
                    {/* Logo */}
                    <div className="mb-8 animate-fade-in">
                        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-2xl shadow-primary-500/30 mb-6">
                            <svg
                                className="w-10 h-10 text-white"
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
                        <h1 className="text-4xl sm:text-5xl font-bold text-surface-900 dark:text-white mb-4">
                            Invite Portal
                        </h1>
                        <p className="text-lg text-surface-500 dark:text-surface-400 max-w-md mx-auto">
                            Generate and manage invitation links for the MadPC Network.
                        </p>
                    </div>

                    {/* Login Card */}
                    <div className="card p-8 animate-slide-up">
                        <h2 className="text-xl font-semibold text-surface-900 dark:text-white mb-2">
                            Welcome
                        </h2>
                        <p className="text-surface-500 dark:text-surface-400 mb-6">
                            Sign in with your account to continue
                        </p>

                        <button
                            onClick={() => signIn("authentik", { callbackUrl: "/dashboard" })}
                            className="btn-primary w-full text-base py-3 group"
                        >
                            <svg
                                className="w-5 h-5 transition-transform group-hover:scale-110"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                                />
                            </svg>
                            Sign in
                        </button>

                        <p className="mt-6 text-xs text-surface-400 dark:text-surface-500">
                            By signing in, you agree that your invites are your responsibility.
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="py-6 text-center text-sm text-surface-400 dark:text-surface-500">
                <p></p>
            </footer>
        </div>
    );
}
