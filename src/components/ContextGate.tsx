import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { getDocsStatus, setDocsReady } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ContextGate({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["docs-status"],
    queryFn: getDocsStatus,
  });

  if (isLoading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Checking shared context…
      </div>
    );
  }

  if (data.is_ready) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Shared context not ready
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            The main dashboard is unavailable until required shared docs are mounted.
          </p>
          <div className="rounded-md border bg-card p-3 font-mono text-xs">
            <div>
              <span className="text-muted-foreground">expected_path:</span> {data.expected_path}
            </div>
            <div>
              <span className="text-muted-foreground">mounted:</span> {String(data.mounted)}
            </div>
            <div>
              <span className="text-muted-foreground">path_exists:</span> {String(data.path_exists)}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Missing files
            </div>
            <ul className="mt-1 space-y-1">
              {data.missing_files.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                  <code>{f}</code>
                </li>
              ))}
              {data.missing_files.length === 0 && (
                <li className="text-sm text-muted-foreground">None reported.</li>
              )}
            </ul>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Found files
            </div>
            <ul className="mt-1 space-y-1">
              {data.found_files.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <code>{f}</code>
                </li>
              ))}
              {data.found_files.length === 0 && (
                <li className="text-sm text-muted-foreground">None found.</li>
              )}
            </ul>
          </div>
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={isFetching ? "animate-spin" : ""} />
              Recheck
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDocsReady(true);
                qc.invalidateQueries({ queryKey: ["docs-status"] });
              }}
            >
              Simulate fix (dev)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
