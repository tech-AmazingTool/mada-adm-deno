import { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { Driver, driver } from "driver.js";
import "driver.js/dist/driver.css";
import {
  walkThroughDriverContext,
  WalkThroughDriverContextValue,
} from "./walkthrough-driver.context.ts";
import { injectAppLayoutStore } from "@/stores/app-layout.store.ts";
import {
  HIGHLIGHT_ELEMENT_QUERY_TIMEOUT,
  WALKTHROUGH_HAS_VISITED_STORAGE_KEY,
  WALKTHROUGH_LAST_STEP_STORAGE_KEY,
} from "@/consts/walkthrough.consts.ts";

export type WalkthroughDriverProviderProps = {
  children?: ComponentChildren;
};

export function WalkthroughDriverProvider(
  { children }: WalkthroughDriverProviderProps,
) {
  const appLayoutStore = injectAppLayoutStore();

  const driverRef = useRef<Driver | null>(null);

  useEffect(() => {
    driverRef.current?.destroy();
    driverRef.current = null;
  }, []);

  function getLastWalkThroughStep(): number | null {
    const lastStep = localStorage.getItem(WALKTHROUGH_LAST_STEP_STORAGE_KEY);
    return lastStep ? parseInt(lastStep) : null;
  }

  function setLastWalkThroughStep(step: number) {
    localStorage.setItem(WALKTHROUGH_LAST_STEP_STORAGE_KEY, step.toString());
  }

  function getHasDoneFirstWalkThrough(): boolean {
    return localStorage.getItem(WALKTHROUGH_HAS_VISITED_STORAGE_KEY) === "true";
  }

  function setHasDoneFirstWalkThrough() {
    localStorage.setItem(WALKTHROUGH_HAS_VISITED_STORAGE_KEY, "true");
  }

  function handleWaitDrawerToggled(
    driverObj: Driver,
    nextOrPrevious: boolean = true,
  ) {
    if (appLayoutStore.sidebarIsOpen.value === nextOrPrevious) {
      const drawerElt = document.getElementById(
        "router-pages-drawer",
      )!;
      // deno-lint-ignore no-inner-declarations
      function handleTransitionEnd() {
        if (appLayoutStore.sidebarIsOpen.value !== nextOrPrevious) {
          nextOrPrevious ? driverObj.moveNext() : driverObj.movePrevious();
          drawerElt.removeEventListener(
            "transitionend",
            handleTransitionEnd,
          );
        }
      }
      drawerElt.addEventListener(
        "transitionend",
        handleTransitionEnd,
      );
      appLayoutStore.toggleSidebar(!nextOrPrevious);
    } else {
      nextOrPrevious ? driverObj.moveNext() : driverObj.movePrevious();
    }
  }

  function handleSidebarNextClick(
    linkId: string,
    driverObj: Driver,
    nextOrPrevious: boolean = true,
  ) {
    appLayoutStore.toggleSidebar(true);
    const linkElt = document.getElementById(linkId)!;
    const linkHref = linkElt.getAttribute("href")!;
    const currentPathname = new URL(location.href).pathname;
    if (!currentPathname.startsWith(linkHref)) {
      linkElt.click();
    }
    nextOrPrevious ? driverObj.moveNext() : driverObj.movePrevious();
  }

  function createWalkThroughDriver() {
    const driverObj = driver({
      showProgress: true,
      skipMissingElement: false,
      popoverClass: "driverjs-popover-theme",
      steps: [
        {
          element: "#router-drawer-toggle-btn",
          popover: {
            title: "Toggle main content panel",
            description:
              "Click here to expand or collapse your main panel anytime to free up more map screen space.",
            side: "bottom",
            align: "end",
            onNextClick: () => {
              handleWaitDrawerToggled(driverObj);
            },
          },
        },
        {
          element: "#app-map-map-container",
          popover: {
            title: "Interactive map",
            description:
              "This is your primary map where all your pinned locations and the administratives boundaries are visually displayed.",
            side: "left",
            align: "center",
          },
        },
        {
          element: "#sidebar-database-config-btn",
          popover: {
            title: "Database configuration",
            description:
              "This opens a modal where you can view the current database configuration that shapes the app's adminitrsative boundaries database.",
            side: "right",
            align: "center",
          },
        },
        {
          element: "#sidebar-adm-explorer-link",
          advanceOnClick: true,
          popover: {
            title: "Administrative explorer",
            description:
              "Navigate to the page for exploring the administrative boundaries data of Madagascar.",
            side: "right",
            align: "center",
            onNextClick: () => {
              handleSidebarNextClick("sidebar-adm-explorer-link", driverObj);
            },
            onPrevClick: () => {
              appLayoutStore.toggleSidebar(false);
              driverObj.movePrevious();
            },
          },
        },
        {
          element: "#adm-explorer-page-territory-distribution-summary",
          waitForElement: HIGHLIGHT_ELEMENT_QUERY_TIMEOUT,
          popover: {
            title: "Territory distribution summary",
            description:
              "A high-level overview of the total recorded administrative divisions currently mapped across Madagascar.",
            side: "bottom",
            align: "center",
          },
        },
        {
          element: "#adm-explorer-page-search-mode-section",
          waitForElement: HIGHLIGHT_ELEMENT_QUERY_TIMEOUT,
          popover: {
            title: "Administrative boundaries data search mode",
            description:
              "Switch between global mode and cascade mode in terms of searching the administrative boundaries data.",
            side: "top",
            align: "center",
          },
        },
        {
          element: "#sidebar-pins-link",
          waitForElement: HIGHLIGHT_ELEMENT_QUERY_TIMEOUT,
          popover: {
            title: "Pinned locations",
            description:
              "Navigate the page for managing the custom locations that you have pinned on the map.",
            side: "right",
            align: "center",
            onNextClick: () => {
              handleSidebarNextClick("sidebar-pins-link", driverObj);
            },
            onPrevClick: () => {
              handleSidebarNextClick(
                "sidebar-adm-explorer-link",
                driverObj,
                false,
              );
            },
          },
        },
        {
          element: "#pins-page-cta-btn",
          waitForElement: HIGHLIGHT_ELEMENT_QUERY_TIMEOUT,
          popover: {
            title: "Pin a location to the map",
            description:
              "This opens a modal where you can choose the type of pin and how you would like to pin the location to the map.",
            side: "bottom",
            align: "center",
          },
        },
        {
          element: "#pins-page-saved-locations",
          waitForElement: HIGHLIGHT_ELEMENT_QUERY_TIMEOUT,
          popover: {
            title: "Saved locations",
            description:
              "Here you can view and manage the custom locations that you have pinned to the map.",
            side: "bottom",
            align: "center",
            onNextClick: () => {
              handleWaitDrawerToggled(driverObj);
            },
          },
        },
        {
          element: "#app-map-pin-location-actions",
          popover: {
            title: "Pin a location to the map",
            description:
              "Those floating action buttons are also shortcuts for pinning a location to the map.",
            side: "left",
            align: "center",
            onPrevClick: () => {
              handleSidebarNextClick("sidebar-pins-link", driverObj, false);
            },
          },
        },
        {
          element: "#sidebar-data-sources-link",
          waitForElement: HIGHLIGHT_ELEMENT_QUERY_TIMEOUT,
          advanceOnClick: true,
          popover: {
            title: "Data sources",
            description:
              "Navigate the page for viewing the data sources that powers the app as well as for downloading their geojson files as layers to the map.",
            side: "right",
            align: "center",
            onNextClick: () => {
              handleSidebarNextClick("sidebar-data-sources-link", driverObj);
            },
            onPrevClick: () => {
              appLayoutStore.toggleSidebar(false);
              driverObj.movePrevious();
            },
          },
        },
        {
          element: "#data-sources-pages-cache-status",
          waitForElement: HIGHLIGHT_ELEMENT_QUERY_TIMEOUT,
          popover: {
            title: "Cached status of the layers",
            description:
              "The cached status of the geojson files of the administrative boundaries divisions' layers. You can download and cache the non-cached or outdated layers all at once.",
            side: "bottom",
            align: "center",
          },
        },
        {
          element: "#data-sources-adm-layers",
          waitForElement: HIGHLIGHT_ELEMENT_QUERY_TIMEOUT,
          popover: {
            title: "The administrative divisions' layers",
            description:
              "The administrative divisions' layers that are currently cached in the app. You can download and cache the non-cached layers individually.",
            side: "left",
            align: "center",
            onNextClick: () => {
              handleWaitDrawerToggled(driverObj);
            },
          },
        },
        {
          element: "#app-map-layers-switcher-control-btn",
          advanceOnClick: true,
          popover: {
            title: "Map layers control",
            description:
              "Toggle the map's view between vector tiles and satellite imagery tiles. You can also toggle the administrative divisions' layers on and off the map.",
            side: "left",
            align: "center",
            onPrevClick: () => {
              handleWaitDrawerToggled(driverObj, false);
            },
          },
        },
        {
          element: "#sidebar-walkthrough-btn",
          popover: {
            title: "Take a walkthrough",
            description:
              "Click here to take a walkthrough of the app's main features.",
            side: "right",
            align: "center",
          },
        },
      ],
      onDestroyStarted: () => {
        if (
          !driverObj.hasNextStep() ||
          confirm("Are you sure to quit the walkthrough?")
        ) {
          driverObj.destroy();
          driverRef.current = null;
          localStorage.removeItem(WALKTHROUGH_LAST_STEP_STORAGE_KEY);
        }
      },
      onPopoverRender: (popover, { index }) => {
        popover.wrapper.style.fontFamily = "var(--font-sans)";
        const btns = popover.footerButtons.querySelectorAll("button");
        for (const btn of btns) {
          btn.style.display = "flex";
          btn.classList.add(
            "btn",
            "btn-sm",
            "btn-primary",
            "flex",
            "items-center",
            "gap-x-1",
          );
          btn.classList.remove("driver-popover-footer-btn");
          if (btn.classList.contains("driver-popover-next-btn")) {
            const iconElt = document.createElement("span");
            iconElt.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right-icon lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>
            `;
            btn.appendChild(iconElt);
          }
          if (btn.classList.contains("driver-popover-prev-btn")) {
            const iconElt = document.createElement("span");
            iconElt.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-left-icon lucide-chevron-left"><path d="m15 18-6-6 6-6"/></svg>
            `;
            btn.prepend(iconElt);
          }
        }
        if (typeof index === "number" && index >= 0) {
          setLastWalkThroughStep(index);
        }
      },
    });

    return driverObj;
  }

  function injectWalkThroughDriver() {
    return driverRef.current ??= createWalkThroughDriver();
  }

  const contextValueRef = useRef<WalkThroughDriverContextValue>({
    injectWalkThroughDriver,
    getLastWalkThroughStep,
    setLastWalkThroughStep,
    getHasDoneFirstWalkThrough,
    setHasDoneFirstWalkThrough,
  });

  return (
    <walkThroughDriverContext.Provider value={contextValueRef.current}>
      {children}
    </walkThroughDriverContext.Provider>
  );
}
