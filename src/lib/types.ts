export type DocsStatus = {
  expected_path: string;
  mounted: boolean;
  path_exists: boolean;
  is_ready: boolean;
  required_files: string[];
  found_files: string[];
  missing_files: string[];
};

export type PromptVersion = {
  id: string;
  agent_id: string;
  version_number: number;
  role: string;
  persona: string;
  system_prompt: string;
  model_name: string;
  temperature: number;
  enabled_tools: string[];
  memory_scope: string;
  change_note: string;
  created_at: string;
  is_active: boolean;
};

export type AgentTemplate = {
  id: string;
  slug: string;
  name: string;
  role: string;
  persona: string;
  system_prompt: string;
  model_name: string;
  temperature: number;
  enabled_tools: string[];
  memory_scope: string;
  is_active: boolean;
  active_prompt_version_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectTemplateAgent = {
  slug: string;
  name: string;
  role: string;
  is_project_lead: boolean;
};

export type ProjectTemplate = {
  id: string;
  slug: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  agents: ProjectTemplateAgent[];
};

export type ProjectStatus = "active" | "paused" | "archived";

export type Project = {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: ProjectStatus;
  project_template_id: string | null;
  project_template_slug: string | null;
  project_template_name: string | null;
  agent_count: number;
  created_at: string;
  updated_at: string;
};

export type ProjectAgent = {
  id: string;
  project_id: string;
  source_type: "template" | "custom";
  source_agent_template_id: string | null;
  source_agent_template_slug: string | null;
  source_agent_prompt_version_id: string | null;
  slug: string;
  name: string;
  role: string;
  persona: string;
  system_prompt: string;
  model_name: string;
  temperature: number;
  enabled_tools: string[];
  memory_scope: string;
  is_active: boolean;
  is_project_lead: boolean;
  created_at: string;
  updated_at: string;
};

export type ProjectContextFile = {
  id: string;
  project_id: string;
  file_name: string;
  media_type: string;
  source_type: "upload";
  byte_size: number;
  uploaded_at: string;
  content_preview: string;
};

export type ProjectThread = {
  id: string;
  project_id: string;
  title: string;
  message_count: number;
  last_message_preview: string;
  created_at: string;
  updated_at: string;
};

export type MessageRole = "user" | "assistant" | "system";

export type ProjectMessage = {
  id: string;
  project_thread_id: string;
  role: MessageRole;
  sender_name: string;
  content: string;
  created_at: string;
};

export type ProjectLeadTurn = {
  thread: ProjectThread;
  assistant_message: ProjectMessage;
  provider: string;
  model: string;
  client_initialized: boolean;
  api_key_configured: boolean;
  mocked: boolean;
};

export type RuntimeStatus = {
  database_target: string;
  checkpointer_ready: boolean;
  store_ready: boolean;
  runtime_ready: boolean;
  strict_msgpack_enabled: boolean;
};
