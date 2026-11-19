import { ComponentChildren } from "preact";
import { computed, useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import { PanelRightClose, PanelRightOpen } from "lucide-preact";
import { default as SimpleBar } from "simplebar";
import "simplebar/dist/simplebar.css";

import { useStoresContext } from "@/contexts/stores/index.ts";
import useScrollToDataSourcesDownload from "@/hooks/useScrollToDataSourcesDownload.ts";

export type RoutePageDrawerProps = {
  children: ComponentChildren;
};

export default function RoutePageDrawer({ children }: RoutePageDrawerProps) {
  const appLayoutStore = useStoresContext().injectAppLayoutStore();

  const toggleLabel = computed(() => {
    return appLayoutStore.sidebarIsOpen.value
      ? "Collapse the panel"
      : "Expand the panel";
  });

  const overlayRef = useRef<HTMLDivElement>(null);
  const overlayIsOpen = useSignal(false);

  useEffect(() => {
    appLayoutStore.toggleSidebar(true);
  }, []);

  const overlayAnimationStyles = [
    { opacity: 0 },
    { opacity: 0.5 },
  ];
  const overlayAnimationDuration = 400;

  useEffect(() => {
    if (appLayoutStore.sidebarIsOpen.value) {
      overlayIsOpen.value = true;
    } else {
      overlayRef.current?.animate(
        [overlayAnimationStyles[1], overlayAnimationStyles[0]],
        {
          duration: overlayAnimationDuration / 2,
          easing: "ease-in-out",
          fill: "forwards",
        },
      );
      setTimeout(() => {
        overlayIsOpen.value = false;
      }, overlayAnimationDuration);
    }
  }, [appLayoutStore.sidebarIsOpen.value]);

  useEffect(() => {
    if (overlayIsOpen.value) {
      overlayRef.current?.animate(overlayAnimationStyles, {
        duration: overlayAnimationDuration,
        easing: "ease-in-out",
        fill: "both",
      });
    }
  }, [overlayIsOpen.value]);

  // @ts-ignore - SimpleBar typings are wrong
  const simpleBarInstance = useRef<SimpleBar>(null);
  const scrollableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollableRef.current) {
      scrollableRef.current.classList.remove("overflow-y-hidden");
      // @ts-ignore - SimpleBar typings are wrong
      simpleBarInstance.current = new SimpleBar(scrollableRef.current);
    }
  }, []);

  useScrollToDataSourcesDownload();

  const prevPathname = useRef<string | null>(null);

  useEffect(() => {
    function handleNavigate(e: NavigateEvent) {
      const url = new URL(e.destination.url);
      if (url.pathname !== prevPathname.current) {
        // @ts-ignore - SimpleBar typings are wrong
        simpleBarInstance.current?.getScrollElement().scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
      prevPathname.current = url.pathname;
    }

    navigation.addEventListener("navigate", handleNavigate);

    return () => {
      navigation.removeEventListener("navigate", handleNavigate);
    };
  }, []);

  return (
    <div
      class={`h-full max-h-full bg-white fixed left-(--sidebar-width) lg:relative lg:left-0 ${
        appLayoutStore.sidebarIsOpen.value ? "w-(--drawer-width)" : "w-0"
      }`}
      style="--drawer-width: min(calc(100vw - var(--sidebar-width)), var(--base-drawer-width)); transition: all 400ms; z-index: calc(var(--base-z-index) + 30);"
    >
      <div
        class="absolute w-[min(calc(100vw-var(--sidebar-width)),var(--base-drawer-width))] h-full top-0 right-0 bg-white"
        style={{
          boxShadow: `2px 0 2px rgba(0, 0, 0, 0.125)`,
          zIndex: `calc(var(--base-z-index) + 30)`,
        }}
      >
        <div
          id="router-pages-drawer"
          class={`absolute top-4 right-0 min-[532px]:ml-4 ${
            appLayoutStore.sidebarIsOpen.value
              ? "translate-x-0 mr-4 min-[532px]:translate-x-[calc(100%+0.75rem)] min-[532px]:mr-0"
              : "translate-x-[calc(100%+0.75rem)] mr-0"
          }`}
          style={{ zIndex: "calc(var(--base-z-index) + 30)" }}
        >
          <div
            className={`tooltip ${
              !appLayoutStore.sidebarIsOpen.value
                ? "tooltip-right"
                : "tooltip-left"
            }`}
            data-tip={toggleLabel}
          >
            <button
              type="button"
              id="router-drawer-toggle-btn"
              aria-label={toggleLabel}
              class="btn btn-square btn-lg shadow text-base-content/90 hover:text-base-content duration-300"
              onClick={() => (appLayoutStore.toggleSidebar())}
            >
              {!appLayoutStore.sidebarIsOpen.value
                ? <PanelRightOpen class="rotate-180" />
                : <PanelRightClose class="rotate-180" />}
            </button>
          </div>
        </div>
        <div
          ref={scrollableRef}
          className="duration-300 h-full max-h-full overflow-y-hidden"
          style={{ opacity: appLayoutStore.sidebarIsOpen.value ? "1" : "0" }}
        >
          <div class="pt-8 sm:pt-5 px-3 lg:px-4 pb-4 relative">
            {children}
          </div>
        </div>
      </div>
      {overlayIsOpen.value && (
        <div
          ref={overlayRef}
          class="fixed h-dvh w-screen top-0 left-0 bg-black opacity-0 cursor-pointer lg:invisible"
          style={{ zIndex: `calc(var(--base-z-index) + 20)` }}
          onClick={() => appLayoutStore.toggleSidebar(false)}
        >
        </div>
      )}
    </div>
  );
}
