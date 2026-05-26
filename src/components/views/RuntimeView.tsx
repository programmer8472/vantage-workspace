import { useQuery } from "@tanstack/react-query";
import { getAiConfig, getDocsStatus, getRuntimeStatus } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusDot } from "@/components/StatusDot";

export function RuntimeView() {
  const { data: runtime } = useQuery({ queryKey: ["runtime"], queryFn: getRuntimeStatus });
  const { data: ai } = useQuery({ queryKey: ["ai-config"], queryFn: getAiConfig });
  const { data: docs } = useQuery({ queryKey: ["docs-status"], queryFn: getDocsStatus });

  return (
    <ScrollArea className="h-screen">
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <header>
          <h1 className="text-xl font-semibold">Runtime status</h1>
          <p className="text-sm text-muted-foreground">
            Health, readiness, and AI client visibility for operators.
          </p>
        </header>

        <Card className="p-4">
          <h2 className="mb-2 text-sm font-medium">Health check</h2>
          <Row label="GET /healthz" ok={true} value="ok" />
        </Card>

        <Card className="p-4">
          <h2 className="mb-2 text-sm font-medium">Runtime</h2>
          <Row label="Runtime ready" ok={!!runtime?.runtime_ready} />
          <Row label="Checkpointer ready" ok={!!runtime?.checkpointer_ready} />
          <Row label="Store ready" ok={!!runtime?.store_ready} />
          <Row label="Strict msgpack" ok={!!runtime?.strict_msgpack_enabled} />
          <Row label="Database target" ok={true} value={runtime?.database_target ?? "—"} />
        </Card>

        <Card className="p-4">
          <h2 className="mb-2 text-sm font-medium">AI client</h2>
          <Row label="Provider" ok={true} value={ai?.provider ?? "—"} />
          <Row label="Model" ok={true} value={ai?.model ?? "—"} />
          <Row label="API key configured" ok={!!ai?.api_key_configured} />
          <Row
            label="Mode"
            ok={!!ai?.api_key_configured}
            value={ai?.api_key_configured ? "live" : "mocked fallback"}
          />
        </Card>

        <Card className="p-4">
          <h2 className="mb-2 text-sm font-medium">Shared context docs</h2>
          <Row label="Path" ok={true} value={docs?.expected_path ?? "—"} />
          <Row label="Mounted" ok={!!docs?.mounted} />
          <Row label="Ready" ok={!!docs?.is_ready} />
          <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="mb-1 font-medium text-muted-foreground">Required</div>
              <ul className="space-y-0.5">
                {docs?.required_files.map((f) => (
                  <li key={f}>
                    <code>{f}</code>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-1 font-medium text-muted-foreground">Found</div>
              <ul className="space-y-0.5">
                {docs?.found_files.map((f) => (
                  <li key={f}>
                    <code>{f}</code>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </ScrollArea>
  );
}

function Row({ label, ok, value }: { label: string; ok: boolean; value?: string }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2">
        {value && <span className="font-mono text-xs">{value}</span>}
        <StatusDot ok={ok} />
      </span>
    </div>
  );
}
