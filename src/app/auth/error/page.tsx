"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function AuthErrorContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");

    const getErrorMessage = (error: string | null) => {
        switch (error) {
            case "Configuration":
                return "There is a problem with the server configuration.";
            case "AccessDenied":
                return "You do not have permission to sign in.";
            case "Verification":
                return "The verification link has expired or has already been used.";
            case "OAuthSignin":
                return "Error occurred during the OAuth sign-in process.";
            case "OAuthCallback":
                return "Error in handling the response from OAuth provider.";
            case "OAuthCreateAccount":
                return "Could not create OAuth provider account.";
            case "Callback":
                return "Error in the OAuth callback handler.";
            default:
                return "An unknown error occurred during authentication.";
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                <div className="card p-8">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <svg
                            className="w-8 h-8 text-red-600 dark:text-red-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>

                    <h1 className="text-2xl font-bold text-surface-900 dark:text-white mb-2">
                        Authentication Error
                    </h1>
                    <p className="text-surface-500 dark:text-surface-400 mb-6">
                        {getErrorMessage(error)}
                    </p>

                    {error && (
                        <div className="mb-6 p-3 bg-surface-100 dark:bg-surface-800 rounded-lg">
                            <p className="text-xs text-surface-500 dark:text-surface-400">
                                Error code: <code className="font-mono">{error}</code>
                            </p>
                        </div>
                    )}

                    <Link href="/" className="btn-primary inline-flex">
                        Return to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function AuthErrorPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center">
                    <div className="animate-pulse-soft">Loading...</div>
                </div>
            }
        >
            <AuthErrorContent />
        </Suspense>
    );
}
