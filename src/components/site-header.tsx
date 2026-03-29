"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  match: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
  { label: "Home", href: "/", match: (pathname) => pathname === "/" },
  {
    label: "Buy",
    href: "/buy-property-grid-sidebar",
    match: (pathname) => pathname.startsWith("/buy")
  },
  {
    label: "Rent",
    href: "/rent-property-grid-sidebar",
    match: (pathname) => pathname.startsWith("/rent")
  },
  {
    label: "Contact Us",
    href: "/contact-us",
    match: (pathname) => pathname.startsWith("/contact")
  },
  { label: "About Us", href: "/about-us", match: (pathname) => pathname === "/about-us" }
];

function renderNavLink(item: NavItem) {
  if (item.href.startsWith("javascript:")) {
    return <a href={item.href}>{item.label}</a>;
  }

  return <Link href={item.href}>{item.label}</Link>;
}

function WhatsAppLogo() {
  return <img src="/assets/img/icons/whatsapp-logo.png" alt="WhatsApp" className="header-whatsapp-logo" />;
}

function TextLogo({ dark = false }: { dark?: boolean }) {
  return (
    <span className={`text-logo${dark ? " text-logo-dark-theme" : ""}`} aria-label="91bigha">
      <span className="text-logo-icon" aria-hidden="true">
        <i className="material-icons-outlined">apartment</i>
      </span>
      <span className="text-logo-badge">91</span>
      <span className="text-logo-name">bigha</span>
    </span>
  );
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="header">
      <div className="container">
        <nav className="navbar navbar-expand-lg header-nav">
          <div className="navbar-header">
            <Link href="/" className="navbar-brand logo text-logo-link">
              <TextLogo />
            </Link>
            <Link href="/" className="navbar-brand logo-dark text-logo-link">
              <TextLogo dark />
            </Link>
            <a id="mobile_btn" href="javascript:void(0);">
              <i className="material-icons-outlined">menu</i>
            </a>
          </div>

          <div className="main-menu-wrapper">
            <div className="menu-header">
              <Link href="/" className="menu-logo text-logo-link">
                <TextLogo />
              </Link>
              <Link href="/" className="menu-logo menu-logo-dark text-logo-link">
                <TextLogo dark />
              </Link>
              <a id="menu_close" className="menu-close" href="javascript:void(0);">
                <i className="material-icons-outlined">close</i>
              </a>
            </div>

            <ul className="main-nav">
              {navItems.map((item) => (
                <li key={item.label} className={item.match(pathname) ? "active" : ""}>
                  {renderNavLink(item)}
                </li>
              ))}
            </ul>

            <div className="menu-login">
              <a href="tel:+917302166711" className="btn btn-light w-100 mb-2 d-inline-flex align-items-center justify-content-center gap-1">
                <i className="material-icons-outlined">call</i>
                <span>Call Now</span>
                <span>+91 7302166711</span>
              </a>
              <div className="d-flex align-items-center gap-2">
                <a
                  href="https://wa.me/917302166711"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-success flex-shrink-0 d-inline-flex align-items-center justify-content-center"
                  aria-label="Chat on WhatsApp"
                >
                  <WhatsAppLogo />
                </a>
                <a
                  href="https://wa.me/917302166711"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary w-100"
                >
                  Enquire
                </a>
              </div>
            </div>
          </div>

          <div className="nav header-items align-items-center gap-2">
            <a href="tel:+917302166711" className="btn btn-light d-inline-flex align-items-center gap-1">
              <i className="material-icons-outlined">call</i>
              <span>Call Now</span>
              <span>+91 7302166711</span>
            </a>

            <a
              href="https://wa.me/917302166711"
              target="_blank"
              rel="noreferrer"
              className="topbar-link btn btn-light d-inline-flex align-items-center justify-content-center"
              aria-label="Chat on WhatsApp"
            >
              <WhatsAppLogo />
            </a>

            <a
              href="https://wa.me/917302166711"
              target="_blank"
              rel="noreferrer"
              className="btn btn-lg btn-dark d-inline-flex align-items-center"
            >
              <i className="material-icons-outlined me-1">forum</i>
              Enquire
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}


