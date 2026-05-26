import { cn } from "@/lib/utils";

export function StatusDot({ ok, className }: { ok: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        ok ? "bg-emerald-500" : "bg-amber-500",
        className,
      )}
    />
  );
}
