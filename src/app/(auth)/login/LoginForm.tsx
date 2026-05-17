"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/EditorAuthProvider";
import { useRedirectIfSignedIn } from "@/lib/auth/useRequireEditor";
import { authErrorMessage } from "@/lib/auth/errors";
import { Btn } from "@/components/primitives/Btn";
import { useToast } from "@/lib/ui/toast";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params?.get("redirect") ?? "/";
  const { signIn, signInWithGoogle } = useAuth();
  // Send the user straight to the desk if they're already signed in as
  // editor/admin (e.g. they reopened a tab with a stale `/login` URL).
  useRedirectIfSignedIn(redirectTo);
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  const handleGoogle = async () => {
    setSubmitting(true);
    try {
      await signInWithGoogle();
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
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-[1.5px] border-ink rounded-sm px-2.5 py-2 font-sans text-[14px] outline-none focus:border-accent"
          />
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

      <div className="flex items-center gap-2 my-1">
        <div className="flex-1 h-px bg-ink/20" />
        <span className="font-hand text-[10px] text-muted uppercase tracking-[0.08em]">
          or
        </span>
        <div className="flex-1 h-px bg-ink/20" />
      </div>

      <Btn
        type="button"
        variant="default"
        onClick={handleGoogle}
        disabled={submitting}
      >
        Continue with Google
      </Btn>

      <p className="font-hand text-[11px] text-muted">
        No editor invitation yet? Ask an admin to elevate your role from the
        admin portal — accounts are created on first sign-in via the public
        site.
      </p>
    </div>
  );
}
