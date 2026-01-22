import type { NextAuthOptions, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";

// Extend the built-in types
declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            username?: string;
            groups: string[];
        };
        accessToken?: string;
        adminGroup?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        sub: string;
        groups: string[];
        username?: string;
        accessToken?: string;
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        {
            id: "authentik",
            name: "Authentik",
            type: "oauth",
            wellKnown: `${process.env.AUTHENTIK_ISSUER_URL}/.well-known/openid-configuration`,
            clientId: process.env.AUTHENTIK_CLIENT_ID,
            clientSecret: process.env.AUTHENTIK_CLIENT_SECRET,
            authorization: {
                params: {
                    scope: "openid email profile groups",
                },
            },
            idToken: true,
            checks: ["pkce", "state"],
            profile(profile) {
                return {
                    id: profile.sub,
                    name: profile.name ?? profile.preferred_username,
                    email: profile.email,
                    image: profile.picture,
                    username: profile.preferred_username,
                    groups: profile.groups ?? [],
                };
            },
        },
    ],
    callbacks: {
        async jwt({ token, account, profile }): Promise<JWT> {
            // Initial sign-in: extract groups from the ID token
            if (account && profile) {
                token.accessToken = account.access_token;
                token.groups = (profile as { groups?: string[] }).groups ?? [];
                token.username = (profile as { preferred_username?: string }).preferred_username;
                token.sub = profile.sub as string;
            }
            return token;
        },
        async session({ session, token }): Promise<Session> {
            // Pass groups to the client session
            session.user.id = token.sub;
            session.user.groups = token.groups ?? [];
            session.user.username = token.username;
            session.accessToken = token.accessToken;
            // Inject runtime admin group config so client knows what to check against
            session.adminGroup = process.env.ADMIN_GROUP_NAME ?? "Invite Portal Admins";
            return session;
        },
    },
    pages: {
        signIn: "/",
        error: "/auth/error",
    },
    session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60, // 24 hours
    },
    debug: process.env.NODE_ENV === "development",
};
