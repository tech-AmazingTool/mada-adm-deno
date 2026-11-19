import { signal } from "@preact/signals";
import { PAGE_CONTENT_DRAWER_DEFAULT_OPEN } from "@/config/app-layout.config.ts";

export class AppLayoutStore {
  readonly sidebarIsOpen = signal(PAGE_CONTENT_DRAWER_DEFAULT_OPEN);

  toggleSidebar(isOpen?: boolean) {
    this.sidebarIsOpen.value = typeof isOpen === "boolean"
      ? isOpen
      : !this.sidebarIsOpen.value;
  }
}

let appLayoutStore: AppLayoutStore | null = null;

export function injectAppLayoutStore(): AppLayoutStore {
  return appLayoutStore ??= new AppLayoutStore();
}
