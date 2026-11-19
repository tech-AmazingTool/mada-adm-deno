import { useEffect } from "preact/hooks";

const SITE_NAME = "Map Viewer by Mada ADM";

type MetaKey = { attr: "name" | "property"; key: string };

function setMeta({ attr, key }: MetaKey, content: string): () => void {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  const created = !el;
  const previous = el?.getAttribute("content") ?? null;

  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);

  // Cleanup: remove the tag if we created it, otherwise restore its old value
  return () => {
    if (created) {
      el.remove();
    } else if (previous !== null) {
      el.setAttribute("content", previous);
    }
  };
}

export interface HeadOptions {
  title: string;
  description?: string;
}

export function useHead({ title, description }: HeadOptions): void {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    const cleanups: Array<() => void> = [
      setMeta({ attr: "property", key: "og:title" }, title),
      setMeta({ attr: "property", key: "og:type" }, "website"),
      setMeta({ attr: "property", key: "og:site_name" }, SITE_NAME),
      setMeta({ attr: "name", key: "twitter:card" }, "summary_large_image"),
      setMeta({ attr: "name", key: "twitter:title" }, title),
    ];

    if (description !== undefined) {
      cleanups.push(
        setMeta({ attr: "name", key: "description" }, description),
        setMeta({ attr: "property", key: "og:description" }, description),
        setMeta({ attr: "name", key: "twitter:description" }, description),
      );
    }

    return () => {
      document.title = previousTitle;
      // Reverse order so restoration mirrors creation
      for (const cleanup of cleanups.reverse()) cleanup();
    };
  }, [title, description]);
}
