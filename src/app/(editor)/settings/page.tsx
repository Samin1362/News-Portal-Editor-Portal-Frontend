"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth/EditorAuthProvider";
import { useToast } from "@/lib/ui/toast";
import { Card, CardHead, CardTitle } from "@/components/primitives/Card";
import { Avatar } from "@/components/primitives/Avatar";
import { Pill } from "@/components/primitives/Pill";
import { Btn } from "@/components/primitives/Btn";
import { formatDate } from "@/lib/utils/format";

/**
 * Profile + desk preferences (read-only in Phase 3). Editable fields land
 * in Phase 7 alongside the journalist portal's `PATCH /users/me` form.
 */
export default function SettingsPage() {
  const { profile, role, signOut } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign out");
      setSigningOut(false);
    }
  };

  if (!profile) {
    return (
      <div className="font-hand text-[13px] text-muted">Loading profile…</div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-[680px]">
      <header>
        <h1 className="font-serif text-[28px] tracking-[-0.02em] font-extrabold leading-tight">
          <span className="uline">Settings</span>
        </h1>
        <p className="font-hand text-[13px] text-muted mt-1">
          Your account at a glance. Profile editing lands in Phase 7.
        </p>
      </header>

      <Card>
        <CardHead>
          <Avatar
            name={profile.displayName}
            tone={role === "admin" ? "red" : "warm"}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <CardTitle>{profile.displayName}</CardTitle>
            <p className="font-hand text-[12px] text-muted truncate">
              {profile.email}
            </p>
          </div>
          <Pill variant={role === "admin" ? "red" : "solid"}>
            {role ?? "—"}
          </Pill>
        </CardHead>

        <dl className="grid grid-cols-2 gap-3 text-[13px] mt-1">
          <Field label="Display name" value={profile.displayName} />
          <Field label="Email" value={profile.email} />
          <Field label="Role" value={role ?? "—"} />
          <Field
            label="Member since"
            value={formatDate(profile.createdAt)}
          />
          <Field
            label="Last sign-in"
            value={formatDate(profile.lastLoginAt, true)}
          />
          <Field
            label="Status"
            value={profile.isBlocked ? "Blocked" : "Active"}
          />
        </dl>

        {profile.bio ? (
          <div className="mt-2">
            <p className="font-hand text-[11px] uppercase tracking-[0.08em] text-muted">
              Bio
            </p>
            <p className="font-serif text-[14px] leading-snug mt-1">
              {profile.bio}
            </p>
          </div>
        ) : null}
      </Card>

      <Card>
        <CardHead>
          <CardTitle>Session</CardTitle>
        </CardHead>
        <p className="font-hand text-[12.5px] text-muted">
          Signing out clears your Firebase session in this browser. You&apos;ll
          be bounced back to the login page; the role gate keeps the editor
          surface locked until you sign in again.
        </p>
        <div className="flex">
          <Btn
            variant="primary"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            <LogOut size={13} /> {signingOut ? "Signing out…" : "Sign out"}
          </Btn>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="font-hand text-[11px] uppercase tracking-[0.08em] text-muted">
        {label}
      </dt>
      <dd className="font-sans text-[13px] text-ink truncate" title={value}>
        {value}
      </dd>
    </div>
  );
}
