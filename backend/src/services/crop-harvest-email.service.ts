import * as nodemailer from "nodemailer";

export type CropHarvestEmailKind = "UPCOMING" | "DUE" | "OVERDUE";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error(
      "SMTP_HOST, SMTP_USER, and SMTP_PASS must be configured to send crop reminders.",
    );
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return { client: transporter, from: process.env.SMTP_FROM || user };
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char] || char,
  );
}

export async function sendCropHarvestEmail(input: {
  to: string;
  username: string;
  cropName: string;
  trayName: string;
  rackName: string;
  expectedHarvestDate: Date;
  kind: CropHarvestEmailKind;
}) {
  const { client, from } = getTransporter();
  const date = input.expectedHarvestDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const safeCrop = escapeHtml(input.cropName);
  const safeTray = escapeHtml(input.trayName);
  const safeRack = escapeHtml(input.rackName);

  const subject =
    input.kind === "UPCOMING"
      ? `${input.cropName} is expected to be ready tomorrow`
      : input.kind === "DUE"
        ? `It's harvest day for ${input.cropName}`
        : `Have you harvested your ${input.cropName}?`;
  const headline =
    input.kind === "UPCOMING"
      ? "Harvest day is coming up"
      : input.kind === "DUE"
        ? "Your expected harvest date has arrived"
        : "A quick harvest check-in";
  const message =
    input.kind === "UPCOMING"
      ? "Your crop is expected to be ready within the next 24 hours. Check its growth and prepare to harvest when it is ready."
      : input.kind === "DUE"
        ? "Today is the expected harvest date. Please check your tray and confirm in the app whether you have harvested the crop."
        : "The expected harvest date has passed. Have you harvested this crop? Open the app to confirm, or mark that it is not ready yet.";

  await client.sendMail({
    from,
    to: input.to,
    subject,
    text: `Hi ${input.username || "grower"},\n\n${message}\n\nCrop: ${input.cropName}\nTray: ${input.trayName}\nRack: ${input.rackName}\nExpected harvest: ${date}\n\nOpen AgroMart to update the crop status.`,
    html: `<!doctype html><html><body style="margin:0;background:#f4f6f2;font-family:Arial,sans-serif;color:#172019;padding:24px"><div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e1e8e2;border-radius:18px;padding:28px"><div style="font-size:12px;font-weight:700;letter-spacing:1px;color:#2f7d4e">AGROMART · CROP CARE</div><h1 style="font-size:24px;line-height:1.25;margin:16px 0 10px">${escapeHtml(headline)}</h1><p style="font-size:15px;line-height:1.7;color:#526055">Hi ${escapeHtml(input.username || "grower")}, ${escapeHtml(message)}</p><div style="margin-top:20px;padding:16px;border-radius:12px;background:#f5f7f5"><div style="font-size:18px;font-weight:700">${safeCrop}</div><div style="margin-top:8px;font-size:13px;color:#526055">${safeTray} · ${safeRack}</div><div style="margin-top:8px;font-size:13px;color:#526055">Expected harvest: <strong>${escapeHtml(date)}</strong></div></div><p style="font-size:13px;line-height:1.6;color:#68756b;margin-top:20px">Open the app to confirm the harvest or mark that the crop is not ready yet.</p></div></body></html>`,
  });
}
