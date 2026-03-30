import { useState, useCallback, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { 
  Client, Project, Phase, Task, Deliverable, Document, Update, Question, User 
} from "@/lib/types";

export interface ClientDataState {
  client: Client | null;
  project: Project | null;
  phases: Phase[];
  tasks: Task[];
  deliverables: Deliverable[];
  documents: Document[];
  updates: Update[];
  questions: Question[];
  accountManager: User | null;
  loading: boolean;
  error: Error | null;
}

export function useClientData() {
  const { user, isAuthenticated } = useAuth();
  
  const [data, setData] = useState<ClientDataState>({
    client: null,
    project: null,
    phases: [],
    tasks: [],
    deliverables: [],
    documents: [],
    updates: [],
    questions: [],
    accountManager: null,
    loading: true,
    error: null,
  });

  const fetchClientData = useCallback(async () => {
    // Only proceed if authenticated, configured, and the user has a linked client_id
    if (!isAuthenticated || !user || !isSupabaseConfigured) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // 1. Get the user's profile to find their linked client_id
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("client_id")
        .eq("id", user.id)
        .single();

      if (profileErr) throw profileErr;
      
      const clientId = profile?.client_id;
      if (!clientId) {
        // User is not linked to a client
        setData(prev => ({ ...prev, loading: false }));
        return;
      }

      // 2. Fetch the client record and account manager
      const { data: client, error: clientErr } = await supabase
        .from("clients")
        .select("*, account_manager:profiles!account_manager_id(*)")
        .eq("id", clientId)
        .single();
        
      if (clientErr) throw clientErr;
      
      const accountManagerData = client.account_manager;
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
        id: client.id,
        companyName: client.company_name,
        primaryContactName: client.primary_contact_name,
        primaryContactEmail: client.primary_contact_email,
        phone: client.phone,
        status: client.status,
        accountManagerId: client.account_manager_id,
        googleDriveUrl: client.google_drive_url,
        notes: client.notes,
        createdAt: client.created_at,
      };

      // 3. Fetch the main project
      const { data: projects, error: projectsErr } = await supabase
        .from("projects")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_main_project", true)
        .order("created_at", { ascending: false })
        .limit(1);
        
      if (projectsErr) throw projectsErr;
      
      let formattedProject = null;
      let projectId = null;
      
      if (projects && projects.length > 0) {
        projectId = projects[0].id;
        formattedProject = {
          id: projects[0].id,
          clientId: projects[0].client_id,
          packageTemplateId: projects[0].package_template_id,
          projectName: projects[0].project_name,
          description: projects[0].description,
          status: projects[0].status,
          currentPhaseId: projects[0].current_phase_id,
          isMainProject: projects[0].is_main_project,
          parentProjectId: projects[0].parent_project_id,
          createdAt: projects[0].created_at,
        } as Project;
      }

      // 4. Fetch phases & tasks if we have a project
      let formattedPhases: Phase[] = [];
      let formattedTasks: Task[] = [];
      let formattedDeliverables: Deliverable[] = [];
      
      if (projectId) {
        // Fetch phases first so we can filter tasks/deliverables by phase_id
        const phasesRes = await supabase
          .from("phases")
          .select("*")
          .eq("project_id", projectId)
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
          // Fetch tasks and deliverables filtered by this project's phase IDs
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
          // Sort tasks by phase order first, then by task sort_order within each phase
          const phaseOrderMap = new Map(formattedPhases.map((p, i) => [p.id, i]));
          formattedTasks = (tasksRes.data || [])
            .map(t => ({
              id: t.id,
              phaseId: t.phase_id,
              title: t.title,
              description: t.description,
              taskType: t.task_type,
              status: t.status,
              completedAt: t.completed_at,
              assignedToUserId: t.assigned_to_user_id,
              visibleToClient: t.visible_to_client,
              sortOrder: t.sort_order,
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

      // 5. Fetch documents, updates, questions
      const [docsRes, updatesRes, questionsRes] = await Promise.all([
        supabase.from("documents").select("*").eq("client_id", clientId).eq("visible_to_client", true).order("uploaded_at", { ascending: false }),
        supabase.from("updates").select("*, created_by_user:profiles!created_by(*)").eq("client_id", clientId).eq("visible_to_client", true).order("created_at", { ascending: false }),
        supabase.from("questions").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
      ]);

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

      if (questionsRes.error) throw questionsRes.error;
      const formattedQuestions: Question[] = (questionsRes.data || []).map(q => ({
        id: q.id,
        clientId: q.client_id,
        projectId: q.project_id,
        subject: q.subject,
        message: q.message,
        attachmentUrl: q.attachment_url,
        status: q.status,
        response: q.response,
        respondedBy: q.responded_by,
        createdAt: q.created_at,
      }));

      setData({
        client: formattedClient,
        project: formattedProject,
        phases: formattedPhases,
        tasks: formattedTasks,
        deliverables: formattedDeliverables,
        documents: formattedDocuments,
        updates: formattedUpdates,
        questions: formattedQuestions,
        accountManager,
        loading: false,
        error: null,
      });

    } catch (err: any) {
      console.error("Error fetching client data:", err);
      setData(prev => ({ ...prev, loading: false, error: err }));
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  return {
    ...data,
    refetch: fetchClientData
  };
}
