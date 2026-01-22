import { parseDuration } from "./policy-engine";

interface AuthentikInvitation {
    pk: string;
    name: string;
    expires?: string;
    single_use: boolean;
    flow: string | null;
    created_by: number;
}

interface AuthentikFlow {
    pk: string;
    slug: string;
    name: string;
    title: string;
    designation: string;
}

interface AuthentikFlowsResponse {
    pagination: {
        count: number;
    };
    results: AuthentikFlow[];
}

interface AuthentikUser {
    pk: number;
    username: string;
    name: string;
    email: string;
    uid: string;
}

interface AuthentikUsersResponse {
    pagination: {
        count: number;
    };
    results: AuthentikUser[];
}

interface AuthentikError {
    detail?: string;
    non_field_errors?: string[];
    [key: string]: unknown;
}

export interface CreateInvitationParams {
    name: string;
    expiry: string;
    singleUse: boolean;
    flowSlug: string;
    flowPk: string;
    creatorUsername?: string;
    fixedData?: Record<string, unknown>;
}

export interface CreateInvitationResult {
    success: boolean;
    invitation?: AuthentikInvitation;
    inviteUrl?: string;
    error?: string;
}

export interface FlowInfo {
    slug: string;
    name: string;
    pk: string;
}

export class AuthentikAPI {
    private baseUrl: string;
    private token: string;

    constructor() {
        const baseUrl = process.env.AUTHENTIK_API_URL;
        const token = process.env.AUTHENTIK_API_TOKEN;

        if (!baseUrl || !token) {
            throw new Error(
                "AUTHENTIK_API_URL and AUTHENTIK_API_TOKEN must be configured"
            );
        }

        this.baseUrl = baseUrl.replace(/\/$/, "");
        this.token = token;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
            ...options.headers,
        };

        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            let errorMessage = `Authentik API error: ${response.status}`;
            try {
                const errorData = (await response.json()) as AuthentikError;
                // console.error("Authentik API Error Response:", JSON.stringify(errorData, null, 2));

                if (errorData.detail) {
                    errorMessage = errorData.detail;
                } else if (errorData.non_field_errors) {
                    errorMessage = errorData.non_field_errors.join(", ");
                } else {
                    // Capture field-specific errors
                    const fieldErrors = Object.entries(errorData)
                        .filter(([key]) => key !== 'detail' && key !== 'non_field_errors')
                        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                        .join('; ');
                    if (fieldErrors) {
                        errorMessage = fieldErrors;
                    }
                }
            } catch {
                // Use default error message
            }
            throw new Error(errorMessage);
        }

        return response.json() as Promise<T>;
    }

    /**
     * Get available enrollment flows from Authentik.
     */
    async getFlows(): Promise<FlowInfo[]> {
        try {
            const response = await this.request<AuthentikFlowsResponse>(
                "/api/v3/flows/instances/?designation=enrollment"
            );
            return response.results.map((flow) => ({
                slug: flow.slug,
                name: flow.name || flow.title || flow.slug,
                pk: flow.pk,
            }));
        } catch (error) {
            console.error("Failed to fetch flows:", error);
            return [];
        }
    }

    /**
     * Get a specific flow by slug.
     */
    async getFlow(slug: string): Promise<AuthentikFlow | null> {
        try {
            const response = await this.request<AuthentikFlowsResponse>(
                `/api/v3/flows/instances/?slug=${slug}`
            );
            return response.results[0] || null;
        } catch {
            return null;
        }
    }

    /**
     * Create an invitation in Authentik.
     */
    async createInvitation(
        params: CreateInvitationParams
    ): Promise<CreateInvitationResult> {
        try {
            // Calculate expiration date
            let expires: string | undefined;
            if (params.expiry !== "never") {
                const durationMs = parseDuration(params.expiry);
                if (durationMs > 0 && durationMs !== Infinity) {
                    const expiryDate = new Date(Date.now() + durationMs);
                    expires = expiryDate.toISOString();
                }
            }

            // Convert name to a valid slug
            const slugName = params.name
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .substring(0, 50) || `invite-${Date.now()}`;

            const body: Record<string, unknown> = {
                name: slugName,
                single_use: params.singleUse,
                flow: params.flowPk, // Use PK for API
            };

            if (params.creatorUsername) {
                body.fixed_data = {
                    invited_by: params.creatorUsername,
                    ...params.fixedData,
                };
            } else if (params.fixedData) {
                body.fixed_data = params.fixedData;
            }

            if (expires) {
                body.expires = expires;
            }

            const invitation = await this.request<AuthentikInvitation>(
                "/api/v3/stages/invitation/invitations/",
                {
                    method: "POST",
                    body: JSON.stringify(body),
                }
            );

            // Construct the invite URL using the selected flow slug
            const inviteUrl = `${this.baseUrl}/if/flow/${params.flowSlug}/?itoken=${invitation.pk}`;

            return {
                success: true,
                invitation,
                inviteUrl,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    /**
     * Get invitation details by ID.
     */
    async getInvitation(pk: string): Promise<AuthentikInvitation | null> {
        try {
            return await this.request<AuthentikInvitation>(
                `/api/v3/stages/invitation/invitations/${pk}/`
            );
        } catch {
            return null;
        }
    }

    /**
     * Delete an invitation.
     */
    async deleteInvitation(pk: string): Promise<boolean> {
        try {
            await this.request(`/api/v3/stages/invitation/invitations/${pk}/`, {
                method: "DELETE",
            });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Search for users in Authentik.
     */
    async searchUsers(query: string): Promise<Array<{ id: string; name: string; username: string; email: string }>> {
        try {
            const params = new URLSearchParams({
                search: query,
                ordering: "username",
                page_size: "10",
            });

            const response = await this.request<AuthentikUsersResponse>(
                `/api/v3/core/users/?${params.toString()}`
            );

            return response.results.map((user) => ({
                id: user.uid,
                name: user.name,
                username: user.username,
                email: user.email,
            }));
        } catch (error) {
            console.error("Failed to search users:", error);
            return [];
        }
    }

    /**
     * Get a single user by ID.
     */
    async getUser(id: string): Promise<{ id: string; name: string; username: string; email: string } | null> {
        try {
            const response = await this.request<AuthentikUser>(`/api/v3/core/users/${id}/`);
            return {
                id: response.uid,
                name: response.name,
                username: response.username,
                email: response.email,
            };
        } catch {
            return null;
        }
    }
}

// Singleton instance
let authentikApi: AuthentikAPI | null = null;

export function getAuthentikAPI(): AuthentikAPI {
    if (!authentikApi) {
        authentikApi = new AuthentikAPI();
    }
    return authentikApi;
}
