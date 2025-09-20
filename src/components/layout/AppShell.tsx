"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type AppShellProps = {
  children: React.ReactNode;
};

type NavigationLink = {
  href: string;
  label: string;
};

const NAVIGATION_LINKS: NavigationLink[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tasks", label: "Tasks" },
  { href: "/settings", label: "Settings" },
];

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const previousOpenRef = useRef(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const navId = "app-shell-sidebar";

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const handleMediaChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
      if (event.matches) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    setIsDesktop(mediaQuery.matches);
    setSidebarOpen(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleMediaChange);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, []);

  useEffect(() => {
    if (!isDesktop) {
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

  const handleSidebarKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === "Escape" && !isDesktop) {
        event.preventDefault();
        setSidebarOpen(false);
      }
    },
    [isDesktop],
  );

  const navigationLinks = useMemo(() => NAVIGATION_LINKS, []);
  const isSidebarVisible = sidebarOpen;

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
        <div className="app-header__actions" aria-label="Global navigation" />
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
        <p className="app-sidebar__title" id="app-sidebar-title">
          Navigation
        </p>
        <ul className="app-sidebar__nav" aria-labelledby="app-sidebar-title">
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
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
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
