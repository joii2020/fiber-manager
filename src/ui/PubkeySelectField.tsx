import { ChevronDown } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ManagedNode } from "../schemas/managed-node";

type PubkeySelectFieldProps = {
  label: string;
  required?: boolean;
  value: string;
  onChange(value: string): void;
  nodes: ManagedNode[];
  activeNodeId: string;
  placeholder?: string;
  autoFocus?: boolean;
};

type PubkeyOption = {
  id: string;
  name: string;
  pubkey: string;
};

export function PubkeySelectField({
  label,
  required = false,
  value,
  onChange,
  nodes,
  activeNodeId,
  placeholder,
  autoFocus = false
}: PubkeySelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const customInputRef = useRef<HTMLInputElement | null>(null);
  const options = useMemo(
    () => readConnectedPubkeyOptions(nodes, activeNodeId),
    [nodes, activeNodeId]
  );

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) {
        return;
      }
      setIsOpen(false);
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function handleOptionSelect(pubkey: string) {
    onChange(pubkey);
    setIsOpen(false);
  }

  return (
    <div ref={rootRef} className="relative block text-[11px] text-slate-500">
      <label htmlFor={inputId}>
        {label}{required ? <span className="text-red-300"> *</span> : null}
      </label>
      <div className="mt-1 flex h-8 rounded-md border border-white/10 bg-slate-950/60 focus-within:border-ckb">
        <input
          id={inputId}
          autoFocus={autoFocus}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder ?? label}
          className="min-w-0 flex-1 rounded-l-md bg-transparent px-2 font-mono text-xs text-slate-200 outline-none"
        />
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="flex w-8 shrink-0 items-center justify-center rounded-r-md border-l border-white/10 text-slate-400 transition hover:bg-white/5 hover:text-white"
          aria-label={`Select ${label}`}
          aria-expanded={isOpen}
        >
          <ChevronDown className={`h-3.5 w-3.5 transition ${isOpen ? "rotate-180 text-ckb" : ""}`} aria-hidden />
        </button>
      </div>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-white/10 bg-slate-900 shadow-2xl">
          <div className="max-h-52 overflow-y-auto py-1">
            {options.length > 0 ? (
              options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleOptionSelect(option.pubkey)}
                  className="grid w-full grid-cols-1 gap-0.5 px-2 py-2 text-left transition hover:bg-white/[0.06]"
                  title={option.pubkey}
                >
                  <span className="truncate text-xs font-medium text-slate-200">
                    {formatPubkeyOptionLabel(option)}
                  </span>
                  <span className="truncate font-mono text-[10px] text-slate-500">
                    {option.pubkey}
                  </span>
                </button>
              ))
            ) : (
              <div className="px-2 py-2 text-xs text-slate-500">No connected peer nodes</div>
            )}
          </div>
          <div className="border-t border-white/10 p-2">
            <input
              ref={customInputRef}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder="custom pubkey"
              className="h-8 w-full rounded-md border border-white/10 bg-slate-950/70 px-2 font-mono text-xs text-slate-200 outline-none focus:border-ckb"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function readConnectedPubkeyOptions(nodes: ManagedNode[], activeNodeId: string): PubkeyOption[] {
  return nodes
    .filter((node) => node.id !== activeNodeId && node.status === "connected" && node.pubkey)
    .map((node) => ({
      id: node.id,
      name: node.name,
      pubkey: node.pubkey ?? ""
    }));
}

function formatPubkeyOptionLabel(option: PubkeyOption): string {
  return `${option.name}(${shortenPubkey(option.pubkey)})`;
}

function shortenPubkey(pubkey: string): string {
  if (pubkey.length <= 24) {
    return pubkey;
  }

  return `${pubkey.slice(0, 12)}...${pubkey.slice(-8)}`;
}
