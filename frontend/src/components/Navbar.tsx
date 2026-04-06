import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, Menu, Moon, PanelLeftClose, PanelLeftOpen, Search, Sun } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { useTheme } from "@/components/ThemeContext";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem
} from "@/lib/notifications-service";
import { subscribeToNotificationsStream } from "@/lib/notifications-stream";
import { searchApp, type SearchItem } from "@/lib/search-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type NavbarProps = {
  collapsed: boolean;
  onOpenMobileSidebar: () => void;
  onToggleSidebar: () => void;
};

type NotificationToast = {
  id: string;
  notification: NotificationItem;
};

const titleByPath: Record<string, string> = {
  "/": "Dashboard",
  "/dashboard": "Dashboard",
  "/leads": "Leads",
  "/projects": "Properties",
  "/leads/add": "Add Lead",
  "/leads/upload": "Upload Leads",
  "/my-tasks": "My Tasks",
  "/tasks": "All Tasks",
  "/tasks/create": "Create Task",
  "/users": "Staff",
  "/users/create": "Add Staff Member",
  "/teams": "Teams",
  "/modules": "Modules",
  "/reports": "Reports",
  "/settings": "Settings",
};

export default function Navbar({ collapsed, onOpenMobileSidebar, onToggleSidebar }: NavbarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user: currentUser, role, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const title = titleByPath[pathname] ?? "Dashboard";
  const roleLabel = role
    ? `${role.charAt(0).toUpperCase()}${role.slice(1)}`
    : "User";
  const initials = (currentUser?.fullName || "User")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";
  const handleLogout = () => {
    logout();
    setProfileOpen(false);
    navigate("/signin", { replace: true });
  };
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [notificationsLoading, setNotificationsLoading] = React.useState(false);
  const [toasts, setToasts] = React.useState<NotificationToast[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<SearchItem[]>([]);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const notificationsRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLDivElement>(null);

  // Profile dropdown state
  const [profileOpen, setProfileOpen] = React.useState(false);
  const profileRef = React.useRef<HTMLDivElement>(null);

  const loadNotifications = React.useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const response = await getNotifications(10);
      setNotifications(response.items);
      setUnreadCount(response.unreadCount);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  const pushToast = React.useCallback((notification: NotificationItem) => {
    setToasts((prev) => {
      if (prev.some((item) => item.id === notification.id)) {
        return prev;
      }
      return [{ id: notification.id, notification }, ...prev].slice(0, 3);
    });
  }, []);

  const dismissToast = React.useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== toastId));
  }, []);

  React.useEffect(() => {
    void loadNotifications();
    const unsubscribe = subscribeToNotificationsStream({
      onEvent(event) {
        if (event.type === "snapshot") {
          setNotifications(event.items);
          setUnreadCount(event.unreadCount);
          return;
        }

        if (event.type === "created") {
          setNotifications((prev) => {
            const alreadyExists = prev.some((item) => item.id === event.notification.id);
            if (!alreadyExists) {
              setUnreadCount((count) => count + 1);
              pushToast(event.notification);
            }
            const next = [event.notification, ...prev.filter((item) => item.id !== event.notification.id)];
            return next.slice(0, 10);
          });
          return;
        }

        if (event.type === "read") {
          setNotifications((prev) => prev.map((item) => (item.id === event.notificationId ? { ...item, isRead: true } : item)));
          setUnreadCount((prev) => Math.max(0, prev - 1));
          return;
        }

        if (event.type === "read_all") {
          setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
          setUnreadCount(0);
        }
      },
      onError() {
        void loadNotifications();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadNotifications, pushToast]);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    }
    if (profileOpen || notificationsOpen || searchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [notificationsOpen, profileOpen, searchOpen]);

  const resolveNotificationPath = (notification: NotificationItem) => {
    if (notification.entityType === "task" && notification.entityId) {
      return `/tasks/${notification.entityId}`;
    }
    if (notification.entityType === "lead" && notification.entityId) {
      return `/leads/${notification.entityId}`;
    }
    return "/dashboard";
  };

  const formatRelativeTime = (value: string) => {
    const date = new Date(value);
    const diffMinutes = Math.round((Date.now() - date.getTime()) / 60000);
    if (!Number.isFinite(diffMinutes) || diffMinutes < 1) {
      return "Just now";
    }
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const handleOpenNotifications = async () => {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);
    setProfileOpen(false);
    if (nextOpen) {
      await loadNotifications();
    }
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    dismissToast(notification.id);
    if (!notification.isRead) {
      await markNotificationRead(notification.id);
      setNotifications((prev) => prev.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    setNotificationsOpen(false);
    navigate(resolveNotificationPath(notification));
  };

  const handleMarkAllRead = async (event: React.MouseEvent) => {
    event.stopPropagation();
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
  };

  React.useEffect(() => {
    if (!toasts.length) {
      return;
    }

    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        dismissToast(toast.id);
      }, 5000)
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [dismissToast, toasts]);

  React.useEffect(() => {
    const normalized = searchQuery.trim();
    if (normalized.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const items = await searchApp(normalized);
        setSearchResults(items);
        setSearchOpen(true);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  const handleSearchSelect = (item: SearchItem) => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    navigate(item.href);
  };

  const typeTone: Record<string, string> = {
    lead: "bg-amber-50 text-amber-700",
    task: "bg-blue-50 text-blue-700",
    user: "bg-emerald-50 text-emerald-700",
    property: "bg-fuchsia-50 text-fuchsia-700",
    project: "bg-slate-100 text-slate-700"
  };

  return (
    <>
      <header className="sticky top-0 z-20 flex h-12 items-center border-b border-gray-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 lg:hidden"
            onClick={onOpenMobileSidebar}
            aria-label="Open sidebar"
          >
            <Menu className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-7 w-7 lg:inline-flex"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
          >
            {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
          </Button>
          <p className="text-xs font-semibold text-gray-700 dark:text-slate-200">{title}</p>
        </div>

        <div ref={searchRef} className="relative ml-3 hidden min-w-0 max-w-md flex-1 md:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              if (!searchOpen && event.target.value.trim().length >= 2) {
                setSearchOpen(true);
              }
            }}
            onFocus={() => {
              if (searchQuery.trim().length >= 2) {
                setSearchOpen(true);
              }
            }}
            className="h-8 border-gray-200 bg-white pl-8 text-[11px] placeholder:text-gray-400 focus-visible:border-blue-600"
            placeholder="Search leads, tasks, users, projects..."
          />
          {searchOpen ? (
            <div className="absolute left-0 right-0 top-9 z-50 overflow-hidden rounded border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
              {searchLoading ? <p className="px-3 py-3 text-xs text-gray-500">Searching...</p> : null}
              {!searchLoading && !searchResults.length ? (
                <p className="px-3 py-3 text-xs text-gray-500">Type at least 2 letters to search the app.</p>
              ) : null}
              {!searchLoading && searchResults.length ? (
                <div className="max-h-96 overflow-y-auto">
                  {searchResults.map((item) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      type="button"
                      onClick={() => handleSearchSelect(item)}
                      className="block w-full border-b border-gray-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-gray-800 dark:text-slate-100">{item.label}</p>
                          {item.sublabel ? <p className="mt-0.5 text-[11px] text-gray-500 dark:text-slate-400">{item.sublabel}</p> : null}
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-medium capitalize ${typeTone[item.type] || "bg-slate-100 text-slate-700"}`}>
                          {item.type}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
        <Button variant="ghost" size="icon" aria-label="Toggle theme" className="h-7 w-7" onClick={toggleTheme}>
          {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </Button>
        <div ref={notificationsRef} className="relative">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            className="relative h-7 w-7"
            onClick={() => void handleOpenNotifications()}
          >
            <Bell className="h-3.5 w-3.5" />
            {unreadCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 min-w-[14px] rounded-full bg-red-500 px-1 text-[9px] font-semibold leading-[14px] text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </Button>
          {notificationsOpen ? (
            <div className="absolute right-0 top-9 z-50 w-80 rounded border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 dark:border-slate-700">
                <div>
                  <p className="text-xs font-semibold text-gray-800 dark:text-slate-100">Notifications</p>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400">{unreadCount} unread</p>
                </div>
                <button
                  type="button"
                  className="text-[10px] font-medium text-blue-600 hover:underline disabled:text-gray-400"
                  disabled={!unreadCount}
                  onClick={(event) => void handleMarkAllRead(event)}
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notificationsLoading ? <p className="px-3 py-3 text-xs text-gray-500">Loading notifications...</p> : null}
                {!notificationsLoading && !notifications.length ? (
                  <p className="px-3 py-6 text-center text-xs text-gray-500 dark:text-slate-400">No notifications yet.</p>
                ) : null}
                {!notificationsLoading
                  ? notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => void handleNotificationClick(notification)}
                        className={`block w-full border-b border-gray-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/60 ${
                          notification.isRead ? "bg-white dark:bg-slate-900" : "bg-blue-50/60 dark:bg-slate-800/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-gray-800 dark:text-slate-100">{notification.title}</p>
                            <p className="mt-0.5 text-[11px] text-gray-600 dark:text-slate-300">{notification.message}</p>
                          </div>
                          {!notification.isRead ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" /> : null}
                        </div>
                        <p className="mt-1 text-[10px] text-gray-400 dark:text-slate-500">{formatRelativeTime(notification.createdAt)}</p>
                      </button>
                    ))
                  : null}
              </div>
            </div>
          ) : null}
        </div>
        <div ref={profileRef} className="relative flex cursor-pointer items-center gap-1.5 rounded-sm p-1 hover:bg-[var(--brand-soft)]" onClick={() => setProfileOpen((v) => !v)}>
          <span className="relative">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-blue-600 text-[10px] font-semibold text-white">
              {initials}
            </span>
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-white bg-red-500 dark:border-slate-900" />
          </span>
          <div className="hidden flex-col md:flex">
            <span className="text-[10px] font-semibold leading-4 text-gray-800 dark:text-slate-100">
              {currentUser?.fullName || "User"}
            </span>
            <span className="text-[9px] leading-3 text-gray-500 dark:text-slate-400">{roleLabel}</span>
          </div>
          <svg className={"ml-1 h-3 w-3 text-gray-400 transition-transform dark:text-slate-400 " + (profileOpen ? "rotate-180" : "")}
            fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          {/* Dropdown */}
          {profileOpen && (
            <div className="absolute right-0 top-10 z-50 w-48 rounded border border-gray-200 bg-white py-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <button className="block w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800">Profile</button>
              <button className="block w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800">Settings</button>
              <div className="my-1 border-t border-gray-100 dark:border-slate-700" />
              <button
                className="block w-full px-4 py-2 text-left text-xs text-red-600 hover:bg-gray-100 dark:hover:bg-slate-800"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
        </div>
      </header>

      {toasts.length ? (
        <div className="pointer-events-none fixed right-4 top-16 z-[70] flex w-full max-w-sm flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto rounded border border-blue-200 bg-white shadow-lg ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex items-start gap-3 px-3 py-3">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => void handleNotificationClick(toast.notification)}
                >
                  <p className="text-xs font-semibold text-gray-800 dark:text-slate-100">{toast.notification.title}</p>
                  <p className="mt-1 text-xs text-gray-600 dark:text-slate-300">{toast.notification.message}</p>
                </button>
                <button
                  type="button"
                  aria-label="Dismiss toast"
                  className="shrink-0 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-slate-200"
                  onClick={() => dismissToast(toast.id)}
                >
                  x
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
