"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export type AuthState = {
  error: string | null;
  needsConfirmation?: boolean;
};

function getSafeNextPath(value: string | null | undefined): string {
  if (!value) return "/dashboard";

  if (value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  return "/dashboard";
}

async function getAppOrigin(): Promise<string> {
  const headerStore = await headers();

  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost || headerStore.get("host");

  const forwardedProto = headerStore.get("x-forwarded-proto");

  if (host) {
    const protocol =
      forwardedProto ||
      (host.startsWith("localhost") ? "http" : "https");

    return `${protocol}://${host}`;
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

function createAdminAuthClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export async function signUp(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const name = String(formData.get("name") || "").trim();

  const accountType = String(
    formData.get("accountType") || "subscriber"
  );

  const adminKey = String(formData.get("adminKey") || "");

  const next = getSafeNextPath(
    String(formData.get("next") || "/dashboard")
  );

  if (!email || !password) {
    return {
      error: "Email and password are required.",
    };
  }

  if (accountType !== "subscriber" && accountType !== "admin") {
    return {
      error: "Invalid account type.",
    };
  }

  /*
   * Administrator signup uses the Supabase Admin API so the account can
   * be created with email confirmation already completed.
   *
   * The service-role key never reaches the browser.
   */
  if (accountType === "admin") {
    const expectedAdminKey = process.env.ADMIN_SIGNUP_KEY;

    if (!expectedAdminKey) {
      return {
        error:
          "Admin account creation is not configured on this deployment.",
      };
    }

    if (!adminKey || adminKey !== expectedAdminKey) {
      return {
        error: "Invalid admin setup key.",
      };
    }

    try {
      const adminClient = createAdminAuthClient();

      const { data, error } =
        await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            name,
          },
          app_metadata: {
            role: "admin",
          },
        });

      if (error) {
        return {
          error: error.message,
        };
      }

      if (!data.user) {
        return {
          error: "Admin account could not be created.",
        };
      }
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Admin account creation failed.",
      };
    }

    const supabase = createClient();

    const { error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError) {
      return {
        error: signInError.message,
      };
    }

    redirect(next);
  }

  /*
   * Subscriber signup.
   *
   * The confirmation URL is generated from the actual application host.
   * Therefore:
   *
   * Local:
   *   http://localhost:3000/auth/callback
   *
   * Production:
   *   https://fortune-of-fortune.netlify.app/auth/callback
   *
   * This prevents production confirmation emails from sending users
   * back to localhost.
   */
  const appOrigin = await getAppOrigin();

  const emailRedirectTo =
    `${appOrigin}/auth/callback?next=${encodeURIComponent(next)}`;

  const supabase = createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
      emailRedirectTo,
    },
  });

  if (error) {
    return {
      error: error.message,
    };
  }

  /*
   * If email confirmation is disabled, Supabase gives us a session
   * immediately and we can go directly to the dashboard.
   *
   * If email confirmation is enabled, there is intentionally no session
   * yet. The user receives the confirmation email and is sent through
   * /auth/callback after clicking it.
   */
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return {
      error: null,
      needsConfirmation: true,
    };
  }

  redirect(next);
}

export async function signIn(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  const next = getSafeNextPath(
    String(formData.get("next") || "/dashboard")
  );

  if (!email || !password) {
    return {
      error: "Email and password are required.",
    };
  }

  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error: error.message,
    };
  }

  redirect(next);
}

export async function signOut() {
  const supabase = createClient();

  await supabase.auth.signOut();

  redirect("/login");
}