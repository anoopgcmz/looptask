import { describe, expect, it, vi } from "vitest";

import { closeSidebarOnNavigation } from "./AppShell";

describe("closeSidebarOnNavigation", () => {
  it("closes the sidebar when the navigation is in overlay mode", () => {
    const closeSidebar = vi.fn();

    closeSidebarOnNavigation({ isPinned: false, closeSidebar });

    expect(closeSidebar).toHaveBeenCalledTimes(1);
  });

  it("keeps the sidebar open when it is pinned", () => {
    const closeSidebar = vi.fn();

    closeSidebarOnNavigation({ isPinned: true, closeSidebar });

    expect(closeSidebar).not.toHaveBeenCalled();
  });
});
