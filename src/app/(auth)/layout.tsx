import type { ReactNode } from "react";

/**
 * Centered card layout for the auth surface. Sits outside the editor route
 * group so the role gate doesn't run on /login itself.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
