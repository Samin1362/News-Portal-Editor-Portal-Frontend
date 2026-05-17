import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hov?: boolean;
  accent?: boolean;
  children: ReactNode;
}

/**
 * Editorial card — 1.5px ink border, 3px radius, 16px/18px padding.
 * `hov` adds the .card-hov hover lift. `accent` flips the border red.
 */
export function Card({ hov, accent, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-sm border-[1.5px] bg-paper p-4 px-[18px]",
        accent ? "border-accent" : "border-ink",
        hov && "card-hov",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

interface CardHeadProps {
  children: ReactNode;
  className?: string;
}

export function CardHead({ children, className }: CardHeadProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <h3
      className={cn(
        "m-0 font-serif font-extrabold tracking-[-0.01em] text-[16px]",
        className,
      )}
    >
      {children}
    </h3>
  );
}

interface CardMoreLinkProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
}

export function CardMoreLink({ children, href, onClick }: CardMoreLinkProps) {
  const className =
    "font-hand text-[11px] text-accent cursor-pointer hover:underline";
  if (href) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}
