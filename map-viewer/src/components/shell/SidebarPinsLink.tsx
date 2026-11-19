import { Pin } from "lucide-preact";
import SidebarNavLink from "@/components/shared/SidebarNavLink.tsx";

export default function SidebarPinsLink() {
  return (
    <SidebarNavLink
      href="/pins"
      id="sidebar-pins-link"
      Icon={Pin}
      tooltip="Pinned locations"
    >
      Pinned locations
    </SidebarNavLink>
  );
}
