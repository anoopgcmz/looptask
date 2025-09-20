import { describe, expect, it, vi } from "vitest";

import { closeSidebarOnNavigation } from "./AppShell";

describe("closeSidebarOnNavigation", () => {
  it("closes the sidebar when not on desktop", () => {
    const closeSidebar = vi.fn();

    closeSidebarOnNavigation({ isDesktop: false, closeSidebar });

    expect(closeSidebar).toHaveBeenCalledTimes(1);
  });

  it("does not close the sidebar on desktop", () => {
    const closeSidebar = vi.fn();

    closeSidebarOnNavigation({ isDesktop: true, closeSidebar });

    expect(closeSidebar).not.toHaveBeenCalled();
  });
});
