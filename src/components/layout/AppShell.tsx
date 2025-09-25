"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

const NAVIGATION_LINKS: NavigationLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
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

const AUTH_ROUTES = new Set(["/signin", "/signin/verify", "/login", "/"]);

export function closeSidebarOnNavigation({
  isDesktop,
  closeSidebar,
}: {
  isDesktop: boolean;
  closeSidebar: () => void;
}) {
  void isDesktop;
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
  const hasDetectedNonDesktopRef = useRef(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);
  const navId = "app-shell-sidebar";

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const applyLayoutFromMatch = (matches: boolean) => {
      setIsDesktop(matches);
      if (matches) {
        hasDetectedNonDesktopRef.current = false;
        setSidebarOpen(true);
      } else {
        hasDetectedNonDesktopRef.current = true;
        setSidebarOpen(false);
      }
    };

    const handleMediaChange = (event: MediaQueryListEvent) => {
      applyLayoutFromMatch(event.matches);
    };

    applyLayoutFromMatch(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleMediaChange);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, []);

  useEffect(() => {
    if (!isDesktop && hasDetectedNonDesktopRef.current) {
      setSidebarOpen(false);
    }
  }, [pathname, isDesktop]);

  useEffect(() => {
    if (!isDesktop && sidebarOpen && !previousOpenRef.current) {
      firstLinkRef.current?.focus();
    }

    if (!isDesktop && !sidebarOpen && previousOpenRef.current) {
      toggleButtonRef.current?.focus();
    }

    previousOpenRef.current = sidebarOpen;
  }, [sidebarOpen, isDesktop]);

  const handleToggle = useCallback(() => {
    setSidebarOpen((previous) => !previous);
  }, []);

  const handleNavigationLinkActivation = useCallback(() => {
    closeSidebarOnNavigation({
      isDesktop,
      closeSidebar: () => setSidebarOpen(false),
    });
  }, [isDesktop]);

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
      if (event.key === "Escape" && !isDesktop) {
        event.preventDefault();
        setSidebarOpen(false);
      }
    },
    [isDesktop],
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
  const isSidebarVisible = sidebarOpen;

  const userGreeting = useMemo(() => {
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
    const displayName = lastName ? `${firstName} ${lastName}` : firstName;

    return `Hi, ${displayName}`;
  }, [user?.name]);

  return (
    <div className={`app-shell ${sidebarOpen ? "app-shell--sidebar-open" : ""}`}>
      <header className="app-header">
        <div className="app-header__start">
          <button
            ref={toggleButtonRef}
            type="button"
            className="app-header__toggle"
            aria-expanded={sidebarOpen}
            aria-controls={navId}
            aria-label={sidebarOpen ? "Hide navigation" : "Show navigation"}
            onClick={handleToggle}
          >
            <svg
              aria-hidden="true"
              focusable="false"
              className="app-header__toggle-icon"
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
          <div className="app-header__branding">
            <span className="app-header__logo" aria-hidden>
              ⬡
            </span>
            <span className="app-header__name">LoopTask</span>
          </div>
        </div>
        <div className="app-header__actions">
          <Link
            href="/notifications"
            className="app-header__icon-button"
            aria-label="View notifications"
          >
            <BellIcon />
            <NotificationsBadge className="app-header__notification-badge" />
          </Link>
        </div>
      </header>

      <div
        className="app-shell__overlay"
        role="presentation"
        hidden={!sidebarOpen || isDesktop}
        onClick={() => setSidebarOpen(false)}
      />

      <nav
        id={navId}
        className="app-sidebar"
        aria-hidden={!isSidebarVisible}
        aria-label="Primary"
        onKeyDown={handleSidebarKeyDown}
      >
        <div className="app-sidebar__nav-container">
          {!isLoadingUser && !userError && user ? (
            <div className="app-sidebar__profile">
              <div className="app-sidebar__profile-avatar" aria-hidden>
                <Avatar
                  src={user.avatar ?? undefined}
                  fallback={avatarFallback}
                  className="h-14 w-14"
                />
              </div>
              {userGreeting ? (
                <p className="app-sidebar__profile-greeting">{userGreeting}</p>
              ) : null}
            </div>
          ) : null}
          <ul className="app-sidebar__nav" aria-label="Primary navigation">
            {navigationLinks.map((link, index) => {
              const isActive = pathname?.startsWith(link.href);

              return (
                <li key={link.href}>
                  <Link
                    ref={index === 0 ? firstLinkRef : undefined}
                    href={link.href}
                    className={`app-sidebar__link ${isActive ? "app-sidebar__link--active" : ""}`}
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
                          link.badge.tone === "accent" ? "app-sidebar__badge--accent" : ""
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
      </nav>

      <div className="app-shell__content">
        <main className="app-main">{children}</main>
        <footer className="app-footer">
          <p>© {new Date().getFullYear()} LoopTask. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
