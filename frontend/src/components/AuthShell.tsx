import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
  legal?: ReactNode;
};

export default function AuthShell({ title, subtitle, children, footer, legal }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen w-full items-center justify-center bg-white p-4 sm:p-5">
        <section className="w-full max-w-sm rounded-sm border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="w-full space-y-4">
            <header className="space-y-1">
              <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
              <p className="text-xs text-gray-500">{subtitle}</p>
            </header>

            {children}

            <footer className="border-t border-gray-200 pt-3 text-xs text-gray-600">{footer}</footer>
          </div>

          {legal ? <div className="pt-4 text-center text-[11px] text-gray-500">{legal}</div> : null}
        </section>
      </div>
    </div>
  );
}
