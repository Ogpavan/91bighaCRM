import { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { NavbarEnquiryModal } from "@/components/navbar-enquiry-modal";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="main-wrapper">
      <SiteHeader />
      {children}
      <SiteFooter />
      <NavbarEnquiryModal />
    </div>
  );
}
