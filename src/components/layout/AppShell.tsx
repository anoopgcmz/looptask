"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import NotificationsBadge from "@/components/notifications-badge";
import { Avatar } from "@/components/ui/avatar";

type AppShellProps = {
  children: React.ReactNode;
};

type NavigationBadge = {
  label: string;
  tone?: "neutral" | "accent";
};

type NavigationLink = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: NavigationBadge;
};

type User = {
  name: string;
  email: string;
  avatar?: string | null;
};

const DashboardIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
    <path
      d="M4 4h6v6H4zM14 4h6v10h-6zM4 14h6v6H4zM14 18h6v2h-6z"
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
    />
  </svg>
);

const TasksIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
    <path
      d="M6 12h5M6 16h3M6 8h9M15.5 14.5l1.5 1.5 3-3"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ProjectsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
    <path
      d="M4.5 6.75A2.25 2.25 0 016.75 4.5h3.19a2.25 2.25 0 011.74.84l.72.9a.75.75 0 00.58.28h4.27a1.5 1.5 0 011.5 1.5V18a1.5 1.5 0 01-1.5 1.5H6.75A2.25 2.25 0 014.5 17.25z"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M8 14h8M8 11h5"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ReportsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
    <path
      d="M5 5h14v14H5z"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
    <path
      d="M9 14l2-2 2 2 3-3"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SettingsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
    <path
      d="M12 15a3 3 0 100-6 3 3 0 000 6z"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M19.4 15a1 1 0 01.2 1.1l-.7 1.2a1 1 0 01-1 .5l-1.4-.3a6.6 6.6 0 01-.9.5l-.2 1.4a1 1 0 01-1 .9h-1.4a1 1 0 01-1-.9l-.2-1.4a6.6 6.6 0 01-.9-.5l-1.4.3a1 1 0 01-1-.5l-.7-1.2a1 1 0 01.2-1.1l1.1-1a6.5 6.5 0 010-1.1l-1.1-1a1 1 0 01-.2-1.1l.7-1.2a1 1 0 011-.5l1.4.3a6.6 6.6 0 01.9-.5l.2-1.4a1 1 0 011-.9h1.4a1 1 0 011 .9l.2 1.4a6.6 6.6 0 01.9.5l1.4-.3a1 1 0 011 .5l.7 1.2a1 1 0 01-.2 1.1l-1.1 1a6.5 6.5 0 010 1.1z"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

const BellIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
    <path
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V4a1 1 0 10-2 0v1.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0m6 0H9"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

const LogoIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" {...props}>
    <g fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x={5.5} y={5.5} width={21} height={21} rx={6} />
      <path d="M11 11h10v10H11z" />
      <path d="M16 6v5M16 21v5M6 16h5M21 16h5" strokeLinecap="round" />
    </g>
  </svg>
);

const NAVIGATION_LINKS: NavigationLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  { href: "/projects", label: "Projects", icon: <ProjectsIcon /> },
  {
    href: "/tasks",
    label: "My Tasks",
    icon: <TasksIcon />,
    badge: { label: "12" },
  },
  {
    href: "/reports",
    label: "Reports",
    icon: <ReportsIcon />,
    badge: { label: "3" },
  },
  { href: "/settings", label: "Settings", icon: <SettingsIcon /> },
];

const AUTH_ROUTES = new Set(["/signin", "/signin/verify", "/login", "/", "/admin/login"]);

type LayoutMode = "desktop" | "tablet" | "mobile";

export function closeSidebarOnNavigation({
  isPinned,
  closeSidebar,
}: {
  isPinned: boolean;
  closeSidebar: () => void;
}) {
  if (isPinned) {
    return;
  }

  closeSidebar();
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  if (AUTH_ROUTES.has(pathname)) {
    return <>{children}</>;
  }

  return (
    <AuthenticatedAppShell pathname={pathname}>{children}</AuthenticatedAppShell>
  );
}

function AuthenticatedAppShell({
  children,
  pathname,
}: {
  children: React.ReactNode;
  pathname: string;
}) {
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const previousOpenRef = useRef(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("desktop");
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);
  const navId = "app-shell-sidebar";

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const tabletQuery = window.matchMedia("(min-width: 768px)");

    const resolveLayoutMode = () => {
      if (desktopQuery.matches) {
        return "desktop" as const;
      }

      if (tabletQuery.matches) {
        return "tablet" as const;
      }

      return "mobile" as const;
    };

    const applyLayoutMode = () => {
      setLayoutMode(resolveLayoutMode());
    };

    applyLayoutMode();
    desktopQuery.addEventListener("change", applyLayoutMode);
    tabletQuery.addEventListener("change", applyLayoutMode);

    return () => {
      desktopQuery.removeEventListener("change", applyLayoutMode);
      tabletQuery.removeEventListener("change", applyLayoutMode);
    };
  }, []);

  useEffect(() => {
    setSidebarOpen(layoutMode === "desktop");
  }, [layoutMode]);

  useEffect(() => {
    if (layoutMode === "desktop") {
      return;
    }

    setSidebarOpen(false);
  }, [pathname, layoutMode]);

  useEffect(() => {
    if (layoutMode === "desktop") {
      previousOpenRef.current = sidebarOpen;
      return;
    }

    if (sidebarOpen && !previousOpenRef.current) {
      firstLinkRef.current?.focus();
    }

    if (!sidebarOpen && previousOpenRef.current) {
      toggleButtonRef.current?.focus();
    }

    previousOpenRef.current = sidebarOpen;
  }, [sidebarOpen, layoutMode]);

  const handleToggle = useCallback(() => {
    setSidebarOpen((previous) => !previous);
  }, []);

  const handleNavigationLinkActivation = useCallback(() => {
    closeSidebarOnNavigation({
      isPinned: layoutMode === "desktop",
      closeSidebar: () => setSidebarOpen(false),
    });
  }, [layoutMode]);

  const handleNavigationLinkKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLAnchorElement>) => {
      if (event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        handleNavigationLinkActivation();
      }
    },
    [handleNavigationLinkActivation],
  );

  const handleSidebarKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === "Escape" && layoutMode !== "desktop") {
        event.preventDefault();
        setSidebarOpen(false);
      }
    },
    [layoutMode],
  );

  useEffect(() => {
    let isMounted = true;

    async function fetchUser() {
      try {
        setIsLoadingUser(true);
        setUserError(null);
        const response = await fetch("/api/users/me");
        if (!response.ok) {
          throw new Error("Failed to fetch user");
        }
        const data = (await response.json()) as User;
        if (isMounted) {
          setUser(data);
        }
      } catch (error: unknown) {
        if (isMounted) {
          const message =
            error instanceof Error && error.message
              ? error.message
              : "Unable to load user";
          setUserError(message);
        }
      } finally {
        if (isMounted) {
          setIsLoadingUser(false);
        }
      }
    }

    void fetchUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const avatarFallback = useMemo(() => {
    if (!user?.name) {
      return undefined;
    }

    const parts = user.name.trim().split(/\s+/);
    if (parts.length === 0) {
      return undefined;
    }

    const firstInitial = parts[0]?.charAt(0) ?? "";
    const lastInitial = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) ?? "" : "";

    return `${firstInitial}${lastInitial}`.toUpperCase() || undefined;
  }, [user?.name]);

  const navigationLinks = useMemo(() => NAVIGATION_LINKS, []);
  const isSidebarPinned = layoutMode === "desktop";
  const isSidebarVisible = isSidebarPinned ? true : sidebarOpen;
  const showOverlay = !isSidebarPinned && sidebarOpen;

  const userDisplayName = useMemo(() => {
    if (!user?.name) {
      return null;
    }

    const trimmedName = user.name.trim();
    if (!trimmedName) {
      return null;
    }

    const parts = trimmedName.split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.length > 1 ? parts[parts.length - 1] : undefined;

    return lastName ? `${firstName} ${lastName}` : firstName;
  }, [user?.name]);

  const userGreeting = useMemo(() => {
    return userDisplayName ? `Hi, ${userDisplayName}` : null;
  }, [userDisplayName]);

  return (
    <div
      className={`app-shell app-shell--mode-${layoutMode} ${
        sidebarOpen ? "app-shell--sidebar-open" : ""
      }`}
    >
      <div className="app-shell__layout">
        <nav
          id={navId}
          className="app-sidebar"
          aria-hidden={!isSidebarVisible}
          aria-label="Primary"
          onKeyDown={handleSidebarKeyDown}
          data-state={isSidebarVisible ? "open" : "closed"}
          data-pinned={isSidebarPinned ? "true" : "false"}
        >
          <div className="app-sidebar__inner">
            <div className="app-sidebar__header">
              <span className="app-sidebar__logo" aria-hidden>
                <LogoIcon />
              </span>
              <div className="app-sidebar__brand">
                <span className="app-sidebar__brand-name">LoopTask</span>
                <span className="app-sidebar__brand-subtitle">Unified Workspace</span>
              </div>
            </div>

            <div className="app-sidebar__content">
              <ul className="app-sidebar__nav" aria-label="Primary navigation">
                {navigationLinks.map((link, index) => {
                  const isActive = pathname?.startsWith(link.href);

                  return (
                    <li key={link.href}>
                      <Link
                        ref={index === 0 ? firstLinkRef : undefined}
                        href={link.href}
                        className={`app-sidebar__link ${
                          isActive ? "app-sidebar__link--active" : ""
                        }`}
                        aria-current={isActive ? "page" : undefined}
                        tabIndex={isSidebarVisible ? 0 : -1}
                        onClick={handleNavigationLinkActivation}
                        onKeyDown={handleNavigationLinkKeyDown}
                      >
                        <span className="app-sidebar__link-icon" aria-hidden>
                          {link.icon}
                        </span>
                        <span className="app-sidebar__link-label">{link.label}</span>
                        {link.badge ? (
                          <span
                            className={`app-sidebar__badge ${
                              link.badge.tone === "accent"
                                ? "app-sidebar__badge--accent"
                                : ""
                            }`}
                          >
                            {link.badge.label}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="app-sidebar__footer">
              {!isLoadingUser && !userError && user ? (
                <div className="app-sidebar__profile">
                  <div className="app-sidebar__profile-avatar" aria-hidden>
                    <Avatar
                      src={user.avatar ?? undefined}
                      fallback={avatarFallback}
                      className="h-12 w-12"
                    />
                  </div>
                  <div className="app-sidebar__profile-details">
                    {userDisplayName ? (
                      <p className="app-sidebar__profile-name">{userDisplayName}</p>
                    ) : null}
                    {userGreeting ? (
                      <p className="app-sidebar__profile-greeting">{userGreeting}</p>
                    ) : null}
                    {user?.email ? (
                      <p className="app-sidebar__profile-email">{user.email}</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <button
                type="button"
                className="app-sidebar__logout"
                onClick={() => {
                  void signOut({ callbackUrl: "/login", redirect: true });
                }}
                tabIndex={isSidebarVisible ? 0 : -1}
              >
                Log out
              </button>
            </div>
          </div>
        </nav>

        <div className="app-shell__main">
          <header className="app-main-header">
            <div className="app-main-header__start">
              {layoutMode !== "desktop" ? (
                <button
                  ref={toggleButtonRef}
                  type="button"
                  className="app-main-header__toggle"
                  aria-expanded={sidebarOpen}
                  aria-controls={navId}
                  aria-label={sidebarOpen ? "Hide navigation" : "Show navigation"}
                  onClick={handleToggle}
                >
                  <svg
                    aria-hidden="true"
                    focusable="false"
                    className="app-main-header__toggle-icon"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M4 7h16M4 12h16M4 17h16"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              ) : null}
            </div>
            <div className="app-main-header__actions">
              <Link
                href="/notifications"
                className="app-main-header__icon-button"
                aria-label="View notifications"
              >
                <BellIcon />
                <NotificationsBadge className="app-main-header__notification-badge" />
              </Link>
            </div>
          </header>

          <main className="app-main-content">{children}</main>
        </div>
      </div>

      <div
        className="app-shell__overlay"
        role="presentation"
        hidden={!showOverlay}
        onClick={() => setSidebarOpen(false)}
      />
    </div>
  );
}
