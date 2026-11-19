export const PAGE_CONTENT_DRAWER_DEFAULT_OPEN =
  import.meta.env.VITE_FRESH_PUBLIC_PAGE_CONTENT_DRAWER_DEFAULT_OPEN
    ? (
      import.meta.env.VITE_FRESH_PUBLIC_PAGE_CONTENT_DRAWER_DEFAULT_OPEN!
        .toLowerCase() === "true"
    )
    : false;
