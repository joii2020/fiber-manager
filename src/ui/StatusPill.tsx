import type { NodeStatus } from "../schemas/managed-node";

const statusClassName: Record<NodeStatus, string> = {
  connected: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  connecting: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  disconnected: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  error: "border-rose-400/30 bg-rose-400/10 text-rose-300"
};

export function StatusPill({ status }: { status: NodeStatus }) {
  return (
    <span className={`inline-flex h-6 items-center rounded-full border px-2 text-xs font-medium ${statusClassName[status]}`}>
      {status}
    </span>
  );
}
