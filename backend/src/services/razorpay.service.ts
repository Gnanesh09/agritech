import crypto from "node:crypto";

const RAZORPAY_BASE_URL = "https://api.razorpay.com/v1";

function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (!keyId || !keySecret) {
    throw new Error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not configured");
  }

  return { keyId, keySecret };
}

function authHeader(keyId: string, keySecret: string) {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

async function razorpayRequest<T>(path: string, init: RequestInit): Promise<T> {
  const { keyId, keySecret } = getRazorpayCredentials();

  const response = await fetch(`${RAZORPAY_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: authHeader(keyId, keySecret),
      ...(init.headers || {}),
    },
  });

  const raw = await response.text();
  let body: any = {};

  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = { raw };
  }

  if (!response.ok) {
    const message = body?.error?.description || body?.message || raw || "Razorpay API error";
    throw new Error(`Razorpay ${response.status}: ${message}`);
  }

  return body as T;
}

export type RazorpayOrder = {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt?: string;
  status?: string;
};

export type RazorpayPayment = {
  id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  status: string;
  method?: string;
};

export type RazorpayPaymentLink = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  short_url?: string;
  upi_link?: boolean;
};

export async function createRazorpayOrder(args: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}) {
  if (!Number.isSafeInteger(args.amountPaise) || args.amountPaise <= 0) {
    throw new Error("Invalid Razorpay amount");
  }

  return razorpayRequest<RazorpayOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: args.amountPaise,
      currency: "INR",
      receipt: args.receipt.slice(0, 40),
      payment_capture: 1,
      notes: args.notes,
    }),
  });
}

export async function fetchRazorpayPayment(paymentId: string) {
  return razorpayRequest<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}`, {
    method: "GET",
  });
}

export async function createRazorpayUpiPaymentLink(args: {
  amountPaise: number;
  referenceId: string;
  description: string;
  customer: { name: string; email: string; contact: string };
}) {
  return razorpayRequest<RazorpayPaymentLink>("/payment_links", {
    method: "POST",
    body: JSON.stringify({
      upi_link: true,
      amount: args.amountPaise,
      currency: "INR",
      reference_id: args.referenceId.slice(0, 40),
      description: args.description.slice(0, 2048),
      customer: args.customer,
      notify: {
        sms: false,
        email: false,
      },
      reminder_enable: false,
    }),
  });
}

export async function refundRazorpayPayment(args: {
  paymentId: string;
  amountPaise?: number;
  notes?: Record<string, string>;
}) {
  return razorpayRequest<any>(`/payments/${encodeURIComponent(args.paymentId)}/refund`, {
    method: "POST",
    body: JSON.stringify({
      ...(args.amountPaise ? { amount: args.amountPaise } : {}),
      ...(args.notes ? { notes: args.notes } : {}),
    }),
  });
}

export function verifyRazorpayCheckoutSignature(args: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret) throw new Error("RAZORPAY_KEY_SECRET is not configured");

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${args.orderId}|${args.paymentId}`)
    .digest("hex");

  const actual = Buffer.from(args.signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  return (
    actual.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actual, expectedBuffer)
  );
}

export function verifyRazorpayWebhookSignature(rawBody: Buffer, signature: string) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured");

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  const actual = Buffer.from(signature || "", "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  return (
    actual.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actual, expectedBuffer)
  );
}

export function amountToPaise(amount: number) {
  const paise = Math.round(amount * 100);

  if (!Number.isSafeInteger(paise) || paise <= 0) {
    throw new Error("Invalid INR amount");
  }

  return paise;
}
