import { Activity, Coins, Layers3, Network, type LucideIcon } from "lucide-react";

export type WorkspaceSection = "overview" | "network" | "channels" | "payments";

export const workspaceSections: Array<{
  id: WorkspaceSection;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "network", label: "Network", icon: Network },
  { id: "channels", label: "Channels", icon: Layers3 },
  { id: "payments", label: "Payments", icon: Coins }
];

export function readWorkspaceSectionFromHash(): WorkspaceSection {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const section = hash.split(/[/?&]/)[0];
  return isWorkspaceSection(section) ? section : "overview";
}

export function writeWorkspaceSectionHash(section: WorkspaceSection) {
  const nextHash = `#${section}`;
  if (window.location.hash === nextHash) return;

  window.location.hash = section;
}

function isWorkspaceSection(value: string): value is WorkspaceSection {
  return workspaceSections.some((section) => section.id === value);
}
