import { useComputed } from "@preact/signals";
import { ArrowDownToLine, Database } from "lucide-preact";
import { useStoresContext } from "@/contexts/stores/index.ts";
import SidebarNavLink from "@/components/shared/SidebarNavLink.tsx";

import { pluralize } from "@scope/utils/string";

export default function SidebarDataSourcesLink() {
  const admGeoJsonStore = useStoresContext().injectAdmGeojsonStore();

  const activeDownloadsCount = useComputed(() => {
    return admGeoJsonStore.downloads.value.filter((d) =>
      d.status === "idle" || d.status === "downloading"
    ).length;
  });

  const hasActiveDownloads = useComputed(() => {
    return activeDownloadsCount.value > 0;
  });

  const tooltipText = useComputed(() => {
    let text = "Data sources";
    if (hasActiveDownloads.value) {
      text += ` · Downloading ${activeDownloadsCount.value} ${
        pluralize("layer", "+s", activeDownloadsCount.value > 1)
      }`;
    } else if (admGeoJsonStore.layersToDownload.value?.cached.length) {
      const count = admGeoJsonStore.layersToDownload.value.cached.length;
      text += ` · ${count} ${pluralize("layer", "+s", count > 1)} ${
        pluralize("is", "are", count > 1)
      } out-of-date`;
    }
    return text;
  });

  return (
    <SidebarNavLink
      href="/data-sources"
      id="sidebar-data-sources-link"
      Icon={Database}
      tooltip={tooltipText.value}
    >
      Data sources
      {hasActiveDownloads.value
        ? (
          <div
            class="absolute flex items-center justify-center"
            style="width: 24px; height: 24px; clip-path: circle(12px at 12px 12px); top: 2px; right: 2px;"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin"
              style="animation-duration: 2s"
            >
              <circle
                cx="12"
                cy="12"
                r="12"
                fill="none"
                stroke="var(--color-info)"
                stroke-width="2"
                stroke-dasharray="8 4"
              />
            </svg>
            <span
              class="flex items-center justify-center relative bg-info"
              style="border: 1px solid #fff; border-radius: 50%; width: 20px; height: 20px;"
            >
              <ArrowDownToLine size={12} class="text-info-content" />
            </span>
          </div>
        )
        : (admGeoJsonStore.layersToDownload.value &&
          admGeoJsonStore.layersToDownload.value.cached.length > 0 && (
          <span
            class="absolute top-2 right-2 bg-warning"
            style="border-radius: 50%; width: 8px; height: 8px;"
          >
          </span>
        ))}
    </SidebarNavLink>
  );
}
