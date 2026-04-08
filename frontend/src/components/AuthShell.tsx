import type { ReactNode } from "react";
import { useAppSettings } from "@/components/AppSettingsContext";
import { resolveApiAssetUrl } from "@/api/api";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
  legal?: ReactNode;
};

export default function AuthShell({ title, subtitle, children, footer, legal }: AuthShellProps) {
  const { settings } = useAppSettings();
  const appName = settings.app_name?.trim() || "Sarwe Crm";
  const logoUrl = resolveApiAssetUrl(settings.brand_logo_url);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen w-full overflow-hidden bg-white md:grid-cols-2">
        <aside
          className="hidden border-r border-gray-200 p-6 text-white md:flex md:flex-col md:justify-between"
          style={{ background: "linear-gradient(to bottom, var(--brand-primary), color-mix(in srgb, var(--brand-primary) 82%, black))" }}
        >
          <div>
            <div className="inline-flex items-center gap-3 rounded-sm border border-blue-300/30 bg-white/10 px-3 py-1 text-sm font-semibold tracking-[0.12em] text-white">
              {logoUrl ? <img src={logoUrl} alt={appName} className="h-7 w-7 rounded-sm object-contain" /> : null}
              <span>{appName}</span>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-100">Tenant Ops</p>
            <h1 className="mt-3 text-2xl font-semibold leading-tight">Manage your CRM workflows with clarity and speed.</h1>
            <p className="mt-3 max-w-sm text-sm text-blue-100">
              Secure access, analytics visibility, and tenant health monitoring in one Atlassian-inspired workspace.
            </p>
          </div>

          <div className="my-6 flex flex-1 items-center justify-center">
            <div className="rounded-sm border border-white/20 bg-white/10 px-8 py-10 text-center shadow-xl backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.22em] text-blue-100">Workspace</p>
              <p className="mt-3 text-4xl font-semibold tracking-[0.14em] text-white">{appName}</p>
              <p className="mt-3 text-sm text-blue-100">Sales workflows, task execution, and reporting in one place.</p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-blue-100">
            <p className="rounded-sm border border-blue-400/30 bg-blue-500/20 p-2">Built for team collaboration and secure access control.</p>
            <p className="rounded-sm border border-blue-400/30 bg-blue-500/20 p-2">Role-based workflows with clear operational visibility.</p>
          </div>
        </aside>

        <section className="min-h-screen p-4 sm:p-5">
          <div className="mx-auto flex h-full w-full max-w-sm flex-col">
            <div className="flex flex-1 items-center">
              <div className="w-full space-y-4">
                <header className="space-y-1">
                  <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
                  <p className="text-xs text-gray-500">{subtitle}</p>
                </header>

                {children}

                <footer className="border-t border-gray-200 pt-3 text-xs text-gray-600">{footer}</footer>
              </div>
            </div>

            {legal ? <div className="pb-1 text-center text-[11px] text-gray-500">{legal}</div> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
