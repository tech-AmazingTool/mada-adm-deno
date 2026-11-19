import notFoundIconURL from "@/assets/not-found-icon.jpg";
import { useHead } from "@/hooks/useHead.ts";

export default function NotFoundPage() {
  useHead({
    title: "Page not found",
  });

  return (
    <header class="text-center flex flex-col items-center">
      <h1 class="text-lg font-bold">404 Not Found</h1>
      <img
        src={notFoundIconURL}
        alt="Lost on map"
        loading="lazy"
        decoding="async"
        width="980"
        height="980"
        class="max-w-3xs"
      />
      <p class="text-base-content/80 text-sm max-w-2xs">
        The page you are looking for does not exist.
      </p>
      <a
        href="/"
        f-partial="/partials/landing"
        className="mt-4 btn btn-primary"
      >
        Go to the homepage
      </a>
    </header>
  );
}
