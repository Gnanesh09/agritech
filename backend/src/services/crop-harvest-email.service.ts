import { sendEmail } from "./email.service";

export type CropHarvestEmailKind = "UPCOMING" | "DUE" | "OVERDUE";

interface CropHarvestEmailInput {
  to: string;
  username: string;
  cropName: string;
  trayName: string;
  rackName: string;
  expectedHarvestDate: Date;
  kind: CropHarvestEmailKind;
}

function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return value.replace(
    /[&<>"']/g,
    (character) => entities[character] ?? character,
  );
}

export async function sendCropHarvestEmail(
  input: CropHarvestEmailInput,
): Promise<void> {
  const date = input.expectedHarvestDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  let subject: string;
  let headline: string;
  let message: string;

  switch (input.kind) {
    case "UPCOMING":
      subject = `${input.cropName} is expected to be ready tomorrow`;
      headline = "Harvest day is coming up";
      message =
        "Your crop is expected to be ready within the next 24 hours. Check its growth and prepare to harvest when it is ready.";
      break;

    case "DUE":
      subject = `It's harvest day for ${input.cropName}`;
      headline = "Your expected harvest date has arrived";
      message =
        "Today is the expected harvest date. Check your tray and confirm the harvest in AgroMart.";
      break;

    case "OVERDUE":
      subject = `Have you harvested your ${input.cropName}?`;
      headline = "A quick harvest check-in";
      message =
        "The expected harvest date has passed. Confirm the harvest in AgroMart, or mark that the crop is not ready yet.";
      break;

    default: {
      const exhaustiveCheck: never = input.kind;
      throw new Error(`Unsupported crop email type: ${exhaustiveCheck}`);
    }
  }

  const username = input.username || "grower";

  const safe = {
    username: escapeHtml(username),
    cropName: escapeHtml(input.cropName),
    trayName: escapeHtml(input.trayName),
    rackName: escapeHtml(input.rackName),
    date: escapeHtml(date),
    message: escapeHtml(message),
    headline: escapeHtml(headline),
  };

  const text = [
    `Hi ${username},`,
    "",
    message,
    "",
    `Crop: ${input.cropName}`,
    `Tray: ${input.trayName}`,
    `Rack: ${input.rackName}`,
    `Expected harvest: ${date}`,
    "",
    "Open AgroMart to update the crop status.",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${safe.headline}</title>
</head>
<body style="margin:0;background:#f4f6f2;font-family:Arial,Helvetica,sans-serif;color:#172019;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e1e8e2;border-radius:18px;overflow:hidden">
    <div style="background:#070A08;padding:24px 28px">
      <div style="font-size:12px;font-weight:700;letter-spacing:1px;color:#C8FF67">
        AGROMART · CROP CARE
      </div>
      <h1 style="font-size:24px;line-height:1.3;margin:16px 0 0;color:#ffffff">
        ${safe.headline}
      </h1>
    </div>

    <div style="padding:28px">
      <p style="font-size:15px;line-height:1.7;color:#526055">
        Hi ${safe.username}, ${safe.message}
      </p>

      <div style="margin-top:20px;padding:18px;border-radius:12px;background:#f5f7f5">
        <div style="font-size:18px;font-weight:700;color:#172019">
          ${safe.cropName}
        </div>
        <div style="margin-top:8px;font-size:13px;color:#526055">
          ${safe.trayName} · ${safe.rackName}
        </div>
        <div style="margin-top:12px;font-size:13px;color:#526055">
          Expected harvest:
          <strong style="color:#172019">${safe.date}</strong>
        </div>
      </div>

      <p style="font-size:13px;line-height:1.7;color:#68756b;margin-top:20px">
        Open AgroMart to confirm the harvest or mark that the crop is not ready yet.
      </p>
    </div>

    <div style="padding:18px 28px;border-top:1px solid #e8ede8;background:#fafcf9">
      <p style="margin:0;font-size:11px;line-height:1.6;color:#788279">
        This is an automated AgroMart crop-care reminder.
      </p>
    </div>
  </div>
</body>
</html>`;

  // Reuse the central email service and its configured Gmail App Password.
  // Errors intentionally bubble up so the scheduler can retry failed sends.
  await sendEmail({
    to: input.to,
    subject,
    text,
    html,
  });

  console.info(
    `[crop-reminders] ${input.kind} email sent through central email service for crop "${input.cropName}".`,
  );
}
