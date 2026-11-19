import { TargetedMouseEvent } from "preact";
import {
  ArrowDownToLine,
  CheckCircle,
  CircleAlert,
  CircleX,
  InfoIcon,
} from "lucide-preact";
import { pluralize } from "@scope/utils/string";
import { ADM_LEVEL_TITLE_BY_CODE } from "@scope/consts/models";
import { AdmGeojsonDataDownloadsToastItem } from "@/stores/adm-geojson.store.ts";
import { useStoresContext } from "@/contexts/stores/index.ts";

export default function AppToasts() {
  const admGeoJsonStore = useStoresContext().injectAdmGeojsonStore();

  const appLayoutStore = useStoresContext().injectAppLayoutStore();

  function getToastId(toast: AdmGeojsonDataDownloadsToastItem) {
    const prefix = "adm-geojson-toast";
    if (
      toast.notification === "starting" ||
      toast.notification === "updates-available"
    ) {
      return `${prefix}-${toast.notification}`;
    } else {
      return `${prefix}-${(toast.notification as "success" | "error")}`;
    }
  }

  function handleToastLinkClick(
    e: TargetedMouseEvent<HTMLAnchorElement>,
    toast: AdmGeojsonDataDownloadsToastItem,
  ) {
    e.preventDefault();
    appLayoutStore.sidebarIsOpen.value = true;
    admGeoJsonStore.removeAdmGeojsonDataDownloadsToast(toast);
  }

  return (
    <div
      class="toast"
      style="z-index: calc(var(--base-z-index) + 40); width: min(calc(100vw - 2 * 16px), 380px)"
    >
      {admGeoJsonStore.admGeoJsonDataDownloadsToasts.value.map((toast) => {
        const alertType = toast.type === "info"
          ? "alert-info"
          : (toast.type === "warning"
            ? "alert-warning"
            : (toast.type === "success" ? "alert-success" : "alert-error"));
        return (
          <div
            key={getToastId(toast)}
            class={`alert ${alertType} alert-vertical sm:alert-horizontal`}
          >
            <div>
              {toast.notification === "starting"
                ? <ArrowDownToLine class="animate-pulse" />
                : (toast.type === "success" ? <CheckCircle /> : (
                  toast.type === "error" ? <CircleX /> : (
                    toast.type === "warning" ? <CircleAlert /> : <InfoIcon />
                  )
                ))}
            </div>
            <p>
              {toast.notification === "starting"
                ? (
                  <>
                    The {pluralize(
                      "download",
                      "+s",
                      toast.admLevelCodes.length > 1,
                    )} of {toast.admLevelCodes.length === 1
                      ? (
                        <>
                          the{" "}
                          <strong>
                            <a
                              href="/data-sources?layer=first-in-downloads"
                              f-partial="/partials/data-sources"
                              onClick={(e) => handleToastLinkClick(e, toast)}
                            >
                              {toast.admLevelCodes[0]}:{" "}
                              <span className="capitalize">
                                {ADM_LEVEL_TITLE_BY_CODE.get(
                                  toast.admLevelCodes[0],
                                )!}
                              </span>
                            </a>
                          </strong>{" "}
                          layer has started.
                        </>
                      )
                      : (
                        <>
                          <strong>
                            <a
                              href="/data-sources?layer=first-in-downloads"
                              f-partial="/partials/data-sources"
                              onClick={(e) => handleToastLinkClick(e, toast)}
                            >
                              {toast.admLevelCodes.length} layers
                            </a>
                          </strong>{" "}
                          has started.
                        </>
                      )}
                  </>
                )
                : toast.notification === "updates-available"
                ? (
                  <>
                    <strong>
                      <a
                        href="/data-sources?layer=first-updatable"
                        f-partial="/partials/data-sources"
                        onClick={(e) => handleToastLinkClick(e, toast)}
                      >
                        {toast.admLevelCodes.length} {pluralize(
                          "layer",
                          "+s",
                          toast.admLevelCodes.length > 1,
                        )}
                      </a>
                    </strong>{" "}
                    can be updated.
                  </>
                )
                : toast.notification === "success"
                ? (
                  <>
                    The download of the{" "}
                    <strong>
                      <a
                        href={`/data-sources?layer=${toast.admLevelCode}`}
                        f-partial="/partials/data-sources"
                        onClick={(e) => handleToastLinkClick(e, toast)}
                      >
                        {toast.admLevelCode}
                        {": "}
                        <span className="capitalize">
                          {ADM_LEVEL_TITLE_BY_CODE.get(toast.admLevelCode)!}
                        </span>
                      </a>
                    </strong>{" "}
                    layer is complete.
                  </>
                )
                : (
                  <>
                    Failed to download the{" "}
                    <strong>
                      <a
                        href={`/data-sources?layer=${toast.admLevelCode}`}
                        f-partial="/partials/data-sources"
                        onClick={(e) => handleToastLinkClick(e, toast)}
                      >
                        {toast.admLevelCode}
                        {": "}
                        <span className="capitalize">
                          {ADM_LEVEL_TITLE_BY_CODE.get(toast.admLevelCode)!}
                        </span>
                      </a>
                    </strong>{" "}
                    layer.
                  </>
                )}
            </p>
            <button
              type="button"
              class="btn btn-sm"
              onClick={() =>
                admGeoJsonStore.removeAdmGeojsonDataDownloadsToast(toast)}
            >
              Close
            </button>
          </div>
        );
      })}
    </div>
  );
}
