import { cn } from "@/lib/utils/cn";
import { initialsFor } from "@/lib/utils/format";

export type AvatarTone = "default" | "red" | "green" | "blue" | "warm";
export type AvatarSize = "sm" | "md" | "lg";

interface AvatarProps {
  name?: string | null;
  initials?: string;
  tone?: AvatarTone;
  size?: AvatarSize;
  className?: string;
}

const TONE: Record<AvatarTone, string> = {
  default: "bg-paper-2",
  red: "bg-accent/15",
  green: "bg-accent-2/20",
  blue: "bg-info/20",
  warm: "bg-[#ede4cf]",
};

const SIZE: Record<AvatarSize, string> = {
  sm: "w-[22px] h-[22px] text-[10px]",
  md: "w-[28px] h-[28px] text-[12px]",
  lg: "w-[38px] h-[38px] text-[14px]",
};

export function Avatar({
  name,
  initials,
  tone = "default",
  size = "md",
  className,
}: AvatarProps) {
  const label = initials ?? initialsFor(name);
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full border-[1.5px] border-ink text-ink",
        "font-hand font-bold shrink-0",
        TONE[tone],
        SIZE[size],
        className,
      )}
      aria-hidden={!name}
    >
      {label}
    </span>
  );
}
