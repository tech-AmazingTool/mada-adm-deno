import {
  DatabaseIcon,
  ExternalLinkIcon,
  PinIcon,
  SearchIcon,
  SettingsIcon,
} from "lucide-preact";
import LandingPageWalkthroughBtn from "@/pages/LandingPageWalkthroughBtn.tsx";
import LandingPageDbConfigStatus from "@/pages/LandingPageDbConfigStatus.tsx";
import { useHead } from "@/hooks/useHead.ts";

export default function LandingPage() {
  useHead({
    title: "Map Viewer - Mada ADM",
    description:
      "An interactive map viewer for Madagascar administrative boundaries.",
  });

  return (
    <main class="pb-8">
      <header>
        <h1 class="font-bold text-lg mb-2">
          Map Viewer - Mada ADM
        </h1>
        <p class="text-sm text-base-content/90">
          An interactive <strong>geospatial workspace</strong> designed to{" "}
          <strong>query</strong>, <strong>analyze</strong>, and{" "}
          <strong>visualize</strong>{" "}
          <a
            href="https://en.wikipedia.org/wiki/List_of_administrative_divisions_by_country"
            target="_blank"
            class="link link-primary"
          >
            Madagascar's administrative divisions{" "}
            <ExternalLinkIcon
              size={14}
              class="inline-block relative bottom-0.5"
            />
          </a>{" "}
          — from <strong>Provinces</strong> down to <strong>Fokontany</strong>,
          {" "}
          as a part of the{" "}
          <a
            href="https://github.com/tech-AmazingTool/madagascar-administrative-boundaries"
            target="_blank"
            class="link link-primary"
          >
            Mada ADM{" "}
            <ExternalLinkIcon
              size={14}
              class="inline-block relative bottom-0.5"
            />
          </a>{" "}
          tool project.
        </p>
        <div className="flex gap-x-3 mt-5">
          <button type="button" className="btn btn-primary">
            <SearchIcon size={18} />
            Explore data
          </button>
          <a
            href="https://github.com/tech-AmazingTool/mada-adm-deno/tree/main/map-viewer"
            target="_blank"
            className="btn btn-neutral"
          >
            <svg
              width="18px"
              height="18px"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              fill="#ffffff"
            >
              <path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm3.163 21.783h-.093a.513.513 0 0 1-.382-.14.513.513 0 0 1-.14-.372v-1.406c.006-.467.01-.94.01-1.416a3.693 3.693 0 0 0-.151-1.028 1.832 1.832 0 0 0-.542-.875 8.014 8.014 0 0 0 2.038-.471 4.051 4.051 0 0 0 1.466-.964c.407-.427.71-.943.885-1.506a6.77 6.77 0 0 0 .3-2.13 4.138 4.138 0 0 0-.26-1.476 3.892 3.892 0 0 0-.795-1.284 2.81 2.81 0 0 0 .162-.582c.033-.2.05-.402.05-.604 0-.26-.03-.52-.09-.773a5.309 5.309 0 0 0-.221-.763.293.293 0 0 0-.111-.02h-.11c-.23.002-.456.04-.674.111a5.34 5.34 0 0 0-.703.26 6.503 6.503 0 0 0-.661.343c-.215.127-.405.249-.573.362a9.578 9.578 0 0 0-5.143 0 13.507 13.507 0 0 0-.572-.362 6.022 6.022 0 0 0-.672-.342 4.516 4.516 0 0 0-.705-.261 2.203 2.203 0 0 0-.662-.111h-.11a.29.29 0 0 0-.11.02 5.844 5.844 0 0 0-.23.763c-.054.254-.08.513-.081.773 0 .202.017.404.051.604.033.199.086.394.16.582A3.888 3.888 0 0 0 5.702 10a4.142 4.142 0 0 0-.263 1.476 6.871 6.871 0 0 0 .292 2.12c.181.563.483 1.08.884 1.516.415.422.915.75 1.466.964.653.25 1.337.41 2.033.476a1.828 1.828 0 0 0-.452.633 2.99 2.99 0 0 0-.2.744 2.754 2.754 0 0 1-1.175.27 1.788 1.788 0 0 1-1.065-.3 2.904 2.904 0 0 1-.752-.824 3.1 3.1 0 0 0-.292-.382 2.693 2.693 0 0 0-.372-.343 1.841 1.841 0 0 0-.432-.24 1.2 1.2 0 0 0-.481-.101c-.04.001-.08.005-.12.01a.649.649 0 0 0-.162.02.408.408 0 0 0-.13.06.116.116 0 0 0-.06.1.33.33 0 0 0 .14.242c.093.074.17.131.232.171l.03.021c.133.103.261.214.382.333.112.098.213.209.3.33.09.119.168.246.231.381.073.134.15.288.231.463.188.474.522.875.954 1.145.453.243.961.364 1.476.351.174 0 .349-.01.522-.03.172-.028.343-.057.515-.091v1.743a.5.5 0 0 1-.533.521h-.062a10.286 10.286 0 1 1 6.324 0v.005z" />
            </svg>
            View Github
          </a>
        </div>
      </header>

      <section
        aria-labelledby="landing-page-quick-navigation-title"
        class="mt-8"
      >
        <h2 id="landing-page-quick-navigation-title" class="font-bold mb-2">
          Quick Navigation
        </h2>
        <ul className="m-0 p-0 space-y-3">
          <li>
            <a
              href="/adm-explorer"
              f-partial="/partials/adm-explorer"
              class="flex gap-x-2.5 p-3 shadow shadow-base-content/25 hover:shadow-lg cursor-pointer rounded-md duration-300"
            >
              <SearchIcon
                size={17}
                class="text-primary shrink-0 mt-1"
                stroke-width="3"
              />
              <div>
                <h3 className="font-bold hover:underline hover:text-primary duration-200">
                  Administrative explorer
                </h3>
                <p className="text-sm mt-1">
                  Explore the administrative boundaries data of Madagascar
                  through flexible search modes.
                </p>
              </div>
            </a>
          </li>
          <li>
            <a
              href="/pins"
              f-partial="/partials/pins"
              class="flex gap-x-2.5 p-3 shadow shadow-base-content/25 hover:shadow-lg cursor-pointer rounded-md duration-300"
            >
              <PinIcon
                size={17}
                class="text-primary shrink-0 mt-1"
                stroke-width="3"
              />
              <div>
                <h3 className="font-bold hover:underline hover:text-primary duration-200">
                  Pinned locations
                </h3>
                <p className="text-sm mt-1">
                  Pin custom locations to the map, then view and organize them
                  in one place.
                </p>
              </div>
            </a>
          </li>
          <li>
            <a
              href="/data-sources"
              f-partial="/partials/data-sources"
              class="flex gap-x-2.5 p-3 shadow shadow-base-content/25 hover:shadow-lg cursor-pointer rounded-md duration-300"
            >
              <DatabaseIcon
                size={17}
                class="text-primary shrink-0 mt-1"
                stroke-width="3"
              />
              <div>
                <h3 className="font-bold hover:underline hover:text-primary duration-200">
                  Data sources
                </h3>
                <p className="text-sm mt-1">
                  View the data sources of the app's database and cache them as
                  the map's layers.
                </p>
              </div>
            </a>
          </li>
          <li>
            <LandingPageWalkthroughBtn />
          </li>
        </ul>
      </section>

      <section aria-labelled-by="landing-page-db-config-title" class="mt-8">
        <h2 id="landing-page-db-config-title" class="mb-1 font-bold">
          Database Configuration
        </h2>
        <p class="text-base-content/90 mt-1.5 mb-3 text-sm">
          View the configuration that dictates the app's Madagascar
          administrative boundaries database schema.
        </p>
        <button
          type="button"
          command="show-modal"
          commandfor="config-modal"
          className="btn btn-primary"
        >
          <SettingsIcon size={16} />
          View database configuration
        </button>
        <LandingPageDbConfigStatus />
      </section>
    </main>
  );
}
