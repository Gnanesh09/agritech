import "dotenv/config";
import nodemailer from "nodemailer";

/**
 * Central AgriTech email service.
 *
 * Configure these variables in the BACKEND .env (never in the Expo app):
 *   GOOGLE_USER=your-sender@gmail.com
 *   GOOGLE_APP_PASSWORD=your-16-character-google-app-password
 *   EMAIL_FROM_NAME=AgriTech          # optional
 *
 * This module uses Gmail App Password authentication. It deliberately does not
 * swallow errors: callers can report failed email delivery and avoid pretending
 * that an OTP or notification was sent when SMTP rejected it.
 */

const FROM_NAME = process.env.EMAIL_FROM_NAME?.trim() || "AgriTech";
const BRAND_DARK = "#070A08";
const BRAND_GREEN = "#06C261";
const PAGE_BG = "#EEF2ED";
const BODY_TEXT = "#253229";
const MUTED_TEXT = "#68756C";

let transporter: ReturnType<typeof nodemailer.createTransport> | undefined;

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.GOOGLE_USER?.trim();
  // Google sometimes displays App Passwords with spaces. Remove them safely.
  const pass = process.env.GOOGLE_APP_PASSWORD?.replace(/\s+/g, "");

  if (!user || !pass) {
    throw new Error(
      "Email is not configured. Set GOOGLE_USER and GOOGLE_APP_PASSWORD in the backend .env file.",
    );
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  return transporter;
}

function getSender() {
  const user = process.env.GOOGLE_USER?.trim();
  if (!user) {
    throw new Error(
      "Email is not configured. Set GOOGLE_USER in the backend .env file.",
    );
  }
  return `"${FROM_NAME.replace(/[\r\n"]/g, "")}" <${user}>`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}

function safeHttpUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}

interface EmailShellOptions {
  preheader: string;
  category: string;
  title: string;
  intro: string;
  contentHtml: string;
  footerNote?: string;
}

/** Shared responsive, table-based layout supported by common email clients. */
function emailShell({
  preheader,
  category,
  title,
  intro,
  contentHtml,
  footerNote = "This is an automated email. Please do not reply to this message.",
}: EmailShellOptions): string {
  const year = new Date().getFullYear();
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${PAGE_BG};font-family:Arial,Helvetica,sans-serif;color:${BODY_TEXT};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PAGE_BG};padding:28px 12px;margin:0;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:580px;background:#ffffff;border-radius:20px;overflow:hidden;">
        <tr><td style="background:${BRAND_DARK};padding:26px 30px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
            <td valign="middle"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td width="42" height="42" align="center" valign="middle" style="width:42px;height:42px;border-radius:13px;background:${BRAND_GREEN};color:#061009;font-size:22px;font-weight:bold;">A</td>
              <td style="padding-left:12px;color:#ffffff;font-size:18px;font-weight:bold;letter-spacing:.2px;">${escapeHtml(FROM_NAME)}</td>
            </tr></table></td>
            <td align="right" valign="middle" style="color:#aab5ac;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;">${escapeHtml(category)}</td>
          </tr></table>
          <div style="padding-top:28px;color:${BRAND_GREEN};font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">${escapeHtml(category)}</div>
          <div style="padding-top:9px;color:#ffffff;font-size:28px;line-height:36px;font-weight:bold;letter-spacing:-.5px;">${escapeHtml(title)}</div>
          <div style="padding-top:10px;color:#b4beb6;font-size:14px;line-height:23px;">${escapeHtml(intro)}</div>
        </td></tr>
        <tr><td style="padding:28px 30px 30px;">${contentHtml}</td></tr>
        <tr><td style="border-top:1px solid #e8ede8;background:#fafcf9;padding:20px 30px 24px;">
          <div style="color:#788279;font-size:11px;line-height:18px;">${escapeHtml(footerNote)}</div>
          <div style="padding-top:7px;color:#a0aaa1;font-size:11px;line-height:17px;">&copy; ${year} ${escapeHtml(FROM_NAME)}. Keep your account safe.</div>
        </td></tr>
      </table>
      <div style="max-width:520px;padding:16px 8px 0;color:#8c978e;font-size:10px;line-height:16px;text-align:center;">If you have concerns about this message, open the app directly rather than sharing personal information by email.</div>
    </td></tr>
  </table>
</body>
</html>`;
}

function detailRow(label: string, value: unknown): string {
  return `<tr>
    <td style="padding:11px 12px;border-bottom:1px solid #e8ede8;color:${MUTED_TEXT};font-size:12px;">${escapeHtml(label)}</td>
    <td align="right" style="padding:11px 12px;border-bottom:1px solid #e8ede8;color:${BODY_TEXT};font-size:13px;font-weight:bold;">${escapeHtml(value)}</td>
  </tr>`;
}

function detailsCard(rows: Array<{ label: string; value: unknown }>): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e2e9e2;border-radius:12px;background:#fbfdfb;overflow:hidden;">
    ${rows.map((row) => detailRow(row.label, row.value)).join("")}
  </table>`;
}

function buttonHtml(label: string, url?: string): string {
  const safeUrl = safeHttpUrl(url);
  if (!safeUrl) return "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;"><tr><td align="center" bgcolor="${BRAND_GREEN}" style="border-radius:10px;">
    <a href="${escapeHtml(safeUrl)}" style="display:inline-block;padding:13px 20px;color:#061009;text-decoration:none;font-size:13px;font-weight:bold;">${escapeHtml(label)}</a>
  </td></tr></table>`;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}

/** Generic low-level sender for any future email type. Throws on delivery failure. */
export async function sendEmail(options: SendEmailOptions): Promise<void>;
/** Backwards-compatible overload for the previous sendEmail(to, subject, text, html) signature. */
export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html: string,
): Promise<void>;
export async function sendEmail(
  optionsOrTo: SendEmailOptions | string,
  subject?: string,
  text?: string,
  html?: string,
): Promise<void> {
  const options: SendEmailOptions =
    typeof optionsOrTo === "string"
      ? {
          to: optionsOrTo,
          subject: subject ?? "AgriTech notification",
          text: text ?? "You have a new notification from AgriTech.",
          html: html ?? "",
        }
      : optionsOrTo;

  if (!options.to || !options.subject || !options.text || !options.html) {
    throw new Error(
      "Email requires recipient, subject, text, and HTML content.",
    );
  }

  const info = await getTransporter().sendMail({
    from: getSender(),
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    ...(options.replyTo ? { replyTo: options.replyTo } : {}),
  });

  console.info(
    `[email] Accepted by SMTP: ${info.messageId} (${options.subject})`,
  );
}

/** Run on server startup or from a health-check to verify SMTP credentials. */
export async function verifyEmailTransport(): Promise<void> {
  await getTransporter().verify();
  console.info("Email server is ready to send messages.");
}

// Verify once on backend startup. Failure is logged, not allowed to crash the API.
void verifyEmailTransport().catch((error) => {
  console.error("Email transporter verification failed:", error);
});

/** OTP HTML export retained for any existing code that still imports getOtpHtml. */
export function getOtpHtml(otp: string): string {
  const safeOtp = escapeHtml(otp);
  return emailShell({
    preheader:
      "Your AgriTech verification code is inside. Never share it with anyone.",
    category: "Account security",
    title: "Let’s verify it’s you.",
    intro:
      "Enter the verification code below to finish setting up your AgriTech account.",
    contentHtml: `
      <div style="color:#536057;font-size:12px;line-height:20px;letter-spacing:.5px;">YOUR VERIFICATION CODE</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:12px;"><tr>
        <td align="center" style="background:#f3f8f3;border:1px solid #dce9dd;border-radius:14px;padding:22px 12px;">
          <div style="font-family:'Courier New',Courier,monospace;font-size:32px;line-height:42px;font-weight:bold;letter-spacing:8px;color:#08783e;">${safeOtp}</div>
        </td>
      </tr></table>
      <p style="margin:17px 0 0;color:${MUTED_TEXT};font-size:13px;line-height:21px;">Enter this code in the verification screen in your AgriTech app.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:22px;background:#fff8e9;border:1px solid #f2dfb5;border-radius:12px;"><tr>
        <td valign="top" style="padding:15px 0 15px 15px;color:#9a6414;font-size:18px;">&#9888;</td>
        <td style="padding:15px 15px 15px 8px;"><div style="color:#704a10;font-size:13px;font-weight:bold;line-height:19px;">Security reminder — don’t share your OTP</div>
        <div style="padding-top:4px;color:#795f35;font-size:12px;line-height:19px;">AgriTech will never ask you to tell us this code over a call, message, or email. Anyone asking for it may be trying to access your account.</div></td>
      </tr></table>
      <p style="margin:20px 0 0;color:${MUTED_TEXT};font-size:12px;line-height:19px;">Didn’t request this code? You can safely ignore this email. Your email will not be verified unless the code is entered in the app.</p>`,
    footerNote:
      "This is an automated security email. Please do not reply. For your safety, never forward verification codes or screenshots of this email.",
  });
}

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  await sendEmail({
    to,
    subject: "Verify your AgriTech email",
    text: `Your AgriTech verification code is ${otp}. Enter it in the app to verify your email. Never share this code with anyone. If you did not request it, ignore this email.`,
    html: getOtpHtml(otp),
  });
}

export async function sendPasswordResetCodeEmail(
  to: string,
  code: string,
): Promise<void> {
  const html = emailShell({
    preheader: "Use this code to reset your AgriTech password. Never share it.",
    category: "Account security",
    title: "Reset your password.",
    intro:
      "We received a request to reset the password for your AgriTech account.",
    contentHtml: `<div style="color:${MUTED_TEXT};font-size:12px;">YOUR PASSWORD RESET CODE</div>
      <div style="margin-top:12px;padding:22px 12px;text-align:center;background:#f3f8f3;border:1px solid #dce9dd;border-radius:14px;font-family:'Courier New',Courier,monospace;font-size:30px;line-height:40px;font-weight:bold;letter-spacing:7px;color:#08783e;">${escapeHtml(code)}</div>
      <p style="margin:18px 0 0;color:${MUTED_TEXT};font-size:13px;line-height:21px;">Enter this code only in the password reset screen in the app.</p>
      <div style="margin-top:20px;padding:15px;border:1px solid #f2dfb5;border-radius:12px;background:#fff8e9;color:#795f35;font-size:12px;line-height:19px;"><strong>Never share this code.</strong> AgriTech will never ask you to tell it to a person. If you did not request a reset, ignore this message and secure your account if needed.</div>`,
  });

  await sendEmail({
    to,
    subject: "Your AgriTech password reset code",
    text: `Your password reset code is ${code}. Never share it. If you did not request a reset, ignore this email.`,
    html,
  });
}

export async function sendWelcomeEmail(
  to: string,
  name?: string,
): Promise<void> {
  const greeting = name?.trim()
    ? `Welcome, ${name.trim()}!`
    : "Welcome to AgriTech!";
  const html = emailShell({
    preheader: "Your AgriTech account is verified and ready to use.",
    category: "Account update",
    title: greeting,
    intro: "Your email has been verified and your AgriTech account is ready.",
    contentHtml: `<p style="margin:0;color:${BODY_TEXT};font-size:14px;line-height:23px;">You can now sign in, manage your growing activity, and explore the AgriTech marketplace.</p>
      <div style="margin-top:20px;padding:15px;border:1px solid #dce9dd;border-radius:12px;background:#f3f8f3;color:#42624b;font-size:12px;line-height:20px;">Keep your password private and make sure you are using the official app when signing in.</div>`,
  });
  await sendEmail({
    to,
    subject: "Welcome to AgriTech",
    text: `${greeting} Your AgriTech account is verified and ready to use.`,
    html,
  });
}

export interface NewMarketplaceOrderEmail {
  to: string;
  sellerName?: string;
  buyerName: string;
  orderId: string;
  cropName: string;
  quantity: string;
  totalAmount?: string;
}

export async function sendNewMarketplaceOrderEmail(
  details: NewMarketplaceOrderEmail,
): Promise<void> {
  const rows = [
    { label: "Order ID", value: details.orderId },
    { label: "Crop / product", value: details.cropName },
    { label: "Quantity", value: details.quantity },
    { label: "Buyer", value: details.buyerName },
    ...(details.totalAmount
      ? [{ label: "Order total", value: details.totalAmount }]
      : []),
  ];
  const greeting = details.sellerName?.trim()
    ? `Hi ${details.sellerName.trim()},`
    : "You have a new order.";
  const html = emailShell({
    preheader: `New marketplace order ${details.orderId}`,
    category: "Marketplace",
    title: "You have a new order.",
    intro: `${greeting} A customer has placed an order through the AgriTech marketplace.`,
    contentHtml: `${detailsCard(rows)}<p style="margin:18px 0 0;color:${MUTED_TEXT};font-size:12px;line-height:20px;">Open the AgriTech app to review the order and manage its status.</p>`,
  });
  await sendEmail({
    to: details.to,
    subject: `New AgriTech marketplace order · ${details.orderId}`,
    text: `New order ${details.orderId}. Product: ${details.cropName}. Quantity: ${details.quantity}. Buyer: ${details.buyerName}${details.totalAmount ? `. Total: ${details.totalAmount}` : ""}. Open the AgriTech app to review it.`,
    html,
  });
}

export interface MarketplaceOrderStatusEmail {
  to: string;
  recipientName?: string;
  orderId: string;
  status: string;
  message?: string;
}

export async function sendMarketplaceOrderStatusEmail(
  details: MarketplaceOrderStatusEmail,
): Promise<void> {
  const greeting = details.recipientName?.trim()
    ? `Hi ${details.recipientName.trim()},`
    : "Hello,";
  const status = details.status.trim();
  const html = emailShell({
    preheader: `Order ${details.orderId} update: ${status}`,
    category: "Marketplace update",
    title: "Your order has been updated.",
    intro: `${greeting} There is a new update for your AgriTech marketplace order.`,
    contentHtml: `${detailsCard([
      { label: "Order ID", value: details.orderId },
      { label: "Current status", value: status },
    ])}${details.message ? `<p style="margin:18px 0 0;color:${BODY_TEXT};font-size:13px;line-height:22px;">${escapeHtml(details.message)}</p>` : ""}<p style="margin:18px 0 0;color:${MUTED_TEXT};font-size:12px;line-height:20px;">For the latest information, check the order details in the AgriTech app.</p>`,
  });
  await sendEmail({
    to: details.to,
    subject: `AgriTech order update · ${status}`,
    text: `Order ${details.orderId} status: ${status}.${details.message ? ` ${details.message}` : ""} Check the AgriTech app for details.`,
    html,
  });
}

export interface DeliveryUpdateEmail {
  to: string;
  recipientName?: string;
  orderId: string;
  update: string;
  eta?: string;
}

export async function sendDeliveryUpdateEmail(
  details: DeliveryUpdateEmail,
): Promise<void> {
  const greeting = details.recipientName?.trim()
    ? `Hi ${details.recipientName.trim()},`
    : "Hello,";
  const html = emailShell({
    preheader: `Delivery update for order ${details.orderId}`,
    category: "Delivery update",
    title: "A delivery update for you.",
    intro: `${greeting} There is new information about your AgriTech order delivery.`,
    contentHtml: `${detailsCard([
      { label: "Order ID", value: details.orderId },
      { label: "Update", value: details.update },
      ...(details.eta
        ? [{ label: "Estimated arrival", value: details.eta }]
        : []),
    ])}<p style="margin:18px 0 0;color:${MUTED_TEXT};font-size:12px;line-height:20px;">Open the AgriTech app for the latest delivery information.</p>`,
  });
  await sendEmail({
    to: details.to,
    subject: `AgriTech delivery update · ${details.orderId}`,
    text: `Delivery update for order ${details.orderId}: ${details.update}${details.eta ? `. Estimated arrival: ${details.eta}` : ""}.`,
    html,
  });
}

export interface SecurityAlertEmail {
  to: string;
  recipientName?: string;
  activity: string;
  occurredAt?: string;
}

export async function sendSecurityAlertEmail(
  details: SecurityAlertEmail,
): Promise<void> {
  const greeting = details.recipientName?.trim()
    ? `Hi ${details.recipientName.trim()},`
    : "Hello,";
  const html = emailShell({
    preheader: "A security-related change occurred on your AgriTech account.",
    category: "Account security",
    title: "Security alert.",
    intro: `${greeting} We want to let you know about activity related to your account.`,
    contentHtml: `${detailsCard([
      { label: "Activity", value: details.activity },
      ...(details.occurredAt
        ? [{ label: "Time", value: details.occurredAt }]
        : []),
    ])}<div style="margin-top:20px;padding:15px;border:1px solid #f2dfb5;border-radius:12px;background:#fff8e9;color:#795f35;font-size:12px;line-height:20px;">If you do not recognize this activity, open the AgriTech app directly and secure your account. Never send your password or OTP in reply to an email.</div>`,
  });
  await sendEmail({
    to: details.to,
    subject: "AgriTech account security alert",
    text: `Security alert: ${details.activity}${details.occurredAt ? ` at ${details.occurredAt}` : ""}. If you do not recognize this activity, open the AgriTech app directly and secure your account.`,
    html,
  });
}

export interface GenericNotificationEmail {
  to: string | string[];
  subject: string;
  title: string;
  message: string;
  preheader?: string;
  category?: string;
  actionLabel?: string;
  actionUrl?: string;
}

/** Generic branded message for future reminders, promotions, or app notifications. */
export async function sendNotificationEmail(
  details: GenericNotificationEmail,
): Promise<void> {
  const html = emailShell({
    preheader: details.preheader || details.message,
    category: details.category || "Notification",
    title: details.title,
    intro: details.message,
    contentHtml: `<p style="margin:0;color:${BODY_TEXT};font-size:14px;line-height:23px;">${escapeHtml(details.message)}</p>${buttonHtml(details.actionLabel || "Open AgriTech", details.actionUrl)}`,
  });
  await sendEmail({
    to: details.to,
    subject: details.subject,
    text: `${details.title}\n\n${details.message}${details.actionUrl && safeHttpUrl(details.actionUrl) ? `\n\n${details.actionLabel || "Open AgriTech"}: ${details.actionUrl}` : ""}`,
    html,
  });
}
