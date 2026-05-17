"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/EditorAuthProvider";
import { Btn } from "@/components/primitives/Btn";

/**
 * Shown when a signed-in user lands here without editor/admin privileges.
 * The message + secondary CTA depend on their current role so the page is
 * useful for both readers and journalists who took a wrong turn.
 */
export default function AccessDeniedPage() {
  const router = useRouter();
  const { role, profile, signOut } = useAuth();

  let reason = "Your account doesn't have access to the editor desk.";
  if (role === "reader") {
    reason =
      "Readers don't have desk access. Sign in with an editor account, or head back to the public site.";
  } else if (role === "journalist") {
    reason =
      "Journalists use the writer dashboard, not the editor desk. If you need editor access, ask an admin to elevate your role.";
  }

  const handleSwitchAccount = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md border-[1.5px] border-ink rounded-sm bg-paper px-6 py-7 flex flex-col gap-5">
        <div>
          <div className="font-hand text-[11px] uppercase tracking-[0.12em] text-accent">
            403 · access denied
          </div>
          <h1 className="m-0 font-serif font-extrabold text-[26px] tracking-[-0.02em] mt-2">
            <span className="uline">Not your desk.</span>
          </h1>
          <p className="font-sans text-[14px] text-ink mt-3">{reason}</p>
        </div>

        {profile && (
          <div className="font-hand text-[12px] text-muted border-[1.5px] border-ink/20 rounded-sm px-3 py-2 bg-paper-2">
            Signed in as <b className="text-ink">{profile.displayName}</b> ·{" "}
            <b className="text-ink">{profile.email}</b> · role{" "}
            <b className="text-ink">{profile.role}</b>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <Btn variant="primary" type="button" onClick={handleSwitchAccount}>
            Sign in as different user
          </Btn>
          <Btn
            variant="ghost"
            type="button"
            onClick={() => {
              const site = process.env.NEXT_PUBLIC_SITE_URL;
              if (site) window.location.href = site;
              else router.replace("/");
            }}
          >
            Back to public site
          </Btn>
        </div>
      </div>
    </div>
  );
}
