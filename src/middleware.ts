import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

const ADMIN_GROUP = process.env.ADMIN_GROUP_NAME ?? "Invite Portal Admins";

export default withAuth(
    function middleware(req) {
        const { pathname } = req.nextUrl;
        const token = req.nextauth.token;

        // Admin routes require admin group membership
        if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
            const groups = token?.groups ?? [];
            const adminGroup = process.env.ADMIN_GROUP_NAME ?? "Invite Portal Admins";

            if (!groups.includes(adminGroup)) {
                if (pathname.startsWith("/api/")) {
                    return NextResponse.json(
                        { error: "Admin access required" },
                        { status: 403 }
                    );
                }
                return NextResponse.redirect(new URL("/dashboard", req.url));
            }
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
    }
);

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/admin/:path*",
        "/api/generate-invite",
        "/api/user/:path*",
        "/api/admin/:path*",
    ],
};
