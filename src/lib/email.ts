import nodemailer from "nodemailer";

interface SendEmailParams {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

interface TemplateVariables {
    inviter_username: string;
    expiration_date: string;
    invite_url: string;
    [key: string]: string;
}

export class EmailService {
    private fromEmail: string = "noreply@example.com";
    private appName: string = "Authentik";

    constructor() {
        // Initial setup try
        this.reloadConfig();
    }

    private reloadConfig() {
        this.fromEmail = process.env.SMTP_FROM_EMAIL || "noreply@example.com";
        this.appName = process.env.APP_NAME || "Authentik";
    }

    private getTransporter() {
        const host = process.env.SMTP_HOST;
        const port = parseInt(process.env.SMTP_PORT || "587");
        const user = process.env.SMTP_USERNAME;
        const pass = process.env.SMTP_PASSWORD;
        const useTls = process.env.SMTP_USE_TLS === "true";

        if (host && user && pass) {
            return nodemailer.createTransport({
                host,
                port,
                secure: port === 465, // true for 465, false for other ports
                auth: {
                    user,
                    pass,
                },
                tls: {
                    // unexpected certs
                    rejectUnauthorized: !useTls ? false : true,
                },
            });
        }
        return null;
    }

    isConfigured(): boolean {
        // Check env vars directly
        const hasHost = !!process.env.SMTP_HOST;
        const hasUser = !!process.env.SMTP_USERNAME;
        const hasPass = !!process.env.SMTP_PASSWORD;

        const configured = hasHost && hasUser && hasPass;

        if (!configured) {
            console.warn("[EmailService] Check Failed. Environment Variables State:", {
                SMTP_HOST: hasHost ? "Set" : "Missing",
                SMTP_USERNAME: hasUser ? "Set" : "Missing",
                SMTP_PASSWORD: hasPass ? "Set" : "Missing"
            });
        }
        return configured;
    }

    async sendEmail({ to, subject, text, html }: SendEmailParams): Promise<boolean> {
        this.reloadConfig();
        const transporter = this.getTransporter();

        if (!transporter) {
            console.warn("[EmailService] Transporter could not be created. Please check server logs for missing variables.");
            return false;
        }

        try {
            console.log(`[EmailService] Attempting to send email to ${to} via ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
            await transporter.sendMail({
                from: `"${this.appName}" <${this.fromEmail}>`,
                to,
                subject,
                text,
                html,
            });
            console.log(`[EmailService] Email sent successfully to ${to}`);
            return true;
        } catch (error) {
            console.error("[EmailService] Failed to send email:", error);
            throw error;
        }
    }

    /**
     * Replaces template variables in the message body.
     * Supported variables: {{inviter_username}}, {{expiration_date}}, {{invite_url}}
     */
    processTemplate(template: string, variables: TemplateVariables): string {
        let result = template;

        // Replace all known variables
        Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, "g");
            result = result.replace(regex, value);
        });

        return result;
    }
}

export const emailService = new EmailService();
