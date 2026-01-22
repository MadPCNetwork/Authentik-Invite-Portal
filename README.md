# Invite Portal

A standalone invitation portal application that interfaces with Authentik Identity Provider for generating and managing invitation links.

## Features

- **Authentik OIDC Authentication** - Secure login via your existing Authentik instance
- **Group-Based Permissions** - Quota and permission policies based on Authentik groups
- **Flexible Quota System** - Fixed, recurring, or unlimited invite quotas per group
- **SMTP Email Delivery** - Send invites directly via email with customizable templates
- **Bulk Invite Creation** - Generate multiple unique invites in one action
- **Invite Management** - Delete and manage active invites
- **Audit Logging** - All invite creations tracked in SQLite database
- **Admin Panel** - Global statistics and quota management for administrators

## Quick Start with Docker

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Configure environment variables** in `.env`:
   - `AUTHENTIK_ISSUER_URL` - Your Authentik OIDC issuer URL
   - `AUTHENTIK_CLIENT_ID` - OAuth2 client ID from Authentik
   - `AUTHENTIK_CLIENT_SECRET` - OAuth2 client secret
   - `AUTHENTIK_API_URL` - Base URL of your Authentik instance
   - `AUTHENTIK_API_TOKEN` - Service account token for API access
   - `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
   - `AUTHENTIK_FLOW_SLUG` - The flow to use for invites (e.g., `default-enrollment-flow`)
   - `SMTP_HOST` - SMTP server host
   - `SMTP_PORT` - SMTP server port
   - `SMTP_USERNAME` - SMTP username
   - `SMTP_PASSWORD` - SMTP password
   - `SMTP_USE_TLS` - Enable TLS for SMTP connection (true/false)
   - `SMTP_FROM_EMAIL` - Email address to send invites from
   - `APP_NAME` - Application name to display in emails

3. **Start the application:**
   ```bash
   docker compose up -d
   ```

4. **Access the portal** at `http://localhost:3000`

## Authentik Setup

### 1. OAuth2/OIDC Provider
1. Create a new **OAuth2/OpenID Provider** in Authentik
2. Set redirect URI to `http://localhost:3000/api/auth/callback/authentik`
3. Include `groups` scope in the provider configuration

### 2. Service Account
1. Create a Service Account for the API
2. Create an **API Token** for this account
3. Assign permissions for invitation management

### 3. Propagate Invite Attributes (Group Assignment)
By default, Authentik does not automatically assign groups from invites. You must configure an Expression Policy to handle this.

**Step 1: Create Expression Policy**
Go to **Customization → Policies → Expression Policies** and create a policy named `enrollment-save-invite-metadata`:
```python
from authentik.core.models import Group

# Optional: Safety Whitelist
# Only allow these specific groups to be assigned via invites
ALLOWED_GROUPS = ["MadPC", "Legend", "Users", "Admins"]

# 1. Fetch context data
prompt_data = request.context.get("prompt_data", {})
user = request.context.get("pending_user")

# 2. Safety Check
if not user:
    return True

# 3. Handle Custom Text Attributes (e.g., invited_by)
if "invited_by" in prompt_data:
    if not user.attributes:
        user.attributes = {}
    user.attributes["invited_by"] = prompt_data["invited_by"]
    user.save()

# 4. Handle Dynamic Group Assignment
# Supports multiple groups via 'invite_groups' list
invite_groups = prompt_data.get("invite_groups", [])

# Fallback for legacy single-group invites
if not invite_groups and "invite_group" in prompt_data:
    invite_groups = [prompt_data["invite_group"]]

if invite_groups:
    for group_name in invite_groups:
        # Safety: Verify group is allowed
        if group_name not in ALLOWED_GROUPS:
             ak_message(f"Warning: Attempted to assign unauthorized group '{group_name}'.")
             continue

        group = Group.objects.filter(name=group_name).first()
        if group:
            group.users.add(user)
        else:
            ak_message(f"Warning: Group '{group_name}' not found.")

return True
```

**Step 2: Bind Policy to Flow**
1. Navigate to **Flows and Stages → Flows**.
2. Select your Enrollment Flow (defined in `AUTHENTIK_FLOW_SLUG`).
3. Click **Stage Bindings**.
4. Locate the **User Login Stage** (this usually runs immediately *after* the User Write Stage).
5. Bind the `enrollment-save-invite-metadata` policy to this stage.
6. **CRITICAL**: Do NOT bind this to the User Write Stage; the user must exist first.

## Policy Configuration

Edit `config/invite-policies.json` to customize group-based policies:

```json
{
  "policies": [
    {
      "group": "Premium Users",
      "quota": { "strategy": "recurring", "limit": 10, "period": "month" },
      "invite": { 
          "max_expiry": "1y", 
          "allow_multi_use": true,
          "allowed_groups": [
              {
                  "name": "Admin Role",
                  "groups": ["Admins", "SuperUsers"]
              },
              {
                  "name": "Standard User",
                  "groups": ["Users"]
              }
          ]
      }
    }
  ]
}
```

### Quota Strategies

- `fixed` - Lifetime limit on total invites
- `recurring` - Limit resets every period (day, week, month, year)
- `unlimited` - No limit on invites

## Development

```bash
# Install dependencies
npm install

# Setup database
npx prisma db push

# Run development server
npm run dev
```

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Auth:** NextAuth.js with OIDC
- **Database:** SQLite via Prisma
- **Styling:** Tailwind CSS
- **Validation:** Zod
- **Email:** Nodemailer
