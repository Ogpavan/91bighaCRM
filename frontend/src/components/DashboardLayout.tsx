import { Outlet } from "react-router-dom";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar
          collapsed={collapsed}
          onOpenMobileSidebar={() => setMobileOpen(true)}
          onToggleSidebar={() => setCollapsed((prev) => !prev)}
        />
        <main className="flex-1 overflow-auto p-2">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
