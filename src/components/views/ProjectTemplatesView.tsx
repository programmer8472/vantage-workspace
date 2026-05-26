import { useQuery } from "@tanstack/react-query";
import { listProjectTemplates } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ProjectTemplatesView() {
  const { data: templates = [] } = useQuery({
    queryKey: ["project-templates"],
    queryFn: listProjectTemplates,
  });

  return (
    <ScrollArea className="h-screen">
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <header>
          <h1 className="text-xl font-semibold">Project templates</h1>
          <p className="text-sm text-muted-foreground">
            Built-in templates seed a project with a default team and Project Lead.
          </p>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="mb-1 flex items-start justify-between gap-2">
                <h3 className="text-base font-semibold">{t.name}</h3>
                <Badge variant="outline" className="text-[10px]">/{t.slug}</Badge>
              </div>
              <p className="mb-3 text-sm text-muted-foreground">{t.description}</p>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Default team
              </div>
              <ul className="mt-1.5 space-y-1">
                {t.agents.map((a) => (
                  <li
                    key={a.slug}
                    className="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1 text-sm"
                  >
                    <div>
                      <span className="font-medium">{a.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{a.role}</span>
                    </div>
                    {a.is_project_lead && (
                      <Badge className="h-4 px-1.5 text-[9px]">LEAD</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
