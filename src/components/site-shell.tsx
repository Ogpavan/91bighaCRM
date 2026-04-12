import { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="main-wrapper">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
