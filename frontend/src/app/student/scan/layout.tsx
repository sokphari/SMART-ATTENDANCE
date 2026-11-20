import type { ReactNode } from "react";

/** Student phone check-in deliberately avoids Admin/Teacher AppShell redirects. */
export default function StudentScanLayout({ children }: { children: ReactNode }) {
  return children;
}
