"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth/EditorAuthProvider";
import { useRedirectIfSignedIn } from "@/lib/auth/useRequireEditor";
import { authErrorMessage } from "@/lib/auth/errors";
import { Btn } from "@/components/primitives/Btn";
import { useToast } from "@/lib/ui/toast";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params?.get("redirect") ?? "/";
  const { signIn } = useAuth();
  // Send the user straight to the desk if they're already signed in as
  // editor/admin (e.g. they reopened a tab with a stale `/login` URL).
  useRedirectIfSignedIn(redirectTo);
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email, password);
      // The role gate on `(editor)/layout.tsx` will bounce to /access-denied
      // if the signed-in profile isn't editor/admin.
      router.replace(redirectTo);
    } catch (err) {
      toast.error(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border-[1.5px] border-ink rounded-sm bg-paper px-6 py-7 flex flex-col gap-5">
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-serif font-extrabold text-[28px] tracking-[-0.02em]">
            Deligo
          </span>
          <span className="font-hand text-[12px] text-accent">· editor</span>
        </div>
        <p className="font-hand text-[13px] text-muted mt-1">
          Sign in to your editorial desk.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-hand text-[11px] uppercase tracking-[0.08em] text-muted">
            Email
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-[1.5px] border-ink rounded-sm px-2.5 py-2 font-sans text-[14px] outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-hand text-[11px] uppercase tracking-[0.08em] text-muted">
            Password
          </span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-[1.5px] border-ink rounded-sm pl-2.5 pr-10 py-2 font-sans text-[14px] outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex items-center justify-center w-9 text-muted hover:text-ink focus:outline-none focus:ring-2 focus:ring-accent/40 rounded-sm"
              tabIndex={0}
            >
              {showPassword ? (
                <EyeOff size={16} aria-hidden />
              ) : (
                <Eye size={16} aria-hidden />
              )}
            </button>
          </div>
        </label>
        <Btn
          type="submit"
          variant="primary"
          disabled={submitting}
          className="mt-2"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </Btn>
      </form>

      <p className="font-hand text-[11px] text-muted">
        No editor invitation yet? Ask an admin to elevate your role from the
        admin portal — accounts are created on first sign-in via the public
        site.
      </p>
    </div>
  );
}
