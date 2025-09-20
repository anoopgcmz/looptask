"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Avatar } from "@/components/ui/avatar";

type AppShellProps = {
  children: React.ReactNode;
};

type NavigationLink = {
  href: string;
  label: string;
};

type User = {
  name: string;
  email: string;
  avatar?: string | null;
};

const NAVIGATION_LINKS: NavigationLink[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tasks", label: "Tasks" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
];

export function closeSidebarOnNavigation({
  isDesktop,
  closeSidebar,
}: {
  isDesktop: boolean;
  closeSidebar: () => void;
}) {
  closeSidebar();
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
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
        <div className="app-header__actions" aria-label="User menu" />
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
                    {link.label}
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
