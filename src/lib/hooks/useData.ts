/**
 * Central data hooks — thin wrappers over Supabase queries using React Query.
 * These replace all direct `mock-data` imports throughout the app.
 *
 * Each hook returns { data, isLoading, error } matching the React Query shape.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  User, Client, Project, Phase, Task, Deliverable,
  Document, Update, Question, ActivityLog, Notification,
  PackageTemplate, TemplatePhase,
  OnboardingPhase, OnboardingTask, ManagerTaskCompletion,
  Resource,
} from "@/lib/types";

// ─── helpers ────────────────────────────────────────────────────────────────

const camelProfile = (r: Record<string, unknown>): User => ({
  id: r.id as string,
  firstName: r.first_name as string,
  lastName: r.last_name as string,
  email: r.email as string,
  role: r.role as User["role"],
  profilePhoto: r.profile_photo as string | undefined,
  status: r.status as User["status"],
  createdAt: r.created_at as string,
});

const camelClient = (r: Record<string, unknown>): Client => ({
  id: r.id as string,
  companyName: r.company_name as string,
  primaryContactName: r.primary_contact_name as string,
  primaryContactEmail: r.primary_contact_email as string,
  phone: r.phone as string | undefined,
  status: r.status as Client["status"],
  accountManagerId: r.account_manager_id as string,
  googleDriveUrl: r.google_drive_url as string | undefined,
  notes: r.notes as string | undefined,
  createdAt: r.created_at as string,
});

const camelProject = (r: Record<string, unknown>): Project => ({
  id: r.id as string,
  clientId: r.client_id as string,
  packageTemplateId: r.package_template_id as string | undefined,
  projectName: r.project_name as string,
  description: r.description as string | undefined,
  status: r.status as Project["status"],
  currentPhaseId: r.current_phase_id as string | undefined,
  isMainProject: r.is_main_project as boolean,
  parentProjectId: r.parent_project_id as string | undefined,
  createdAt: r.created_at as string,
});

const camelPhase = (r: Record<string, unknown>): Phase => ({
  id: r.id as string,
  projectId: r.project_id as string,
  name: r.name as string,
  description: r.description as string | undefined,
  estimatedTimeline: r.estimated_timeline as string | undefined,
  status: r.status as Phase["status"],
  sortOrder: r.sort_order as number,
});

const camelTask = (r: Record<string, unknown>): Task => ({
  id: r.id as string,
  phaseId: r.phase_id as string,
  title: r.title as string,
  description: r.description as string | undefined,
  taskType: r.task_type as Task["taskType"],
  status: r.status as Task["status"],
  completedAt: r.completed_at as string | undefined,
  assignedToUserId: r.assigned_to_user_id as string | undefined,
  visibleToClient: r.visible_to_client as boolean,
  sortOrder: r.sort_order as number,
});

const camelDeliverable = (r: Record<string, unknown>): Deliverable => ({
  id: r.id as string,
  phaseId: r.phase_id as string,
  title: r.title as string,
  description: r.description as string | undefined,
  fileUrl: r.file_url as string | undefined,
  visibleToClient: r.visible_to_client as boolean,
  uploadedBy: r.uploaded_by as string | undefined,
  uploadedAt: r.uploaded_at as string | undefined,
});

// ─── PROFILES ───────────────────────────────────────────────────────────────

export function useProfiles() {
  return useQuery<User[]>({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at");
      if (error) throw error;
      return (data ?? []).map(camelProfile);
    },
  });
}

export function useProfile(id: string | undefined) {
  return useQuery<User | null>({
    queryKey: ["profiles", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", id!).single();
      if (error) return null;
      return camelProfile(data);
    },
  });
}

// ─── CLIENTS ────────────────────────────────────────────────────────────────

export function useClients() {
  return useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("created_at");
      if (error) throw error;
      return (data ?? []).map(camelClient);
    },
  });
}

export function useClient(id: string | undefined) {
  return useQuery<Client | null>({
    queryKey: ["clients", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id!).single();
      if (error) return null;
      return camelClient(data);
    },
  });
}

export function useClientByUserId(userId: string | undefined) {
  return useQuery<Client | null>({
    queryKey: ["clients", "by-user", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("user_id", userId!).single();
      if (error) return null;
      return camelClient(data);
    },
  });
}

// ─── PROJECTS ───────────────────────────────────────────────────────────────

export function useProjectsByClient(clientId: string | undefined) {
  return useQuery<Project[]>({
    queryKey: ["projects", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("client_id", clientId!).order("created_at");
      if (error) throw error;
      return (data ?? []).map(camelProject);
    },
  });
}

export function useAllProjects() {
  return useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("created_at");
      if (error) throw error;
      return (data ?? []).map(camelProject);
    },
  });
}

// ─── PHASES ─────────────────────────────────────────────────────────────────

export function usePhasesByProject(projectId: string | undefined) {
  return useQuery<Phase[]>({
    queryKey: ["phases", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase.from("phases").select("*").eq("project_id", projectId!).order("sort_order");
      if (error) throw error;
      return (data ?? []).map(camelPhase);
    },
  });
}

// ─── TASKS ──────────────────────────────────────────────────────────────────

export function useTasksByPhase(phaseId: string | undefined) {
  return useQuery<Task[]>({
    queryKey: ["tasks", phaseId],
    enabled: !!phaseId,
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("phase_id", phaseId!).order("sort_order");
      if (error) throw error;
      return (data ?? []).map(camelTask);
    },
  });
}

// Get all tasks for an array of phase IDs
export function useTasksByPhases(phaseIds: string[]) {
  return useQuery<Task[]>({
    queryKey: ["tasks", "phases", phaseIds],
    enabled: phaseIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").in("phase_id", phaseIds).order("sort_order");
      if (error) throw error;
      return (data ?? []).map(camelTask);
    },
  });
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: Task["status"] }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "completed") updates.completed_at = new Date().toISOString();
      const { error } = await supabase.from("tasks").update(updates).eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

// ─── DELIVERABLES ────────────────────────────────────────────────────────────

export function useDeliverablesByPhases(phaseIds: string[]) {
  return useQuery<Deliverable[]>({
    queryKey: ["deliverables", "phases", phaseIds],
    enabled: phaseIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("deliverables").select("*").in("phase_id", phaseIds);
      if (error) throw error;
      return (data ?? []).map(camelDeliverable);
    },
  });
}

// ─── DOCUMENTS ───────────────────────────────────────────────────────────────

export function useDocumentsByClient(clientId: string | undefined) {
  return useQuery<Document[]>({
    queryKey: ["documents", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").eq("client_id", clientId!).order("uploaded_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        clientId: r.client_id,
        title: r.title,
        documentType: r.document_type as Document["documentType"],
        fileUrl: r.file_url ?? undefined,
        visibleToClient: r.visible_to_client,
        uploadedAt: r.uploaded_at,
      }));
    },
  });
}

// ─── UPDATES ─────────────────────────────────────────────────────────────────

export function useUpdatesByClient(clientId: string | undefined) {
  return useQuery<Update[]>({
    queryKey: ["updates", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase.from("updates").select("*").eq("client_id", clientId!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        clientId: r.client_id,
        projectId: r.project_id ?? undefined,
        title: r.title,
        body: r.body,
        visibleToClient: r.visible_to_client,
        createdBy: r.created_by,
        createdAt: r.created_at,
      }));
    },
  });
}

// ─── QUESTIONS ────────────────────────────────────────────────────────────────

export function useQuestionsByClient(clientId: string | undefined) {
  return useQuery<Question[]>({
    queryKey: ["questions", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase.from("questions").select("*").eq("client_id", clientId!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        clientId: r.client_id,
        projectId: r.project_id ?? undefined,
        subject: r.subject,
        message: r.message,
        attachmentUrl: r.attachment_url ?? undefined,
        status: r.status as Question["status"],
        response: r.response ?? undefined,
        respondedBy: r.responded_by ?? undefined,
        createdAt: r.created_at,
      }));
    },
  });
}

export function useAllQuestions() {
  return useQuery<Question[]>({
    queryKey: ["questions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("questions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        clientId: r.client_id,
        projectId: r.project_id ?? undefined,
        subject: r.subject,
        message: r.message,
        attachmentUrl: r.attachment_url ?? undefined,
        status: r.status as Question["status"],
        response: r.response ?? undefined,
        respondedBy: r.responded_by ?? undefined,
        createdAt: r.created_at,
      }));
    },
  });
}

// ─── ACTIVITY LOGS ───────────────────────────────────────────────────────────

export function useActivityLogsByClient(clientId: string | undefined) {
  return useQuery<ActivityLog[]>({
    queryKey: ["activity_logs", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase.from("activity_logs").select("*").eq("client_id", clientId!).order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        clientId: r.client_id,
        projectId: r.project_id ?? undefined,
        userId: r.user_id,
        eventType: r.event_type,
        eventLabel: r.event_label,
        metadata: r.metadata ?? undefined,
        createdAt: r.created_at,
      }));
    },
  });
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export function useNotificationsByUser(userId: string | undefined) {
  return useQuery<Notification[]>({
    queryKey: ["notifications", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("*").eq("user_id", userId!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        userId: r.user_id,
        title: r.title,
        message: r.message,
        read: r.read,
        link: r.link ?? undefined,
        createdAt: r.created_at,
      }));
    },
  });
}

// ─── PACKAGE TEMPLATES ────────────────────────────────────────────────────────

export function useTemplates() {
  return useQuery<PackageTemplate[]>({
    queryKey: ["templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("package_templates")
        .select(`
          *,
          template_phases (
            *,
            template_tasks ( * ),
            template_deliverables ( * )
          )
        `)
        .order("created_at");
      if (error) throw error;
      return (data ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description ?? undefined,
        active: t.active,
        createdBy: t.created_by,
        createdAt: t.created_at,
        phases: (t.template_phases ?? [])
          .sort((a: TemplatePhase, b: TemplatePhase) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map((ph: Record<string, unknown>) => ({
            id: ph.id,
            templateId: ph.template_id,
            name: ph.name,
            description: ph.description ?? undefined,
            sortOrder: ph.sort_order,
            estimatedTimeline: ph.estimated_timeline ?? undefined,
            tasks: ((ph.template_tasks as Record<string, unknown>[]) ?? []).sort((a, b) => (a.sort_order as number) - (b.sort_order as number)).map((tk) => ({
              id: tk.id, phaseId: tk.template_phase_id, title: tk.title,
              description: tk.description ?? undefined, taskType: tk.task_type,
              required: tk.required, sortOrder: tk.sort_order,
            })),
            deliverables: ((ph.template_deliverables as Record<string, unknown>[]) ?? []).sort((a, b) => (a.sort_order as number) - (b.sort_order as number)).map((d) => ({
              id: d.id, phaseId: d.template_phase_id, title: d.title,
              description: d.description ?? undefined, sortOrder: d.sort_order,
            })),
          })),
      }));
    },
  });
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────

export function useOnboardingPhases() {
  return useQuery<OnboardingPhase[]>({
    queryKey: ["onboarding_phases"],
    queryFn: async () => {
      const { data, error } = await supabase.from("onboarding_phases").select("*").order("display_order");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id, name: r.name, description: r.description ?? undefined,
        displayOrder: r.display_order, createdAt: r.created_at,
      }));
    },
  });
}

export function useOnboardingTasks() {
  return useQuery<OnboardingTask[]>({
    queryKey: ["onboarding_tasks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("onboarding_tasks").select("*").order("display_order");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id, phaseId: r.phase_id, title: r.title,
        description: r.description ?? undefined, displayOrder: r.display_order,
        required: r.required, resourceLink: r.resource_link ?? undefined,
      }));
    },
  });
}

export function useManagerTaskCompletions(managerId: string | undefined) {
  return useQuery<ManagerTaskCompletion[]>({
    queryKey: ["manager_completions", managerId],
    enabled: !!managerId,
    queryFn: async () => {
      const { data, error } = await supabase.from("manager_task_completions").select("*").eq("manager_id", managerId!);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id, managerId: r.manager_id, taskId: r.task_id,
        completed: r.completed, completedAt: r.completed_at ?? undefined,
      }));
    },
  });
}

export function useToggleOnboardingTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ managerId, taskId, completed }: { managerId: string; taskId: string; completed: boolean }) => {
      const { error } = await supabase.from("manager_task_completions").upsert({
        manager_id: managerId,
        task_id: taskId,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      }, { onConflict: "manager_id,task_id" });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["manager_completions", vars.managerId] });
    },
  });
}

// ─── RESOURCES ────────────────────────────────────────────────────────────────

export function useResources() {
  return useQuery<Resource[]>({
    queryKey: ["resources"],
    queryFn: async () => {
      const { data, error } = await supabase.from("resources").select("*").order("display_order");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id, title: r.title, description: r.description ?? undefined,
        category: r.category, type: r.type as Resource["type"],
        url: r.url ?? undefined, filePath: r.file_path ?? undefined,
        displayOrder: r.display_order, visibleToRole: r.visible_to_roles,
      }));
    },
  });
}
