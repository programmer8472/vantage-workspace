// API/data service layer. Currently backed by in-memory mock data so the UI can
// run without a backend. Swap implementations here (e.g. fetch against
// /api/v1/...) without changing UI code.
import type {
  AgentTemplate,
  DocsStatus,
  Project,
  ProjectAgent,
  ProjectContextFile,
  ProjectLeadTurn,
  ProjectMessage,
  ProjectTemplate,
  ProjectThread,
  PromptVersion,
  RuntimeStatus,
} from "./types";

const uid = () =>
  (globalThis.crypto?.randomUUID?.() ??
    Math.random().toString(36).slice(2) + Date.now().toString(36));

const now = () => new Date().toISOString();
const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || `item-${Math.random().toString(36).slice(2, 6)}`;

// ---------- Seed: agent templates ----------
const seedAgent = (
  slug: string,
  name: string,
  role: string,
  persona: string,
  prompt: string,
  tools: string[] = [],
): AgentTemplate => {
  const id = uid();
  const versionId = uid();
  const a: AgentTemplate = {
    id,
    slug,
    name,
    role,
    persona,
    system_prompt: prompt,
    model_name: "deepseek-chat",
    temperature: 0.4,
    enabled_tools: tools,
    memory_scope: "project",
    is_active: true,
    active_prompt_version_id: versionId,
    created_at: now(),
    updated_at: now(),
  };
  const v: PromptVersion = {
    id: versionId,
    agent_id: id,
    version_number: 1,
    role,
    persona,
    system_prompt: prompt,
    model_name: a.model_name,
    temperature: a.temperature,
    enabled_tools: tools,
    memory_scope: a.memory_scope,
    change_note: "Initial version",
    created_at: now(),
    is_active: true,
  };
  promptVersions.push(v);
  return a;
};

const promptVersions: PromptVersion[] = [];
const agentTemplates: AgentTemplate[] = [
  seedAgent(
    "project-lead",
    "Project Lead",
    "Project Lead",
    "Calm, structured operator who keeps the project on rails.",
    "You are the Project Lead. Synthesize project description, assigned team summary, shared dispatcher docs, uploaded project context, and recent thread history to give crisp, actionable replies.",
    ["search_docs", "summarize"],
  ),
  seedAgent(
    "bd-officer",
    "BD Officer",
    "Business Development",
    "Hungry, polite, relationship-first BD specialist.",
    "You are the BD Officer. Draft outbound, qualify leads, and propose next steps.",
    ["draft_email"],
  ),
  seedAgent(
    "researcher",
    "Researcher",
    "Research",
    "Methodical analyst that grounds claims in sources.",
    "You are the Researcher. Investigate topics, cite sources, summarize findings.",
    ["web_search"],
  ),
  seedAgent(
    "copywriter",
    "Copywriter",
    "Copy",
    "Sharp, plainspoken writer who kills filler.",
    "You are the Copywriter. Produce concise, on-brand copy variants.",
    [],
  ),
  seedAgent(
    "strategist",
    "Strategist",
    "Strategy",
    "Frameworks-fluent strategist focused on leverage.",
    "You are the Strategist. Propose plans with tradeoffs and prioritization.",
    [],
  ),
];

// ---------- Seed: project templates ----------
const projectTemplates: ProjectTemplate[] = [
  {
    id: uid(),
    slug: "vantage-ai-automation",
    name: "Vantage AI Automation",
    description:
      "Default workspace for shipping internal AI automations — research, build, document, repeat.",
    created_at: now(),
    updated_at: now(),
    agents: [
      { slug: "project-lead", name: "Project Lead", role: "Project Lead", is_project_lead: true },
      { slug: "researcher", name: "Researcher", role: "Research", is_project_lead: false },
      { slug: "strategist", name: "Strategist", role: "Strategy", is_project_lead: false },
      { slug: "copywriter", name: "Copywriter", role: "Copy", is_project_lead: false },
    ],
  },
  {
    id: uid(),
    slug: "agency-campaign-studio",
    name: "Agency Campaign Studio",
    description: "Client-facing campaign workspace: BD, research, and creative working in lockstep.",
    created_at: now(),
    updated_at: now(),
    agents: [
      { slug: "project-lead", name: "Project Lead", role: "Project Lead", is_project_lead: true },
      { slug: "bd-officer", name: "BD Officer", role: "Business Development", is_project_lead: false },
      { slug: "copywriter", name: "Copywriter", role: "Copy", is_project_lead: false },
      { slug: "researcher", name: "Researcher", role: "Research", is_project_lead: false },
    ],
  },
];

// ---------- Seed: docs status ----------
let docsStatus: DocsStatus = {
  expected_path: "/app/shared_docs",
  mounted: true,
  path_exists: true,
  is_ready: true,
  required_files: ["PROJECT_TRANSFER_BRIEF.md", "DAILY_STATUS.md"],
  found_files: ["PROJECT_TRANSFER_BRIEF.md", "DAILY_STATUS.md"],
  missing_files: [],
};

// ---------- Seed: runtime status ----------
const runtimeStatus: RuntimeStatus = {
  database_target: "postgres://vantage@db:5432/vantage",
  checkpointer_ready: true,
  store_ready: true,
  runtime_ready: true,
  strict_msgpack_enabled: true,
};

// ---------- Project state ----------
const projects: Project[] = [];
const projectAgents: ProjectAgent[] = [];
const contextFiles: ProjectContextFile[] = [];
const threads: ProjectThread[] = [];
const messages: ProjectMessage[] = [];

function instantiateAgentFromTemplate(
  projectId: string,
  template: AgentTemplate,
  isLead: boolean,
): ProjectAgent {
  return {
    id: uid(),
    project_id: projectId,
    source_type: "template",
    source_agent_template_id: template.id,
    source_agent_template_slug: template.slug,
    source_agent_prompt_version_id: template.active_prompt_version_id,
    slug: template.slug,
    name: template.name,
    role: template.role,
    persona: template.persona,
    system_prompt: template.system_prompt,
    model_name: template.model_name,
    temperature: template.temperature,
    enabled_tools: template.enabled_tools,
    memory_scope: template.memory_scope,
    is_active: true,
    is_project_lead: isLead,
    created_at: now(),
    updated_at: now(),
  };
}

function seedDemoProject() {
  const tmpl = projectTemplates[0];
  const project = createProjectFromTemplate({
    name: "Vantage Ops Hub",
    description: "Internal automation pilot — own the Project Lead workflow end-to-end.",
    template_slug: tmpl.slug,
  });
  // seed a thread + message
  const t = createThread(project.id, "Kickoff");
  postMessageMock(project.id, t.id, "Welcome the team and outline week 1.");
}

// ---------- Public API ----------
async function delay<T>(value: T, ms = 120): Promise<T> {
  return new Promise((r) => setTimeout(() => r(value), ms));
}

export async function getDocsStatus(): Promise<DocsStatus> {
  return delay(docsStatus);
}

// Dev helper: simulate broken docs / fix
export function setDocsReady(ready: boolean) {
  if (ready) {
    docsStatus = {
      ...docsStatus,
      is_ready: true,
      mounted: true,
      path_exists: true,
      found_files: [...docsStatus.required_files],
      missing_files: [],
    };
  } else {
    docsStatus = {
      ...docsStatus,
      is_ready: false,
      found_files: [],
      missing_files: [...docsStatus.required_files],
    };
  }
}

export async function listAgentTemplates(): Promise<AgentTemplate[]> {
  return delay([...agentTemplates]);
}
export async function getAgentTemplate(id: string): Promise<AgentTemplate | undefined> {
  return delay(agentTemplates.find((a) => a.id === id || a.slug === id));
}
export async function createAgentTemplate(input: {
  name: string;
  role: string;
  persona: string;
  system_prompt: string;
  model_name?: string;
  temperature?: number;
  enabled_tools?: string[];
  memory_scope?: string;
}): Promise<AgentTemplate> {
  const slug = slugify(input.name);
  const agent = seedAgent(
    slug,
    input.name,
    input.role,
    input.persona,
    input.system_prompt,
    input.enabled_tools ?? [],
  );
  agent.model_name = input.model_name ?? "deepseek-chat";
  agent.temperature = input.temperature ?? 0.4;
  agent.memory_scope = input.memory_scope ?? "project";
  agentTemplates.push(agent);
  return delay(agent);
}
export async function updateAgentTemplate(
  id: string,
  patch: Partial<AgentTemplate>,
): Promise<AgentTemplate> {
  const a = agentTemplates.find((x) => x.id === id);
  if (!a) throw new Error("Agent not found");
  Object.assign(a, patch, { updated_at: now() });
  return delay(a);
}
export async function listPromptVersions(agentId: string): Promise<PromptVersion[]> {
  return delay(promptVersions.filter((v) => v.agent_id === agentId));
}
export async function createPromptVersion(
  agentId: string,
  input: {
    persona: string;
    system_prompt: string;
    role: string;
    model_name: string;
    temperature: number;
    enabled_tools: string[];
    memory_scope: string;
    change_note: string;
  },
): Promise<PromptVersion> {
  const agent = agentTemplates.find((a) => a.id === agentId);
  if (!agent) throw new Error("Agent not found");
  const existing = promptVersions.filter((v) => v.agent_id === agentId);
  const v: PromptVersion = {
    id: uid(),
    agent_id: agentId,
    version_number: existing.length + 1,
    ...input,
    created_at: now(),
    is_active: false,
  };
  promptVersions.push(v);
  return delay(v);
}
export async function activatePromptVersion(
  agentId: string,
  versionId: string,
): Promise<AgentTemplate> {
  const agent = agentTemplates.find((a) => a.id === agentId);
  if (!agent) throw new Error("Agent not found");
  for (const v of promptVersions.filter((x) => x.agent_id === agentId)) v.is_active = false;
  const v = promptVersions.find((x) => x.id === versionId);
  if (!v) throw new Error("Version not found");
  v.is_active = true;
  agent.active_prompt_version_id = v.id;
  agent.persona = v.persona;
  agent.system_prompt = v.system_prompt;
  agent.role = v.role;
  agent.model_name = v.model_name;
  agent.temperature = v.temperature;
  agent.enabled_tools = v.enabled_tools;
  agent.memory_scope = v.memory_scope;
  agent.updated_at = now();
  return delay(agent);
}

export async function listProjectTemplates(): Promise<ProjectTemplate[]> {
  return delay([...projectTemplates]);
}
export async function getProjectTemplate(id: string): Promise<ProjectTemplate | undefined> {
  return delay(projectTemplates.find((p) => p.id === id || p.slug === id));
}

export async function listProjects(): Promise<Project[]> {
  return delay([...projects].sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
}
export async function getProject(id: string): Promise<Project | undefined> {
  return delay(projects.find((p) => p.id === id || p.slug === id));
}

function ensureLead(projectId: string) {
  const has = projectAgents.some((a) => a.project_id === projectId && a.is_project_lead);
  if (!has) {
    const leadTmpl = agentTemplates.find((a) => a.slug === "project-lead");
    if (leadTmpl) {
      projectAgents.push(instantiateAgentFromTemplate(projectId, leadTmpl, true));
    }
  }
}

function recountAgents(projectId: string) {
  const p = projects.find((x) => x.id === projectId);
  if (p) p.agent_count = projectAgents.filter((a) => a.project_id === projectId).length;
}

export function createProjectFromTemplate(input: {
  name: string;
  description: string;
  template_slug: string | null;
}): Project {
  const id = uid();
  const tmpl = input.template_slug
    ? projectTemplates.find((t) => t.slug === input.template_slug || t.id === input.template_slug)
    : null;
  const p: Project = {
    id,
    slug: slugify(input.name),
    name: input.name,
    description: input.description,
    status: "active",
    project_template_id: tmpl?.id ?? null,
    project_template_slug: tmpl?.slug ?? null,
    project_template_name: tmpl?.name ?? null,
    agent_count: 0,
    created_at: now(),
    updated_at: now(),
  };
  projects.push(p);
  if (tmpl) {
    for (const ta of tmpl.agents) {
      const at = agentTemplates.find((a) => a.slug === ta.slug);
      if (at) projectAgents.push(instantiateAgentFromTemplate(id, at, ta.is_project_lead));
    }
  }
  ensureLead(id);
  recountAgents(id);
  return p;
}

export async function createProject(input: {
  name: string;
  description: string;
  template_slug: string | null;
}): Promise<Project> {
  return delay(createProjectFromTemplate(input));
}

export async function copyProject(
  sourceId: string,
  input: { name: string; description?: string },
): Promise<Project> {
  const src = projects.find((p) => p.id === sourceId);
  if (!src) throw new Error("Source project not found");
  const id = uid();
  const copy: Project = {
    ...src,
    id,
    slug: slugify(input.name),
    name: input.name,
    description: input.description ?? src.description,
    created_at: now(),
    updated_at: now(),
    agent_count: 0,
  };
  projects.push(copy);
  for (const a of projectAgents.filter((x) => x.project_id === sourceId)) {
    projectAgents.push({ ...a, id: uid(), project_id: id, created_at: now(), updated_at: now() });
  }
  for (const f of contextFiles.filter((x) => x.project_id === sourceId)) {
    contextFiles.push({ ...f, id: uid(), project_id: id, uploaded_at: now() });
  }
  ensureLead(id);
  recountAgents(id);
  return delay(copy);
}

export async function listProjectAgents(projectId: string): Promise<ProjectAgent[]> {
  return delay(projectAgents.filter((a) => a.project_id === projectId));
}

export async function assignAgentToProject(
  projectId: string,
  agentTemplateId: string,
  asLead = false,
): Promise<ProjectAgent> {
  const tmpl = agentTemplates.find((a) => a.id === agentTemplateId);
  if (!tmpl) throw new Error("Template not found");
  if (asLead) {
    for (const a of projectAgents.filter((x) => x.project_id === projectId))
      a.is_project_lead = false;
  }
  const created = instantiateAgentFromTemplate(projectId, tmpl, asLead);
  projectAgents.push(created);
  recountAgents(projectId);
  return delay(created);
}

export async function listContextFiles(projectId: string): Promise<ProjectContextFile[]> {
  return delay(contextFiles.filter((f) => f.project_id === projectId));
}
export async function uploadContextFile(
  projectId: string,
  file: File,
): Promise<ProjectContextFile> {
  if (file.size > 2 * 1024 * 1024) throw new Error("File exceeds 2 MB limit");
  const text = await file.text();
  const existing = contextFiles.find((f) => f.project_id === projectId && f.file_name === file.name);
  const preview = text.slice(0, 280);
  if (existing) {
    existing.byte_size = file.size;
    existing.uploaded_at = now();
    existing.content_preview = preview;
    existing.media_type = file.type || "text/plain";
    return delay(existing);
  }
  const f: ProjectContextFile = {
    id: uid(),
    project_id: projectId,
    file_name: file.name,
    media_type: file.type || "text/plain",
    source_type: "upload",
    byte_size: file.size,
    uploaded_at: now(),
    content_preview: preview,
  };
  contextFiles.push(f);
  return delay(f);
}

export async function listThreads(projectId: string): Promise<ProjectThread[]> {
  return delay(
    threads
      .filter((t) => t.project_id === projectId)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
  );
}
function createThread(projectId: string, title?: string): ProjectThread {
  const t: ProjectThread = {
    id: uid(),
    project_id: projectId,
    title: title ?? "New thread",
    message_count: 0,
    last_message_preview: "",
    created_at: now(),
    updated_at: now(),
  };
  threads.push(t);
  return t;
}
export async function createProjectThread(
  projectId: string,
  title?: string,
): Promise<ProjectThread> {
  return delay(createThread(projectId, title));
}
export async function getThread(threadId: string): Promise<{
  thread: ProjectThread;
  messages: ProjectMessage[];
} | undefined> {
  const t = threads.find((x) => x.id === threadId);
  if (!t) return undefined;
  return delay({
    thread: t,
    messages: messages
      .filter((m) => m.project_thread_id === threadId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at)),
  });
}

// Has live API key configured? Mock: false.
const AI_CONFIG = { provider: "deepseek", model: "deepseek-chat", api_key_configured: false };

function postMessageMock(projectId: string, threadId: string, content: string): ProjectLeadTurn {
  const project = projects.find((p) => p.id === projectId)!;
  const lead = projectAgents.find((a) => a.project_id === projectId && a.is_project_lead);
  const thread = threads.find((t) => t.id === threadId)!;

  const userMsg: ProjectMessage = {
    id: uid(),
    project_thread_id: threadId,
    role: "user",
    sender_name: "Operator",
    content,
    created_at: now(),
  };
  messages.push(userMsg);

  const team = projectAgents
    .filter((a) => a.project_id === projectId)
    .map((a) => `${a.name} (${a.role})`)
    .join(", ");
  const fileCount = contextFiles.filter((f) => f.project_id === projectId).length;
  const recent = messages
    .filter((m) => m.project_thread_id === threadId)
    .slice(-4)
    .map((m) => `${m.sender_name}: ${m.content.slice(0, 60)}`)
    .join(" • ");

  const reply =
    `Acknowledged. Working on "${content.slice(0, 80)}" for ${project.name}.\n\n` +
    `Context drawn from: project brief, ${fileCount} uploaded file(s), shared dispatcher docs, ` +
    `assigned team [${team}], recent thread history (${recent || "none yet"}).\n\n` +
    `Next steps:\n1. Confirm scope.\n2. Pull required references.\n3. Draft initial deliverable for review.`;

  const assistantMsg: ProjectMessage = {
    id: uid(),
    project_thread_id: threadId,
    role: "assistant",
    sender_name: lead?.name ?? "Project Lead",
    content: reply,
    created_at: now(),
  };
  messages.push(assistantMsg);

  // Update thread metadata
  thread.message_count = messages.filter((m) => m.project_thread_id === threadId).length;
  thread.last_message_preview = reply.slice(0, 120);
  thread.updated_at = now();
  if (thread.title === "New thread") thread.title = content.slice(0, 48) || "New thread";
  project.updated_at = now();

  return {
    thread,
    assistant_message: assistantMsg,
    provider: AI_CONFIG.provider,
    model: AI_CONFIG.model,
    client_initialized: true,
    api_key_configured: AI_CONFIG.api_key_configured,
    mocked: !AI_CONFIG.api_key_configured,
  };
}

export async function sendMessage(
  projectId: string,
  threadId: string | null,
  content: string,
): Promise<ProjectLeadTurn> {
  let tid = threadId;
  if (!tid) tid = createThread(projectId).id;
  return delay(postMessageMock(projectId, tid, content), 400);
}

export async function getRuntimeStatus(): Promise<RuntimeStatus> {
  return delay(runtimeStatus);
}
export async function getAiConfig() {
  return delay(AI_CONFIG);
}

// Seed a demo project so first-load dashboard isn't empty.
seedDemoProject();
