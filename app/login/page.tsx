"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import {
  signIn,
  signUp,
  type AuthState,
} from "@/app/actions/auth";

const initialState: AuthState = {
  error: null,
  needsConfirmation: false,
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded bg-gold text-void font-semibold py-3 mt-2 disabled:opacity-50"
    >
      {pending ? "Please wait…" : label}
    </button>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: {
    next?: string;
    mode?: string;
  };
}) {
  const isSignup = searchParams.mode === "signup";
  const next = searchParams.next || "/dashboard";

  const [accountType, setAccountType] = useState<
    "subscriber" | "admin"
  >("subscriber");

  const [state, formAction] = useFormState<AuthState, FormData>(
    isSignup ? signUp : signIn,
    initialState
  );

  return (
    <div className="min-h-screen flex items-center justify-center relative z-[1] px-5">
      <div className="w-full max-w-sm rounded border border-hairline bg-surface-solid p-8">
        <div className="flex items-center gap-2.5 font-display font-bold mb-8">
          <span className="w-2.5 h-2.5 rounded-full bg-coral shadow-[0_0_10px_#E05A47]" />
          digital.heroes
        </div>

        <h1 className="font-display text-xl mb-6">
          {isSignup ? "Create your account" : "Sign in"}
        </h1>

        <form action={formAction} className="space-y-4">
          <input
            type="hidden"
            name="next"
            value={next}
          />

          {isSignup && (
            <>
              <div>
                <label className="block font-mono text-xs text-muted mb-1.5">
                  Name
                </label>

                <input
                  name="name"
                  required
                  className="w-full rounded bg-void border border-hairline px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block font-mono text-xs text-muted mb-1.5">
                  Account type
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAccountType("subscriber")}
                    className={`rounded border px-3 py-2.5 text-sm transition-colors ${
                      accountType === "subscriber"
                        ? "border-gold text-gold"
                        : "border-hairline text-muted"
                    }`}
                  >
                    Subscriber
                  </button>

                  <button
                    type="button"
                    onClick={() => setAccountType("admin")}
                    className={`rounded border px-3 py-2.5 text-sm transition-colors ${
                      accountType === "admin"
                        ? "border-coral text-coral"
                        : "border-hairline text-muted"
                    }`}
                  >
                    Admin
                  </button>
                </div>

                <input
                  type="hidden"
                  name="accountType"
                  value={accountType}
                />
              </div>

              {accountType === "admin" && (
                <div>
                  <label className="block font-mono text-xs text-muted mb-1.5">
                    Admin setup key
                  </label>

                  <input
                    name="adminKey"
                    type="password"
                    autoComplete="off"
                    required
                    placeholder="Enter admin setup key"
                    className="w-full rounded bg-void border border-hairline px-3 py-2.5 text-sm font-mono"
                  />

                  <p className="text-dim text-xs mt-1.5">
                    Required to create an administrator account.
                  </p>
                </div>
              )}
            </>
          )}

          <div>
            <label className="block font-mono text-xs text-muted mb-1.5">
              Email
            </label>

            <input
              name="email"
              type="email"
              required
              className="w-full rounded bg-void border border-hairline px-3 py-2.5 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block font-mono text-xs text-muted mb-1.5">
              Password
            </label>

            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full rounded bg-void border border-hairline px-3 py-2.5 text-sm font-mono"
            />
          </div>

          {state?.error && (
            <div className="font-mono text-coral text-sm">
              {state.error}
            </div>
          )}

          {state?.needsConfirmation && (
            <div className="font-mono text-gold-glow text-sm">
              Check your email to confirm your account, then sign in.
            </div>
          )}

          <SubmitButton
            label={isSignup ? "Create account" : "Sign in"}
          />
        </form>

        <div className="mt-6 text-sm text-muted">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <Link
                href={`/login?next=${encodeURIComponent(next)}`}
                className="text-gold-glow underline underline-offset-4"
              >
                Sign in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link
                href={`/login?mode=signup&next=${encodeURIComponent(next)}`}
                className="text-gold-glow underline underline-offset-4"
              >
                Create an account
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}