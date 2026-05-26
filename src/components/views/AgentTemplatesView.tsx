import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, History, Save, Check } from "lucide-react";
import {
  activatePromptVersion,
  createAgentTemplate,
  createPromptVersion,
  listAgentTemplates,
  listPromptVersions,
  updateAgentTemplate,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function AgentTemplatesView() {
  const { data: agents = [] } = useQuery({
    queryKey: ["agent-templates"],
    queryFn: listAgentTemplates,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => agents.find((a) => a.id === selectedId) ?? agents[0],
    [agents, selectedId],
  );

  return (
    <div className="grid h-screen grid-cols-[260px_1fr] overflow-hidden">
      <div className="flex flex-col border-r bg-card">
        <div className="flex h-14 items-center justify-between border-b px-4">
          <div className="text-sm font-semibold">Agent templates</div>
          <NewAgentDialog onCreated={(id) => setSelectedId(id)} />
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2">
            {agents.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                className={cn(
                  "mb-1 w-full rounded-md px-3 py-2 text-left",
                  selected?.id === a.id ? "bg-accent" : "hover:bg-accent/50",
                )}
              >
                <div className="truncate text-sm font-medium">{a.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {a.role} · /{a.slug}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
      {selected && <AgentEditor key={selected.id} agentId={selected.id} />}
    </div>
  );
}

function NewAgentDialog({ onCreated }: { onCreated: (id: string) => void }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    role: "",
    persona: "",
    system_prompt: "",
  });
  const mut = useMutation({
    mutationFn: () => createAgentTemplate(form),
    onSuccess: (a) => {
      qc.invalidateQueries({ queryKey: ["agent-templates"] });
      onCreated(a.id);
      setOpen(false);
      setForm({ name: "", role: "", persona: "", system_prompt: "" });
      toast.success("Agent template created");
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus /> New
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New agent template</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Role">
            <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          </Field>
          <Field label="Persona">
            <Textarea
              rows={2}
              value={form.persona}
              onChange={(e) => setForm({ ...form, persona: e.target.value })}
            />
          </Field>
          <Field label="System prompt">
            <Textarea
              rows={5}
              value={form.system_prompt}
              onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button
            disabled={!form.name || !form.role || !form.system_prompt || mut.isPending}
            onClick={() => mut.mutate()}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}

function AgentEditor({ agentId }: { agentId: string }) {
  const qc = useQueryClient();
  const { data: agents = [] } = useQuery({
    queryKey: ["agent-templates"],
    queryFn: listAgentTemplates,
  });
  const agent = agents.find((a) => a.id === agentId);
  const { data: versions = [] } = useQuery({
    queryKey: ["prompt-versions", agentId],
    queryFn: () => listPromptVersions(agentId),
  });

  const [form, setForm] = useState({
    role: agent?.role ?? "",
    persona: agent?.persona ?? "",
    system_prompt: agent?.system_prompt ?? "",
    model_name: agent?.model_name ?? "deepseek-chat",
    temperature: agent?.temperature ?? 0.4,
    enabled_tools: (agent?.enabled_tools ?? []).join(", "),
    memory_scope: agent?.memory_scope ?? "project",
    change_note: "",
  });

  const save = useMutation({
    mutationFn: () =>
      updateAgentTemplate(agentId, {
        role: form.role,
        persona: form.persona,
        system_prompt: form.system_prompt,
        model_name: form.model_name,
        temperature: form.temperature,
        enabled_tools: form.enabled_tools.split(",").map((s) => s.trim()).filter(Boolean),
        memory_scope: form.memory_scope,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-templates"] });
      toast.success("Saved");
    },
  });
  const newVersion = useMutation({
    mutationFn: () =>
      createPromptVersion(agentId, {
        role: form.role,
        persona: form.persona,
        system_prompt: form.system_prompt,
        model_name: form.model_name,
        temperature: form.temperature,
        enabled_tools: form.enabled_tools.split(",").map((s) => s.trim()).filter(Boolean),
        memory_scope: form.memory_scope,
        change_note: form.change_note || "Updated prompt",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prompt-versions", agentId] });
      toast.success("New prompt version created");
      setForm((f) => ({ ...f, change_note: "" }));
    },
  });
  const activate = useMutation({
    mutationFn: (versionId: string) => activatePromptVersion(agentId, versionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prompt-versions", agentId] });
      qc.invalidateQueries({ queryKey: ["agent-templates"] });
      toast.success("Version activated");
    },
  });

  if (!agent) return null;

  return (
    <ScrollArea className="flex-1">
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div>
          <h2 className="text-xl font-semibold">{agent.name}</h2>
          <div className="text-xs text-muted-foreground">
            /{agent.slug} · updated {new Date(agent.updated_at).toLocaleString()}
          </div>
        </div>

        <Card className="p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role">
              <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
            </Field>
            <Field label="Model">
              <Input
                value={form.model_name}
                onChange={(e) => setForm({ ...form, model_name: e.target.value })}
              />
            </Field>
            <Field label="Temperature">
              <Input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={form.temperature}
                onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })}
              />
            </Field>
            <Field label="Memory scope">
              <Input
                value={form.memory_scope}
                onChange={(e) => setForm({ ...form, memory_scope: e.target.value })}
              />
            </Field>
            <div className="col-span-2">
              <Field label="Enabled tools (comma-separated)">
                <Input
                  value={form.enabled_tools}
                  onChange={(e) => setForm({ ...form, enabled_tools: e.target.value })}
                />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Persona">
                <Textarea
                  rows={2}
                  value={form.persona}
                  onChange={(e) => setForm({ ...form, persona: e.target.value })}
                />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="System prompt">
                <Textarea
                  rows={8}
                  value={form.system_prompt}
                  onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
                />
              </Field>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Field label="Change note (for new prompt version)">
                <Input
                  value={form.change_note}
                  onChange={(e) => setForm({ ...form, change_note: e.target.value })}
                  placeholder="What's changing?"
                />
              </Field>
            </div>
            <Button variant="outline" onClick={() => save.mutate()} disabled={save.isPending}>
              <Save /> Save
            </Button>
            <Button onClick={() => newVersion.mutate()} disabled={newVersion.isPending}>
              <Plus /> New version
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <History className="h-4 w-4" /> Prompt version history
          </div>
          <div className="space-y-2">
            {versions
              .slice()
              .sort((a, b) => b.version_number - a.version_number)
              .map((v) => (
                <div
                  key={v.id}
                  className="flex items-start justify-between gap-3 rounded-md border p-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">v{v.version_number}</span>
                      {v.is_active && (
                        <Badge className="h-4 px-1.5 text-[9px]">ACTIVE</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(v.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{v.change_note}</div>
                  </div>
                  {!v.is_active && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => activate.mutate(v.id)}
                      disabled={activate.isPending}
                    >
                      <Check /> Activate
                    </Button>
                  )}
                </div>
              ))}
          </div>
        </Card>
      </div>
    </ScrollArea>
  );
}
