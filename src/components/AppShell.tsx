import { useState } from "react";
import { Activity, Bot, FolderKanban, LayoutGrid, ServerCog } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dashboard } from "./views/Dashboard";
import { AgentTemplatesView } from "./views/AgentTemplatesView";
import { ProjectTemplatesView } from "./views/ProjectTemplatesView";
import { RuntimeView } from "./views/RuntimeView";

type View = "dashboard" | "agents" | "templates" | "runtime";

const NAV: { id: View; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "dashboard", label: "Projects", icon: LayoutGrid },
  { id: "agents", label: "Agent templates", icon: Bot },
  { id: "templates", label: "Project templates", icon: FolderKanban },
  { id: "runtime", label: "Runtime", icon: ServerCog },
];

export function AppShell() {
  const [view, setView] = useState<View>("dashboard");

  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="flex w-56 flex-col border-r bg-card">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Activity className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Vantage</div>
            <div className="text-[11px] text-muted-foreground">Virtual Office</div>
          </div>
        </div>
        <nav className="flex-1 p-2">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = view === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </button>
            );
          })}
        </nav>
        <div className="border-t p-3 text-[11px] text-muted-foreground">
          Internal operator console
        </div>
      </aside>
      <main className="flex-1 overflow-hidden">
        {view === "dashboard" && <Dashboard />}
        {view === "agents" && <AgentTemplatesView />}
        {view === "templates" && <ProjectTemplatesView />}
        {view === "runtime" && <RuntimeView />}
      </main>
    </div>
  );
}
