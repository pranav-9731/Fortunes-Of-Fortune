import crypto from "crypto";

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

function cleanEnvValue(value: string | undefined) {
  if (!value) return "";

  return value
    .trim()
    .replace(/^['"]/, "")
    .replace(/['"]$/, "")
    .trim();
}

function readRazorpayKeyId() {
  const keyId = cleanEnvValue(
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  );

  if (!keyId) {
    throw new Error(
      "NEXT_PUBLIC_RAZORPAY_KEY_ID is not configured."
    );
  }

  if (!keyId.startsWith("rzp_")) {
    throw new Error(
      "NEXT_PUBLIC_RAZORPAY_KEY_ID is invalid."
    );
  }

  return keyId;
}

function getRazorpayKeySecret() {
  const keySecret = cleanEnvValue(
    process.env.RAZORPAY_KEY_SECRET
  );

  if (!keySecret) {
    throw new Error(
      "RAZORPAY_KEY_SECRET is not configured."
    );
  }

  return keySecret;
}

export function getRazorpayKeyId() {
  return readRazorpayKeyId();
}

export function getRazorpayPlanId(
  plan: "monthly" | "yearly"
) {
  const planId = cleanEnvValue(
    plan === "monthly"
      ? process.env.RAZORPAY_MONTHLY_PLAN_ID
      : process.env.RAZORPAY_YEARLY_PLAN_ID
  );

  if (!planId) {
    throw new Error(
      plan === "monthly"
        ? "RAZORPAY_MONTHLY_PLAN_ID is not configured."
        : "RAZORPAY_YEARLY_PLAN_ID is not configured."
    );
  }

  if (!planId.startsWith("plan_")) {
    throw new Error(
      `Invalid Razorpay ${plan} plan ID.`
    );
  }

  return planId;
}

export async function razorpayRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH";
    body?: unknown;
  } = {}
): Promise<T> {
  const keyId = readRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();

  const auth = Buffer.from(
    `${keyId}:${keySecret}`,
    "utf8"
  ).toString("base64");

  const response = await fetch(
    `${RAZORPAY_API_BASE}${path}`,
    {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
        ...(options.body !== undefined
          ? {
              "Content-Type": "application/json",
            }
          : {}),
      },
      body:
        options.body !== undefined
          ? JSON.stringify(options.body)
          : undefined,
      cache: "no-store",
    }
  );

  const data = (await response.json()) as T & {
    error?: {
      code?: string;
      description?: string;
      reason?: string;
      source?: string;
      step?: string;
    };
  };

  if (!response.ok) {
    const description =
      data?.error?.description ||
      data?.error?.reason ||
      `Razorpay request failed with status ${response.status}.`;

    throw new Error(description);
  }

  return data;
}

export function getAppOrigin(
  headers: {
    get(name: string): string | null;
  }
) {
  const forwardedHost =
    headers.get("x-forwarded-host");

  const host =
    forwardedHost || headers.get("host");

  const forwardedProto =
    headers.get("x-forwarded-proto");

  if (host) {
    const protocol =
      forwardedProto ||
      (host.startsWith("localhost")
        ? "http"
        : "https");

    return `${protocol}://${host}`;
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(
      /\/$/,
      ""
    );
  }

  return "http://localhost:3000";
}

export function verifyRazorpaySubscriptionSignature(
  paymentId: string,
  subscriptionId: string,
  signature: string
) {
  const expected = crypto
    .createHmac("sha256", getRazorpayKeySecret())
    .update(`${paymentId}|${subscriptionId}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(
    expected,
    "utf8"
  );

  const signatureBuffer = Buffer.from(
    signature,
    "utf8"
  );

  if (
    expectedBuffer.length !==
    signatureBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    expectedBuffer as unknown as Uint8Array,
    signatureBuffer as unknown as Uint8Array
  );
}

export function verifyRazorpayWebhookSignature(
  payload: string,
  signature: string
) {
  const webhookSecret = cleanEnvValue(
    process.env.RAZORPAY_WEBHOOK_SECRET
  );

  if (!webhookSecret) {
    throw new Error(
      "RAZORPAY_WEBHOOK_SECRET is not configured."
    );
  }

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(payload)
    .digest("hex");

  const expectedBuffer = Buffer.from(
    expected,
    "utf8"
  );

  const signatureBuffer = Buffer.from(
    signature,
    "utf8"
  );

  if (
    expectedBuffer.length !==
    signatureBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    expectedBuffer as unknown as Uint8Array,
    signatureBuffer as unknown as Uint8Array
  );
}