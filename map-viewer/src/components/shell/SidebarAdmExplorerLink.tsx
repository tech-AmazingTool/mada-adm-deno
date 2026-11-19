import { Search } from "lucide-preact";
import SidebarNavLink from "@/components/shared/SidebarNavLink.tsx";

export default function SidebarAdmExplorerLink() {
  return (
    <SidebarNavLink
      href="/adm-explorer"
      id="sidebar-adm-explorer-link"
      Icon={Search}
      tooltip="Administrative explorer"
    >
      ADM explorer
    </SidebarNavLink>
  );
}
