import React from "react";
import { NavLink } from "react-router-dom";
import {
  FaChartLine,
  FaCog,
  FaFolderOpen,
  FaLayerGroup,
  FaTasks,
  FaTachometerAlt,
  FaThLarge,
  FaUserFriends,
  FaUsers,
  FaUserTie
} from "react-icons/fa";
import { X } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { useAppSettings } from "@/components/AppSettingsContext";
import { Button } from "@/components/ui/button";
import { resolveApiAssetUrl } from "@/api/api";
import { cn } from "@/lib/utils";

type SidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

type NavItem = {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  permission?: string;
  featureKey?: "feature_leads" | "feature_tasks" | "feature_users" | "feature_teams" | "feature_reports";
};

const navItems: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: FaTachometerAlt, end: true, permission: "view_dashboard" },
  { label: "Leads", to: "/leads", icon: FaUserTie, permission: "view_leads", featureKey: "feature_leads" },
  { label: "My Tasks", to: "/my-tasks", icon: FaTasks, permission: "view_tasks", featureKey: "feature_tasks" },
  { label: "All Tasks", to: "/tasks", icon: FaTasks, permission: "view_tasks", featureKey: "feature_tasks" },
  { label: "Properties", to: "/properties", icon: FaLayerGroup },
  { label: "Projects", to: "/projects", icon: FaFolderOpen },
  { label: "Staff", to: "/users", icon: FaUsers, permission: "view_users", featureKey: "feature_users" },
  { label: "Teams", to: "/teams", icon: FaUserFriends, permission: "view_users", featureKey: "feature_teams" },
  { label: "Reports", to: "/reports", icon: FaChartLine, permission: "view_reports", featureKey: "feature_reports" },
  { label: "Modules", to: "/modules", icon: FaThLarge, permission: "manage_users" },
  { label: "Settings", to: "/settings", icon: FaCog, permission: "manage_settings" },
];

export default function Sidebar({ collapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const { hasPermission } = useAuth();
  const { isFeatureEnabled, settings } = useAppSettings();
  const appVersion = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "0.0.0";
  const appName = settings.app_name?.trim() || "Sarwe Crm";
  const logoUrl = resolveApiAssetUrl(settings.brand_logo_url);
  const visibleNavItems = navItems.filter((item) => {
    const permissionOk = !item.permission || hasPermission(item.permission);
    const featureOk = !item.featureKey || isFeatureEnabled(item.featureKey);
    return permissionOk && featureOk;
  });

  return (
    <>
      {mobileOpen ? (
        <button
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-30 bg-gray-900/30 lg:hidden"
          onClick={onCloseMobile}
        />
      ) : null}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r border-gray-200 bg-white transition-all duration-200 lg:static lg:translate-x-0 dark:border-slate-800 dark:bg-slate-950",
          collapsed ? "w-16" : "w-52",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col p-2.5">
          <div className="mb-3 flex items-center justify-between px-1">
            <div className={cn("flex items-center", collapsed ? "justify-center" : "")}>
              <div
                aria-label={appName}
                className={cn(
                  "font-semibold tracking-[0.08em] text-[var(--brand-primary)]",
                  collapsed ? "flex h-12 w-12 items-center justify-center text-[10px] uppercase" : "flex items-center gap-2 px-2 py-1.5 text-sm"
                )}
              >
                {collapsed ? (
                  logoUrl ? (
                   <img
  src={logoUrl || "/logo.png"}
  alt={appName}
  className={collapsed ? "h-10 w-auto max-w-10 object-contain" : "h-10 w-auto max-w-[140px] object-contain"}
  onError={(e) => {
    const target = e.currentTarget;
    if (target.src !== window.location.origin + "/logo.png") {
      target.src = "/logo.png";
    }
  }}
/>
                  ) : (
                    appName.slice(0, 2).toUpperCase()
                  )
                ) : (
                  logoUrl ? (
                    <img
  src={logoUrl || "/logo.png"}
  alt={appName}
  className={collapsed ? "h-10 w-auto max-w-10 object-contain" : "h-10 w-auto max-w-[140px] object-contain"}
  onError={(e) => {
    const target = e.currentTarget;
    if (target.src !== window.location.origin + "/logo.png") {
      target.src = "/logo.png";
    }
  }}
/>
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-sm bg-[var(--brand-soft)] text-[10px] uppercase">
                      {appName.slice(0, 2).toUpperCase()}
                    </span>
                  )
                )}
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 lg:hidden"
              onClick={onCloseMobile}
              aria-label="Close sidebar"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>


          <nav className="space-y-0.5">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    cn(
                      "group relative flex items-center gap-2 border-l-4 px-2.5 py-2 text-xs transition-colors",
                      collapsed ? "justify-center" : "",
                      isActive
                        ? "border-l-[var(--brand-primary)] bg-[var(--brand-soft)] text-[var(--brand-primary)]"
                        : "border-l-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-800",
                    )
                  }
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {!collapsed ? <span>{item.label}</span> : null}
                  {collapsed ? (
                    <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-sm border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-700 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      {item.label}
                    </span>
                  ) : null}
                </NavLink>
              );
            })}
          </nav>

          {!collapsed ? (
            <div className="mt-auto rounded-sm border border-gray-200 bg-gray-50 p-2.5 text-[11px] text-gray-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
              Version {appVersion}
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
