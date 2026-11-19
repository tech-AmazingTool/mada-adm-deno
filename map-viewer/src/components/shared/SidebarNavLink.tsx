import { ComponentChildren, FunctionComponent } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { useLocation } from "preact-iso";
import { LucideProps } from "lucide-preact";
import { useStoresContext } from "@/contexts/stores/index.ts";

export type SidebarNavLinkProps = {
  href: string;
  id?: string;
  Icon: FunctionComponent<LucideProps>;
  children: ComponentChildren;
  tooltip: string;
};

export default function SidebarNavLink({
  href,
  id,
  Icon,
  children,
  tooltip,
}: SidebarNavLinkProps) {
  const { path } = useLocation();

  const appLayoutStore = useStoresContext().injectAppLayoutStore();

  const aElRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const isActive = path.startsWith(href);
    isActive
      ? aElRef.current?.setAttribute("aria-current", "page")
      : aElRef.current?.removeAttribute("aria-current");
  }, [path]);

  return (
    <div className="tooltip tooltip-right" data-tip={tooltip}>
      <a
        ref={aElRef}
        href={href}
        id={id}
        class={`relative flex flex-col items-center gap-1 text-center border-l-4 pr-2 pl-1 py-3 border-transparent aria-[current=page]:border-primary aria-[current=page]:text-primary hover:bg-slate-300 text-base-content/90 hover:text-base-content duration-300`}
        onClick={() => appLayoutStore.toggleSidebar(true)}
      >
        <Icon size={32} />
        <div class="uppercase" style="font-size: 0.625rem">{children}</div>
      </a>
    </div>
  );
}
