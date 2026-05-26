import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy as CopyIcon,
  FileText,
  MessageSquarePlus,
  Plus,
  Send,
  Upload,
  Users,
} from "lucide-react";
import {
  assignAgentToProject,
  copyProject,
  createProject,
  getAiConfig,
  getProject,
  getRuntimeStatus,
  getThread,
  listAgentTemplates,
  listContextFiles,
  listProjectAgents,
  listProjectTemplates,
  listProjects,
  listThreads,
  createProjectThread,
  sendMessage,
  uploadContextFile,
} from "@/lib/api";
import type { Project } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { StatusDot } from "@/components/StatusDot";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60_000) return "just now";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
  return `${Math.floor(d / 86_400_000)}d ago`;
}

export function Dashboard() {
  const qc = useQueryClient();
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: listProjects });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && projects[0]) setSelectedId(projects[0].id);
  }, [projects, selectedId]);

  return (
    <div className="grid h-screen grid-cols-[280px_1fr_320px] overflow-hidden">
      <ProjectsSidebar
        projects={projects}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onCreated={(p) => {
          qc.invalidateQueries({ queryKey: ["projects"] });
          setSelectedId(p.id);
        }}
      />
      {selectedId ? (
        <ProjectWorkspace projectId={selectedId} />
      ) : (
        <div className="flex items-center justify-center text-sm text-muted-foreground">
          Select or create a project to get started.
        </div>
      )}
      {selectedId && <ProjectDetailsPanel projectId={selectedId} />}
    </div>
  );
}

// ---------------- Sidebar ----------------
function ProjectsSidebar({
  projects,
  selectedId,
  onSelect,
  onCreated,
}: {
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreated: (p: Project) => void;
}) {
  return (
    <div className="flex flex-col border-r bg-card">
      <div className="flex h-14 items-center justify-between border-b px-4">
        <div className="text-sm font-semibold">Projects</div>
        <NewProjectDialog onCreated={onCreated} />
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {projects.length === 0 && (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              No projects yet. Create one to begin.
            </div>
          )}
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={cn(
                "mb-1 w-full rounded-md px-3 py-2 text-left transition-colors",
                selectedId === p.id ? "bg-accent" : "hover:bg-accent/50",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-sm font-medium">{p.name}</div>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {p.status}
                </Badge>
              </div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                {p.project_template_name ?? "Custom"} · {p.agent_count} agents
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function NewProjectDialog({ onCreated }: { onCreated: (p: Project) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templateSlug, setTemplateSlug] = useState<string>("__none__");
  const { data: templates = [] } = useQuery({
    queryKey: ["project-templates"],
    queryFn: listProjectTemplates,
  });

  const create = useMutation({
    mutationFn: () =>
      createProject({
        name,
        description,
        template_slug: templateSlug === "__none__" ? null : templateSlug,
      }),
    onSuccess: (p) => {
      toast.success(`Project "${p.name}" created`);
      onCreated(p);
      setOpen(false);
      setName("");
      setDescription("");
      setTemplateSlug("__none__");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus /> New
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1.5 block">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme launch" />
          </div>
          <div>
            <Label className="mb-1.5 block">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project for?"
              rows={3}
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Template</Label>
            <Select value={templateSlug} onValueChange={setTemplateSlug}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Blank / custom (no template)</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.slug}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              A Project Lead is auto-added if the template doesn't include one.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!name.trim() || create.isPending}
            onClick={() => create.mutate()}
          >
            Create project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- Workspace (center) ----------------
function ProjectWorkspace({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
  });
  const { data: threads = [] } = useQuery({
    queryKey: ["threads", projectId],
    queryFn: () => listThreads(projectId),
  });
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  useEffect(() => {
    if (threads.length && !threads.some((t) => t.id === activeThreadId)) {
      setActiveThreadId(threads[0].id);
    }
    if (!threads.length) setActiveThreadId(null);
  }, [threads, activeThreadId]);

  const createThread = useMutation({
    mutationFn: () => createProjectThread(projectId),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ["threads", projectId] });
      setActiveThreadId(t.id);
    },
  });

  if (!project) return null;

  return (
    <div className="flex flex-col overflow-hidden">
      <header className="flex h-14 items-center justify-between border-b bg-card px-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold">{project.name}</h2>
            <Badge variant="secondary" className="text-[10px]">
              /{project.slug}
            </Badge>
          </div>
          <div className="truncate text-xs text-muted-foreground">{project.description}</div>
        </div>
        <CopyProjectDialog project={project} />
      </header>
      <div className="grid flex-1 grid-cols-[220px_1fr] overflow-hidden">
        {/* Threads list */}
        <div className="flex flex-col border-r bg-card/50">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Threads
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => createThread.mutate()}
            >
              <MessageSquarePlus />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="px-2 pb-2">
              {threads.length === 0 && (
                <div className="px-2 py-6 text-center text-xs text-muted-foreground">
                  No threads. Send a message to start one.
                </div>
              )}
              {threads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveThreadId(t.id)}
                  className={cn(
                    "mb-1 w-full rounded-md px-2 py-1.5 text-left",
                    activeThreadId === t.id ? "bg-accent" : "hover:bg-accent/50",
                  )}
                >
                  <div className="truncate text-sm">{t.title}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {t.message_count} msg · {timeAgo(t.updated_at)}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
        <ChatPane projectId={projectId} threadId={activeThreadId} onThreadCreated={setActiveThreadId} />
      </div>
    </div>
  );
}

function CopyProjectDialog({ project }: { project: Project }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(`${project.name} (copy)`);
  const mut = useMutation({
    mutationFn: () => copyProject(project.id, { name }),
    onSuccess: (p) => {
      toast.success(`Copied as "${p.name}"`);
      qc.invalidateQueries({ queryKey: ["projects"] });
      setOpen(false);
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <CopyIcon /> Copy project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy project</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Preserves assigned agents, linked template, and uploaded context files.
        </p>
        <div>
          <Label className="mb-1.5 block">New name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={() => mut.mutate()} disabled={!name.trim() || mut.isPending}>
            Create copy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- Chat ----------------
function ChatPane({
  projectId,
  threadId,
  onThreadCreated,
}: {
  projectId: string;
  threadId: string | null;
  onThreadCreated: (id: string) => void;
}) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["thread", threadId],
    queryFn: () => (threadId ? getThread(threadId) : Promise.resolve(undefined)),
    enabled: !!threadId,
  });
  const [draft, setDraft] = useState("");
  const [lastTurnMeta, setLastTurnMeta] = useState<{
    provider: string;
    model: string;
    mocked: boolean;
    api_key_configured: boolean;
    client_initialized: boolean;
  } | null>(null);

  const send = useMutation({
    mutationFn: (content: string) => sendMessage(projectId, threadId, content),
    onSuccess: (turn) => {
      setDraft("");
      setLastTurnMeta({
        provider: turn.provider,
        model: turn.model,
        mocked: turn.mocked,
        api_key_configured: turn.api_key_configured,
        client_initialized: turn.client_initialized,
      });
      qc.invalidateQueries({ queryKey: ["threads", projectId] });
      qc.invalidateQueries({ queryKey: ["thread", turn.thread.id] });
      if (!threadId) onThreadCreated(turn.thread.id);
    },
  });

  const messages = data?.messages ?? [];

  return (
    <div className="flex flex-col overflow-hidden">
      <ScrollArea className="flex-1 px-6 py-4">
        {messages.length === 0 ? (
          <div className="mx-auto mt-16 max-w-md text-center text-sm text-muted-foreground">
            {threadId
              ? "No messages yet. Say hello to the Project Lead."
              : "Start by sending a message — a thread will be created automatically."}
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn("flex flex-col gap-1", m.role === "user" ? "items-end" : "items-start")}
              >
                <div className="text-[11px] text-muted-foreground">
                  {m.sender_name} · {timeAgo(m.created_at)}
                </div>
                <div
                  className={cn(
                    "max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {send.isPending && (
              <div className="text-xs text-muted-foreground">Project Lead is replying…</div>
            )}
          </div>
        )}
      </ScrollArea>
      <div className="border-t bg-card p-3">
        {lastTurnMeta && (
          <div className="mx-auto mb-2 flex max-w-3xl flex-wrap gap-1.5 text-[11px]">
            <Badge variant={lastTurnMeta.mocked ? "outline" : "default"}>
              {lastTurnMeta.mocked ? "Mocked reply" : "Live AI"}
            </Badge>
            <Badge variant="outline">
              {lastTurnMeta.provider} · {lastTurnMeta.model}
            </Badge>
            <Badge variant="outline">
              key {lastTurnMeta.api_key_configured ? "configured" : "missing"}
            </Badge>
            <Badge variant="outline">
              client {lastTurnMeta.client_initialized ? "ok" : "fail"}
            </Badge>
          </div>
        )}
        <form
          className="mx-auto flex max-w-3xl items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) send.mutate(draft.trim());
          }}
        >
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message the Project Lead…"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (draft.trim()) send.mutate(draft.trim());
              }
            }}
          />
          <Button type="submit" disabled={!draft.trim() || send.isPending}>
            <Send /> Send
          </Button>
        </form>
      </div>
    </div>
  );
}

// ---------------- Right details panel ----------------
function ProjectDetailsPanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { data: agents = [] } = useQuery({
    queryKey: ["project-agents", projectId],
    queryFn: () => listProjectAgents(projectId),
  });
  const { data: files = [] } = useQuery({
    queryKey: ["context-files", projectId],
    queryFn: () => listContextFiles(projectId),
  });
  const { data: templates = [] } = useQuery({
    queryKey: ["agent-templates"],
    queryFn: listAgentTemplates,
  });
  const { data: runtime } = useQuery({ queryKey: ["runtime"], queryFn: getRuntimeStatus });
  const { data: ai } = useQuery({ queryKey: ["ai-config"], queryFn: getAiConfig });

  const [assignSlug, setAssignSlug] = useState<string>("");
  const assign = useMutation({
    mutationFn: () => assignAgentToProject(projectId, assignSlug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-agents", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Agent assigned");
      setAssignSlug("");
    },
  });

  const upload = useMutation({
    mutationFn: (file: File) => uploadContextFile(projectId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["context-files", projectId] });
      toast.success("File uploaded");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lead = useMemo(() => agents.find((a) => a.is_project_lead), [agents]);

  return (
    <aside className="flex flex-col overflow-hidden border-l bg-card">
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {/* Runtime / AI status */}
          <section>
            <SectionTitle>Runtime &amp; AI</SectionTitle>
            <Card className="p-3 text-xs">
              <StatusRow label="Runtime" ok={!!runtime?.runtime_ready} />
              <StatusRow label="Checkpointer" ok={!!runtime?.checkpointer_ready} />
              <StatusRow label="Store" ok={!!runtime?.store_ready} />
              <StatusRow label="Strict msgpack" ok={!!runtime?.strict_msgpack_enabled} />
              <Separator className="my-2" />
              <StatusRow label="AI key configured" ok={!!ai?.api_key_configured} />
              <div className="mt-1 text-muted-foreground">
                {ai?.provider} · {ai?.model}
              </div>
            </Card>
          </section>

          {/* Agents */}
          <section>
            <SectionTitle>
              <Users className="h-3.5 w-3.5" /> Assigned agents ({agents.length})
            </SectionTitle>
            <div className="space-y-1.5">
              {agents.map((a) => (
                <Card
                  key={a.id}
                  className={cn(
                    "p-2.5 text-xs",
                    a.is_project_lead && "border-primary/50 bg-primary/5",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-medium">{a.name}</span>
                        {a.is_project_lead && (
                          <Badge className="h-4 px-1.5 text-[9px]">LEAD</Badge>
                        )}
                      </div>
                      <div className="truncate text-muted-foreground">
                        {a.role} · /{a.slug}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[9px]">
                      {a.source_type}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
            <div className="mt-2 flex gap-1.5">
              <Select value={assignSlug} onValueChange={setAssignSlug}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Assign agent template…" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} · {t.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={!assignSlug || assign.isPending}
                onClick={() => assign.mutate()}
              >
                Add
              </Button>
            </div>
            {!lead && (
              <p className="mt-1 text-[11px] text-amber-600">No Project Lead assigned.</p>
            )}
          </section>

          {/* Context files */}
          <section>
            <SectionTitle>
              <FileText className="h-3.5 w-3.5" /> Project context files
            </SectionTitle>
            <div className="space-y-1.5">
              {files.length === 0 && (
                <div className="text-xs text-muted-foreground">No project files uploaded.</div>
              )}
              {files.map((f) => (
                <Card key={f.id} className="p-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{f.file_name}</span>
                    <span className="shrink-0 text-muted-foreground">{formatBytes(f.byte_size)}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {f.media_type} · {timeAgo(f.uploaded_at)}
                  </div>
                  {f.content_preview && (
                    <div className="mt-1 line-clamp-2 rounded bg-muted/50 p-1.5 font-mono text-[10px]">
                      {f.content_preview}
                    </div>
                  )}
                </Card>
              ))}
            </div>
            <label className="mt-2 flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed py-2 text-xs text-muted-foreground hover:bg-accent/50">
              <Upload className="h-3.5 w-3.5" /> Upload .txt / .md (UTF-8, ≤2 MB)
              <input
                type="file"
                accept=".txt,.md,text/plain,text/markdown"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload.mutate(f);
                  e.target.value = "";
                }}
              />
            </label>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Project files complement shared dispatcher docs as Project Lead context.
            </p>
          </section>
        </div>
      </ScrollArea>
    </aside>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span>{label}</span>
      <span className="flex items-center gap-1.5">
        <StatusDot ok={ok} />
        <span className={ok ? "text-emerald-600" : "text-amber-600"}>
          {ok ? "ready" : "pending"}
        </span>
      </span>
    </div>
  );
}
