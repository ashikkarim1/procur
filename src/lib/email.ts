import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload) {
  try {
    const result = await resend.emails.send({
      from: 'noreply@procur.tech',
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });
    if (result.error) throw result.error;
    return { success: true, messageId: result.data?.id };
  } catch (err) {
    console.error('Email send failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export function inviteMemberEmail(to: string, orgName: string, inviterName: string, inviteLink: string) {
  return {
    to,
    subject: `Join ${orgName} on Procur`,
    html: `<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1c1a17;">
      <h2 style="color: #17545e;">Join ${orgName} on Procur</h2>
      <p>${inviterName} invited you to collaborate on software procurement.</p>
      <p style="margin: 30px 0;">
        <a href="${inviteLink}" style="display: inline-block; background: #17545e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Accept invitation →</a>
      </p>
      <p style="color: #6b6760; font-size: 12px;">This invitation expires in 7 days. If you didn't expect this, you can ignore it.</p>
    </body></html>`,
  };
}

export function notificationEmail(to: string, subject: string, message: string) {
  return {
    to,
    subject,
    html: `<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1c1a17;">
      <h2 style="color: #17545e;">Procur Alert</h2>
      <p>${message}</p>
      <p style="color: #6b6760; font-size: 12px; margin-top: 30px;">
        Manage your notifications at <a href="https://procur.tech/settings" style="color: #17545e;">Settings</a>
      </p>
    </body></html>`,
  };
}
