import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
    title: "Invite Portal | Generate Authentik Invitations",
    description: "Generate and manage Authentik invitation links with quota management and audit logging.",
    keywords: ["authentik", "invitation", "portal", "SSO", "identity"],
    openGraph: {
        title: "Invite Portal",
        description: "Generate and manage Authentik invitation links",
        type: "website",
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className="antialiased">
                <Providers>
                    <main className="min-h-screen">
                        {children}
                    </main>
                </Providers>
            </body>
        </html>
    );
}
