"use client";

import { format } from "date-fns";
import { useAuth } from "@/lib/auth/EditorAuthProvider";

interface GreetingProps {
  storiesOnPlate?: number;
}

function firstName(displayName?: string | null): string {
  if (!displayName) return "there";
  const trimmed = displayName.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0]!;
}

function partOfDay(hour: number): string {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function Greeting({ storiesOnPlate }: GreetingProps) {
  const { profile } = useAuth();
  // Capture once per render (read-only display — no impure call inside JSX).
  const now = new Date();
  const pretty = format(now, "EEEE, d MMMM yyyy");
  const part = partOfDay(now.getHours());
  const plate = storiesOnPlate ?? 0;

  return (
    <header className="flex flex-col gap-1">
      <h1 className="font-serif text-[34px] tracking-[-0.02em] font-extrabold leading-[1.1]">
        Good {part}, <span className="uline">{firstName(profile?.displayName)}</span>.
      </h1>
      <p className="font-hand text-[13px] text-muted">
        {pretty} · {plate} {plate === 1 ? "story" : "stories"} on your plate today.
      </p>
    </header>
  );
}
