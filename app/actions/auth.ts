"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export type AuthState = {
  error: string | null;
  needsConfirmation?: boolean;
};

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
  const next = String(formData.get("next") || "/dashboard");

  if (accountType !== "subscriber" && accountType !== "admin") {
    return {
      error: "Invalid account type.",
    };
  }

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

  const supabase = createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  });

  if (error) {
    return {
      error: error.message,
    };
  }

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
  const next = String(formData.get("next") || "/dashboard");

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