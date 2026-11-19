import type { ComponentChildren } from "preact";
import { AdmLevelCode } from "@scope/consts/models";
import AppMap from "@/components/shell/AppMap.tsx";
import ViewConfigModal from "@/components/shell/ViewConfigModal.tsx";
import AppLogoLink from "@/components/shell/AppLogoLink.tsx";
import SidebarAdmExplorerLink from "@/components/shell/SidebarAdmExplorerLink.tsx";
import SidebarDataSourcesLink from "@/components/shell/SidebarDataSourcesLink.tsx";
import SidebarPinsLink from "@/components/shell/SidebarPinsLink.tsx";
import RoutePageDrawer from "@/components/shell/RoutePageDrawer.tsx";
import AppToasts from "@/components/shell/AppToasts.tsx";
import SidebarWalkthroughBtn from "@/components/shell/SidebarWalkthroughBtn.tsx";
import { WalkthroughDriverProvider } from "@/contexts/walkthrough-driver/index.ts";

const ADM_DATA_VERSION_BY_CODE = new Map<AdmLevelCode, number>([
  [
    AdmLevelCode.PROVINCE,
    import.meta.env.VITE_PROVINCE_ADM_GEOJSON_VERSION
      ? parseInt(import.meta.env.VITE_PROVINCE_ADM_GEOJSON_VERSION)
      : 1,
  ],
  [
    AdmLevelCode.REGION,
    import.meta.env.VITE_REGION_ADM_GEOJSON_VERSION
      ? parseInt(import.meta.env.VITE_REGION_ADM_GEOJSON_VERSION as string)
      : 1,
  ],
  [
    AdmLevelCode.DISTRICT,
    import.meta.env.VITE_DISTRICT_ADM_GEOJSON_VERSION
      ? parseInt(import.meta.env.VITE_DISTRICT_ADM_GEOJSON_VERSION as string)
      : 1,
  ],
  [
    AdmLevelCode.COMMUNE,
    import.meta.env.VITE_COMMUNE_ADM_GEOJSON_VERSION
      ? parseInt(import.meta.env.VITE_COMMUNE_ADM_GEOJSON_VERSION as string)
      : 1,
  ],
  [
    AdmLevelCode.FOKONTANY,
    import.meta.env.VITE_FOKONTANY_ADM_GEOJSON_VERSION
      ? parseInt(import.meta.env.VITE_FOKONTANY_ADM_GEOJSON_VERSION as string)
      : 1,
  ],
]);

export type AppLayoutProps = {
  children: ComponentChildren;
};

export default function AppLayout({ children }: AppLayoutProps) {
  const isActive = (_: string) => false;

  return (
    <WalkthroughDriverProvider>
      <div f-client-nav class="w-screen h-dvh max-h-dvh flex">
        <div
          class="border-r border-slate-300 py-3 relative z-10 bg-white"
          style="width: var(--sidebar-width); z-index: calc(var(--base-z-index) + 40)"
        >
          <header class="h-full flex flex-col justify-between gap-y-12">
            <div class="flex flex-col gap-y-5 items-center">
              <AppLogoLink />
              <hr class="text-base-content/20 w-2/3" />
              <nav>
                <ul class="flex flex-col list-none p-0 m-0 gap-x-0">
                  <li>
                    <SidebarAdmExplorerLink
                      isActive={isActive("/adm-explorer")}
                    />
                  </li>
                  <li>
                    <SidebarPinsLink isActive={isActive("/pins")} />
                  </li>
                  <li>
                    <SidebarDataSourcesLink
                      isActive={isActive("/data-sources")}
                    />
                  </li>
                </ul>
              </nav>
            </div>
            <div class="flex flex-col gap-y-3 items-center">
              <SidebarWalkthroughBtn />
              <ViewConfigModal />
            </div>
          </header>
        </div>
        <RoutePageDrawer>
          {children}
        </RoutePageDrawer>
        <div className="grow shrink basis-auto h-full">
          <AppMap admGeojsonDataVersionByCode={ADM_DATA_VERSION_BY_CODE} />
        </div>
        <AppToasts />
      </div>
    </WalkthroughDriverProvider>
  );
}
