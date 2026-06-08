/**
 * Email Service — Nodemailer + Gmail SMTP
 * Sends verification codes, password resets, and notifications
 */
import { readFileSync } from "fs";
import { join } from "path";
import crypto from "crypto";

// ──── Transporter (lazy-loaded to avoid crashing when nodemailer is missing) ────
let transporter: any = null;
let nodemailerModule: any = null;

async function getTransporter() {
  if (transporter) return transporter;
  try {
    nodemailerModule = await import("nodemailer");
  } catch {
    console.warn("[Email] nodemailer not installed — emails will not be sent");
    return null;
  }

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";

  transporter = nodemailerModule.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user ? { user, pass } : undefined,
  });

  return transporter;
}

// ──── Templates ────
function loadTemplate(
  templateName: string,
  replacements: Record<string, string>
): string {
  try {
    const path = join(import.meta.dirname, "..", "templates", templateName);
    let html = readFileSync(path, "utf-8");
    for (const [key, value] of Object.entries(replacements)) {
      html = html.replaceAll(`{{${key}}}`, value);
    }
    return html;
  } catch {
    // Fallback: simple inline template
    return `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; direction: rtl; text-align: right;">
        <h1 style="color: #1A4F8A;">🚌 دروب</h1>
        <p>${replacements.greeting || "مرحباً"}</p>
        <p>${replacements.body || ""}</p>
        <div style="background: #f0f4f8; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
          <span style="font-size: 28px; font-weight: bold; letter-spacing: 8px; color: #1A4F8A;">${replacements.code || ""}</span>
        </div>
        <p style="color: #64748B; font-size: 12px;">${replacements.disclaimer || "ينتهي هذا الرمز خلال 10 دقائق"}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
        <p style="color: #94A3B8; font-size: 11px;">${replacements.footer || "إذا لم تطلب هذا الرمز، يرجى تجاهل هذا الإيميل."}</p>
      </div>
    `;
  }
}

// ──── Send Verification Code ────
export async function sendVerificationCode(
  email: string,
  code: string,
  lang: "ar" | "en" = "ar"
): Promise<{ success: boolean; error?: string }> {
  const isArabic = lang === "ar";

  const replacements: Record<string, string> = {
    greeting: isArabic ? "مرحباً بك في دروب!" : "Welcome to Droob!",
    body: isArabic
      ? "رمز التحقق الخاص بك هو:"
      : "Your verification code is:",
    code,
    disclaimer: isArabic
      ? "ينتهي هذا الرمز خلال 10 دقائق. لا تشاركه مع أحد."
      : "This code expires in 10 minutes. Do not share it.",
    footer: isArabic
      ? "إذا لم تطلب هذا الرمز، يرجى تجاهل هذا الإيميل."
      : "If you didn't request this code, please ignore this email.",
  };

  const html = loadTemplate("verify-email.html", replacements);

  try {
    const transport = await getTransporter();
    if (!transport) {
      // No transporter available — log code in dev, return success in dev
      if (process.env.NODE_ENV !== "production") {
        console.log(`[Email] DEV MODE — Verification code for ${email}: ${code}`);
      }
      return { success: process.env.NODE_ENV !== "production" };
    }
    await transport.sendMail({
      from: process.env.SMTP_FROM || '"دروب Droob" <noreply@droob.app>',
      to: email,
      subject: isArabic
        ? `رمز التحقق: ${code} — دروب`
        : `Verification Code: ${code} — Droob`,
      html,
    });
    return { success: true };
  } catch (err: any) {
    console.error("[Email] Failed to send:", err.message);
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Email] DEV MODE — Verification code for ${email}: ${code}`);
    }
    return { success: false, error: err.message };
  }
}

// ──── Send Password Reset ────
export async function sendPasswordResetCode(
  email: string,
  code: string,
  lang: "ar" | "en" = "ar"
): Promise<{ success: boolean; error?: string }> {
  const isArabic = lang === "ar";

  const replacements: Record<string, string> = {
    greeting: isArabic ? "إعادة تعيين كلمة المرور" : "Password Reset",
    body: isArabic
      ? "رمز إعادة تعيين كلمة المرور الخاص بك هو:"
      : "Your password reset code is:",
    code,
    disclaimer: isArabic
      ? "ينتهي هذا الرمز خلال 10 دقائق."
      : "This code expires in 10 minutes.",
    footer: isArabic
      ? "إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا الإيميل."
      : "If you didn't request a password reset, please ignore this email.",
  };

  const html = loadTemplate("verify-email.html", replacements);

  try {
    const transport = await getTransporter();
    if (!transport) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[Email] DEV MODE — Reset code for ${email}: ${code}`);
      }
      return { success: process.env.NODE_ENV !== "production" };
    }
    await transport.sendMail({
      from: process.env.SMTP_FROM || '"دروب Droob" <noreply@droob.app>',
      to: email,
      subject: isArabic
        ? `إعادة تعيين كلمة المرور — دروب`
        : `Password Reset — Droob`,
      html,
    });
    return { success: true };
  } catch (err: any) {
    console.error("[Email] Failed to send reset:", err.message);
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Email] DEV MODE — Reset code for ${email}: ${code}`);
    }
    return { success: false, error: err.message };
  }
}

// ──── Generate 6-digit code (cryptographically secure) ────
export function generateVerificationCode(): string {
  const code = crypto.randomInt(100000, 999999);
  return code.toString();
}
