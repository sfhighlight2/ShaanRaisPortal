import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import type {
  Client, Project, Phase, Task, Deliverable, Document, ClientLink, Update, User 
} from "@/lib/types";

export interface ClientNote {
  id: string;
  content: string;
  authorName?: string;
  createdAt: string;
}

export interface ClientDataState {
  client: Client | null;
  project: Project | null;
  phases: Phase[];
  tasks: Task[];
  deliverables: Deliverable[];
  links: ClientLink[];
  documents: Document[];
  updates: Update[];
  notes: ClientNote[];
  accountManager: User | null;
  loading: boolean;
  error: Error | null;
}

/** Resolve the effective client ID for the current session. */
async function resolveClientId(
  userId: string,
  impersonatedClientId: string | null
): Promise<string | null> {
  if (impersonatedClientId) return impersonatedClientId;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("client_id")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return profile?.client_id ?? null;
}

/** The actual fetch function — extracted so React Query can manage its lifecycle. */
async function fetchAllClientData(
  userId: string,
  impersonatedClientId: string | null
): Promise<Omit<ClientDataState, "loading" | "error">> {
  const empty: Omit<ClientDataState, "loading" | "error"> = {
    client: null,
    project: null,
    phases: [],
    tasks: [],
    deliverables: [],
    links: [],
    documents: [],
    updates: [],
    notes: [],
    accountManager: null,
  };

  const clientId = await resolveClientId(userId, impersonatedClientId);
  if (!clientId) return empty;

  // 1. Kick off all isolated fetches in parallel

  const clientPromise = supabase
    .from("clients")
    .select("*, account_manager:profiles!account_manager_id(id, first_name, last_name, email, role, profile_photo, status, created_at)")
    .eq("id", clientId)
    .single();

  const extraDataPromise = Promise.all([
    supabase.from("documents").select("*").eq("client_id", clientId).eq("visible_to_client", true).order("uploaded_at", { ascending: false }),
    supabase.from("client_links").select("*").eq("client_id", clientId).eq("visible_to_client", true).order("created_at", { ascending: false }),
    supabase.from("updates").select("*, created_by_user:profiles!created_by(*)").eq("client_id", clientId).eq("visible_to_client", true).order("created_at", { ascending: false }),
    supabase.from("client_notes").select("*, author:profiles!created_by(first_name, last_name)").eq("client_id", clientId).eq("visible_to_client", true).order("created_at", { ascending: false }),
  ]);

  const projectPromise = (async () => {
    let formattedProject: Project | null = null;
    let formattedPhases: Phase[] = [];
    let formattedTasks: Task[] = [];
    let formattedDeliverables: Deliverable[] = [];

    const { data: projects, error: projectsErr } = await supabase
      .from("projects")
      .select("*")
      .eq("client_id", clientId)
      .eq("is_main_project", true)
      .order("created_at", { ascending: false })
      .limit(1);
      
    if (projectsErr) throw projectsErr;
    
    if (projects && projects.length > 0) {
      const proj = projects[0];
      formattedProject = {
        id: proj.id,
        clientId: proj.client_id,
        packageTemplateId: proj.package_template_id,
        projectName: proj.project_name,
        description: proj.description,
        status: proj.status,
        currentPhaseId: proj.current_phase_id,
        isMainProject: proj.is_main_project,
        parentProjectId: proj.parent_project_id,
        createdAt: proj.created_at,
      } as Project;

      const phasesRes = await supabase
        .from("phases")
        .select("*")
        .eq("project_id", proj.id)
        .order("sort_order");

      if (phasesRes.error) throw phasesRes.error;
      formattedPhases = (phasesRes.data || []).map(p => ({
        id: p.id,
        projectId: p.project_id,
        name: p.name,
        description: p.description,
        estimatedTimeline: p.estimated_timeline,
        status: p.status,
        sortOrder: p.sort_order,
      }));

      const phaseIds = formattedPhases.map(p => p.id);

      if (phaseIds.length > 0) {
        const [tasksRes, deliverablesRes] = await Promise.all([
          supabase
            .from("tasks")
            .select("*")
            .in("phase_id", phaseIds)
            .eq("visible_to_client", true)
            .order("sort_order"),
          supabase
            .from("deliverables")
            .select("*")
            .in("phase_id", phaseIds)
            .eq("visible_to_client", true),
        ]);

        if (tasksRes.error) throw tasksRes.error;
        const phaseOrderMap = new Map(formattedPhases.map((p, i) => [p.id, i]));
        const rawTasks = tasksRes.data || [];
        const taskIds = rawTasks.map(t => t.id);

        // Fetch subtasks for all tasks in one query
        let subtasksByTaskId: Record<string, { id: string; taskId: string; title: string; completed: boolean; sortOrder: number }[]> = {};
        if (taskIds.length > 0) {
          const { data: subtasksData } = await supabase
            .from('task_subtasks')
            .select('*')
            .in('task_id', taskIds)
            .order('sort_order');
          for (const st of subtasksData || []) {
            if (!subtasksByTaskId[st.task_id]) subtasksByTaskId[st.task_id] = [];
            subtasksByTaskId[st.task_id].push({
              id: st.id, taskId: st.task_id, title: st.title,
              completed: st.completed, sortOrder: st.sort_order,
            });
          }
        }

        formattedTasks = rawTasks
          .map(t => ({
            id: t.id,
            phaseId: t.phase_id,
            title: t.title,
            description: t.description,
            notes: t.notes ?? undefined,
            taskType: t.task_type,
            status: t.status,
            completedAt: t.completed_at,
            assignedToUserId: t.assigned_to_user_id,
            visibleToClient: t.visible_to_client,
            sortOrder: t.sort_order,
            subtasks: subtasksByTaskId[t.id] || [],
          }))
          .sort((a, b) => {
            const phaseA = phaseOrderMap.get(a.phaseId) ?? 999;
            const phaseB = phaseOrderMap.get(b.phaseId) ?? 999;
            if (phaseA !== phaseB) return phaseA - phaseB;
            return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
          });


        if (deliverablesRes.error) throw deliverablesRes.error;
        formattedDeliverables = (deliverablesRes.data || [])
          .map(d => ({
            id: d.id,
            phaseId: d.phase_id,
            title: d.title,
            description: d.description,
            fileUrl: d.file_url,
            status: d.status || 'pending',
            completedAt: d.completed_at,
            visibleToClient: d.visible_to_client,
            uploadedBy: d.uploaded_by,
            uploadedAt: d.uploaded_at,
          }))
          .sort((a, b) => {
            const phaseA = phaseOrderMap.get(a.phaseId) ?? 999;
            const phaseB = phaseOrderMap.get(b.phaseId) ?? 999;
            return phaseA - phaseB;
          });
      }
    }
    return { formattedProject, formattedPhases, formattedTasks, formattedDeliverables };
  })();

  // 2. Await all independent fetches concurrently
  const [clientRes, extraDataRes, projectData] = await Promise.all([
    clientPromise,
    extraDataPromise,
    projectPromise,
  ]);

  if (clientRes.error) throw clientRes.error;
  
  const clientRow = clientRes.data;
  const accountManagerData = clientRow.account_manager;
  const accountManager = accountManagerData ? {
    id: accountManagerData.id,
    firstName: accountManagerData.first_name,
    lastName: accountManagerData.last_name,
    email: accountManagerData.email,
    role: accountManagerData.role,
    profilePhoto: accountManagerData.profile_photo,
    status: accountManagerData.status,
    createdAt: accountManagerData.created_at,
  } as User : null;

  const formattedClient: Client = {
    id: clientRow.id,
    companyName: clientRow.company_name,
    primaryContactName: clientRow.primary_contact_name,
    primaryContactEmail: clientRow.primary_contact_email,
    phone: clientRow.phone,
    status: clientRow.status,
    accountManagerId: clientRow.account_manager_id,
    googleDriveUrl: clientRow.google_drive_url,
    airtableUrl: clientRow.airtable_url,
    notes: clientRow.notes,
    createdAt: clientRow.created_at,
  };

  const [docsRes, linksRes, updatesRes, notesRes] = extraDataRes;

  if (docsRes.error) throw docsRes.error;
  const formattedDocuments: Document[] = (docsRes.data || []).map(d => ({
    id: d.id,
    clientId: d.client_id,
    title: d.title,
    documentType: d.document_type,
    fileUrl: d.file_url,
    visibleToClient: d.visible_to_client,
    uploadedAt: d.uploaded_at,
  }));

  if (linksRes.error) throw linksRes.error;
  const formattedLinks: ClientLink[] = (linksRes.data || []).map(l => ({
    id: l.id,
    clientId: l.client_id,
    title: l.title,
    url: l.url,
    linkType: l.link_type,
    description: l.description,
    visibleToClient: l.visible_to_client,
    createdAt: l.created_at,
  }));

  if (updatesRes.error) throw updatesRes.error;
  const formattedUpdates: Update[] = (updatesRes.data || []).map(u => ({
    id: u.id,
    clientId: u.client_id,
    projectId: u.project_id,
    title: u.title,
    body: u.body,
    visibleToClient: u.visible_to_client,
    createdBy: u.created_by,
    createdAt: u.created_at,
    _author: u.created_by_user ? {
      firstName: u.created_by_user.first_name,
      lastName: u.created_by_user.last_name,
    } : undefined
  }));



  if (notesRes.error) {
    console.warn("Failed to load client notes:", notesRes.error.message);
  }
  const formattedNotes: ClientNote[] = (notesRes.data || []).map(n => {
    const author = Array.isArray(n.author) ? n.author[0] : n.author;
    return {
      id: n.id,
      content: n.content,
      authorName: author ? `${author.first_name} ${author.last_name}` : undefined,
      createdAt: n.created_at,
    };
  });

  return {
    client: formattedClient,
    project: projectData.formattedProject,
    phases: projectData.formattedPhases,
    tasks: projectData.formattedTasks,
    deliverables: projectData.formattedDeliverables,
    links: formattedLinks,
    documents: formattedDocuments,
    updates: formattedUpdates,
    notes: formattedNotes,
    accountManager,
  };
}

/**
 * Central hook for all client-facing data.
 *
 * Uses React Query under the hood so data is **cached across page navigations**.
 * Navigating between Dashboard → Links → Tasks no longer triggers redundant
 * Supabase round-trips; the cached data is served instantly while a background
 * refetch keeps things fresh.
 */
export function useClientData() {
  const { user, isAuthenticated } = useAuth();
  const { impersonatedClientId } = useImpersonation();
  const queryClient = useQueryClient();

  // Stable query key — memoised so the refetch callback dep array is clean
  const queryKey = useMemo(
    () => ["clientData", user?.id ?? null, impersonatedClientId ?? null] as const,
    [user?.id, impersonatedClientId]
  );

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchAllClientData(user!.id, impersonatedClientId),
    enabled: isAuthenticated && !!user && isSupabaseConfigured,
    // Keep data fresh for 2 minutes — navigating between pages serves from cache
    staleTime: 2 * 60 * 1000,
    // Keep unused data in memory for 5 minutes before GC
    gcTime: 5 * 60 * 1000,
  });

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    client: data?.client ?? null,
    project: data?.project ?? null,
    phases: data?.phases ?? [],
    tasks: data?.tasks ?? [],
    deliverables: data?.deliverables ?? [],
    links: data?.links ?? [],
    documents: data?.documents ?? [],
    updates: data?.updates ?? [],
    notes: data?.notes ?? [],
    accountManager: data?.accountManager ?? null,
    loading: isLoading,
    error: error as Error | null,
    refetch,
  };
}
