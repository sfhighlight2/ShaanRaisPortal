import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Building, Mail, Phone, ExternalLink, MoreHorizontal,
  CheckCircle, Clock, Lock, MessageSquare, FileText, Activity, ClipboardList,
  Edit, Trash2, Plus, GripVertical, File, Link2, Eye, EyeOff, Users,
  Globe, FolderOpen, Video, Table2, Palette, Upload, X,
  Instagram, Twitter, Linkedin, Youtube, Facebook, Hash, StickyNote, Send,
  UserPlus, KeyRound, Search, Filter
} from "lucide-react";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { edgeFetch } from "@/lib/edgeFetch";
import { useToast } from "@/hooks/use-toast";
import { DndContext, useDraggable, useDroppable, DragOverlay, closestCorners } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { ClientStatus, PhaseStatus, PackageTemplate, LinkType } from "@/lib/types";

// ── Kanban Components ──
function KanbanColumn({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-2 p-3 bg-muted/30 rounded-lg min-h-[200px] border-2 transition-colors ${
        isOver ? "border-primary bg-primary/5" : "border-transparent"
      }`}
    >
      <h3 className="font-semibold text-sm mb-2 text-muted-foreground">{title}</h3>
      <div className="flex-1 flex flex-col gap-2">
        {children}
      </div>
    </div>
  );
}

function KanbanTaskCard({ task, openTaskDialog, deleteTask }: any) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: task,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex flex-col gap-2 p-3 bg-card rounded-lg border shadow-sm cursor-grab active:cursor-grabbing group hover:border-primary/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-tight">{task.title}</p>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-6 w-6" onPointerDown={(e) => e.stopPropagation()} onClick={() => openTaskDialog(task)}><Edit className="h-3 w-3" /></Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onPointerDown={(e) => e.stopPropagation()} onClick={() => deleteTask(task.id)}><Trash2 className="h-3 w-3" /></Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mt-1">
        <Badge variant="outline" className="text-[10px]">{task.taskType}</Badge>
        {task.notes && (
          <span className="inline-flex items-center gap-1 text-[10px] text-primary/70 bg-primary/5 border border-primary/15 rounded px-1.5 py-0.5">
            <StickyNote className="h-2 w-2" /> Note
          </span>
        )}
      </div>
      {task.subtasks && task.subtasks.length > 0 && (
        <div className="space-y-1 mt-2 border-t pt-2">
          {task.subtasks.map((st: any) => (
            <div key={st.id} className="flex items-center gap-1.5 text-xs">
              <CheckSquare className={`h-3 w-3 shrink-0 ${st.completed ? 'text-success' : 'text-muted-foreground'}`} />
              <span className={st.completed ? 'line-through text-muted-foreground' : 'text-foreground/90'}>{st.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const statusColors: Record<ClientStatus, string> = {
  lead: "bg-muted text-muted-foreground",
  onboarding: "bg-warning/10 text-warning",
  active: "bg-success/10 text-success",
  waiting_on_client: "bg-destructive/10 text-destructive",
  completed: "bg-primary/10 text-primary",
  archived: "bg-muted text-muted-foreground",
};

const phaseStatusStyles: Record<PhaseStatus, string> = {
  completed: "bg-success text-success-foreground",
  current: "bg-primary text-primary-foreground",
  upcoming: "bg-muted text-muted-foreground",
  locked: "bg-muted/50 text-muted-foreground",
};

interface ClientData {
  id: string;
  companyName: string;
  primaryContactName: string;
  primaryContactEmail: string;
  phone?: string;
  status: ClientStatus;
  googleDriveUrl?: string;
  airtableUrl?: string;
  manager?: { id: string; firstName: string; lastName: string } | null;
  package_template_id?: string;
  userId?: string | null;
}

interface Phase {
  id: string;
  name: string;
  status: PhaseStatus;
  sortOrder: number;
}

interface Task { id: string; title: string; taskType: string; status: string; phaseId: string; phaseName?: string; notes?: string; subtasks?: { id: string; title: string; completed: boolean; sortOrder: number }[]; }
interface Deliverable { id: string; title: string; phaseId: string; phaseName?: string; visibleToClient: boolean; }
interface Update { id: string; title: string; createdAt: string; }
interface Question { id: string; subject: string; message: string; response?: string; status: string; }
interface ActivityLog { id: string; eventLabel: string; createdAt: string; }
interface DocumentRow { id: string; title: string; documentType: string; fileUrl?: string; visibleToClient: boolean; uploadedAt: string; }
interface LinkRow { id: string; title: string; url: string; linkType: LinkType; description?: string; visibleToClient: boolean; createdAt: string; }
interface NoteRow { id: string; content: string; createdBy?: string; authorName?: string; visibleToClient: boolean; createdAt: string; updatedAt: string; }

const AdminClientDetail: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { clientId } = useParams();
  const { startImpersonation } = useImpersonation();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  // Edit State
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState<{
    companyName: string; contactName: string; email: string; phone: string;
    status: ClientStatus; driveUrl: string; airtableUrl: string; managerId: string;
    packageTemplateId: string;
  } | null>(null);
  const [managers, setManagers] = useState<{id: string, name: string}[]>([]);
  const [templates, setTemplates] = useState<PackageTemplate[]>([]);
  const [savingClient, setSavingClient] = useState(false);

  // Task State
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({ title: "", taskType: "review", status: "pending", phaseId: "", notes: "" });
  const [savingTask, setSavingTask] = useState(false);
  // Subtask state
  const [subtasks, setSubtasks] = useState<{ id?: string; title: string; completed: boolean }[]>([]);
  const [subtaskInput, setSubtaskInput] = useState("");

  // Deliverable State
  const [showDelivDialog, setShowDelivDialog] = useState(false);
  const [editDeliv, setEditDeliv] = useState<Deliverable | null>(null);
  const [delivForm, setDelivForm] = useState({ title: "", description: "", phaseId: "", visibleToClient: false });
  const [savingDeliv, setSavingDeliv] = useState(false);

  // Document State
  const [showDocDialog, setShowDocDialog] = useState(false);
  const [editDoc, setEditDoc] = useState<DocumentRow | null>(null);
  const [docForm, setDocForm] = useState({ title: "", documentType: "other", fileUrl: "", visibleToClient: true });
  const [savingDoc, setSavingDoc] = useState(false);
  const [docUploadMode, setDocUploadMode] = useState<"upload" | "link">("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Link State
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [editLink, setEditLink] = useState<LinkRow | null>(null);
  const [linkForm, setLinkForm] = useState({ title: "", url: "", linkType: "other" as LinkType, description: "", visibleToClient: true });
  const [savingLink, setSavingLink] = useState(false);

  // Notes State
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [newNote, setNewNote] = useState("");
  const [newNoteVisible, setNewNoteVisible] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [editNoteId, setEditNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState("");

  // Portal Login State
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [creatingLogin, setCreatingLogin] = useState(false);

  // Tab Search & Filter State
  const [tabSearch, setTabSearch] = useState({
    tasks: "", tasksFilter: "all", tasksSort: "default",
    deliverables: "", deliverablesFilter: "all", deliverablesSort: "default",
    documents: "", documentsFilter: "all", documentsSort: "newest",
    links: "", linksFilter: "all", linksSort: "newest",
    notes: "", notesFilter: "all",
  });
  const [tasksViewMode, setTasksViewMode] = useState<"list" | "kanban">("list");
  const [activeDragTask, setActiveDragTask] = useState<any>(null);

  const [client, setClient] = useState<ClientData | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [clientLinks, setClientLinks] = useState<LinkRow[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  const loadAll = useCallback(async (options?: { silent?: boolean }) => {
    if (!clientId) return;
    // silent = true: background refresh after saves — keep existing UI visible
    // silent = false/undefined: initial page load — show loading spinner
    if (!options?.silent) setLoading(true);
    try {
      // Fire ALL independent queries in parallel to avoid waterfall loading
      const [clientRes, mgrsRes, tmplsRes, projectsRes, updatesRes, questionsRes, activityRes, docsRes, linksRes, notesRes] = await Promise.all([
        supabase.from("clients").select("*, manager:profiles!account_manager_id(id, first_name, last_name)").eq("id", clientId).single(),
        supabase.from("profiles").select("id, first_name, last_name").in("role", ["admin", "manager"]),
        supabase.from("package_templates").select("id, name").order("name"),
        supabase.from("projects").select("id").eq("client_id", clientId).eq("is_main_project", true).limit(1),
        supabase.from("updates").select("id, title, created_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(5),
        supabase.from("questions").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
        supabase.from("activity_logs").select("id, event_label, created_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(10),
        supabase.from("documents").select("*").eq("client_id", clientId).order("uploaded_at", { ascending: false }),
        supabase.from("client_links").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
        supabase.from("client_notes").select("*, author:profiles!created_by(first_name, last_name)").eq("client_id", clientId).order("created_at", { ascending: false }),
      ]);

      // --- Client ---
      const c = clientRes.data;
      if (!c) { navigate("/admin/clients"); return; }

      const managerRaw = Array.isArray(c.manager) ? c.manager[0] : c.manager;
      setClient({
        id: c.id,
        companyName: c.company_name,
        primaryContactName: c.primary_contact_name,
        primaryContactEmail: c.primary_contact_email,
        phone: c.phone ?? undefined,
        status: c.status as ClientStatus,
        googleDriveUrl: c.google_drive_url ?? undefined,
        airtableUrl: c.airtable_url ?? undefined,
        manager: managerRaw ? { id: managerRaw.id, firstName: managerRaw.first_name, lastName: managerRaw.last_name } : null,
        package_template_id: c.package_template_id ?? undefined,
        userId: c.user_id ?? null,
      });

      // --- Managers & Templates ---
      if (mgrsRes.data) setManagers(mgrsRes.data.map(m => ({ id: m.id, name: `${m.first_name} ${m.last_name}` })));
      if (tmplsRes.data) setTemplates(tmplsRes.data as PackageTemplate[]);

      // --- Project → Phases → Tasks + Deliverables (sequential dependency) ---
      const projectId = projectsRes.data?.[0]?.id;

      if (projectId) {
        const { data: phasesData } = await supabase.from("phases").select("*").eq("project_id", projectId).order("sort_order");
        const formattedPhases: Phase[] = (phasesData || []).map(p => ({
          id: p.id, name: p.name, status: p.status as PhaseStatus, sortOrder: p.sort_order,
        }));
        setPhases(formattedPhases);

        const phaseIds = formattedPhases.map(p => p.id);
        if (phaseIds.length > 0) {
          const [tasksRes2, deliverablesRes] = await Promise.all([
            supabase.from("tasks").select("*, task_subtasks(*)").in("phase_id", phaseIds).order("sort_order"),
            supabase.from("deliverables").select("*").in("phase_id", phaseIds),
          ]);

          setTasks((tasksRes2.data || []).map(t => ({
            id: t.id, title: t.title, taskType: t.task_type, status: t.status,
            phaseId: t.phase_id, phaseName: formattedPhases.find(p => p.id === t.phase_id)?.name,
            notes: t.notes ?? undefined,
            subtasks: (t.task_subtasks || []).map((st: any) => ({
              id: st.id, title: st.title, completed: st.completed, sortOrder: st.sort_order
            })).sort((a: any, b: any) => a.sortOrder - b.sortOrder),
          })));

          setDeliverables((deliverablesRes.data || []).map(d => ({
            id: d.id, title: d.title, phaseId: d.phase_id, visibleToClient: d.visible_to_client,
            phaseName: formattedPhases.find(p => p.id === d.phase_id)?.name,
          })));
        } else {
          setPhases(formattedPhases);
          setTasks([]);
          setDeliverables([]);
        }
      } else {
        setPhases([]);
        setTasks([]);
        setDeliverables([]);
      }

      // --- Updates, Questions, Activity, Documents, Links (already resolved) ---
      setUpdates((updatesRes.data || []).map(u => ({ id: u.id, title: u.title, createdAt: u.created_at })));
      setQuestions((questionsRes.data || []).map(q => ({
        id: q.id, subject: q.subject, message: q.message, response: q.response ?? undefined, status: q.status,
      })));
      setActivities((activityRes.data || []).map(a => ({ id: a.id, eventLabel: a.event_label, createdAt: a.created_at })));
      setDocuments((docsRes.data || []).map(d => ({
        id: d.id, title: d.title, documentType: d.document_type, fileUrl: d.file_url ?? undefined,
        visibleToClient: d.visible_to_client, uploadedAt: d.uploaded_at,
      })));
      setClientLinks((linksRes.data || []).map(l => ({
        id: l.id, title: l.title, url: l.url, linkType: l.link_type as LinkType,
        description: l.description ?? undefined, visibleToClient: l.visible_to_client, createdAt: l.created_at,
      })));

      // --- Notes (already resolved) ---
      setNotes((notesRes.data || []).map(n => {
        const author = Array.isArray(n.author) ? n.author[0] : n.author;
        return {
          id: n.id, content: n.content, createdBy: n.created_by,
          authorName: author ? `${author.first_name} ${author.last_name}` : undefined,
          visibleToClient: n.visible_to_client,
          createdAt: n.created_at, updatedAt: n.updated_at,
        };
      }));
    } catch (err) {
      console.error("ClientDetail load error:", err);
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [clientId, navigate]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleEditClient = async () => {
    if (!editForm || !clientId || !client) return;
    setSavingClient(true);
    try {
      const packageTemplateId = editForm.packageTemplateId === "unassigned" ? null : editForm.packageTemplateId;
      
      const { error } = await supabase.from("clients").update({
        company_name: editForm.companyName,
        primary_contact_name: editForm.contactName,
        primary_contact_email: editForm.email || null,
        phone: editForm.phone || null,
        status: editForm.status,
        google_drive_url: editForm.driveUrl || null,
        airtable_url: editForm.airtableUrl || null,
        account_manager_id: editForm.managerId === "unassigned" ? null : editForm.managerId,
        package_template_id: packageTemplateId,
      }).eq("id", clientId);
      
      if (error) {
        console.error(error);
        toast({ title: "Error Saving", description: error.message, variant: "destructive" });
        return;
      }

      if (packageTemplateId && packageTemplateId !== client.package_template_id) {
        try {
          await edgeFetch("assign-package", { client_id: clientId, package_template_id: packageTemplateId });
          toast({ title: "Package Assigned", description: "Template tasks have been successfully applied." });
        } catch (pkgErr: any) {
          console.error("Failed to assign package:", pkgErr);
          toast({ title: "Template Warning", description: pkgErr.message || "Updated client but applying the new template failed.", variant: "destructive" });
        }
      } else {
        toast({ title: "Saved", description: "Client details updated." });
      }

      setShowEditDialog(false);
      loadAll({ silent: true });
    } finally {
      setSavingClient(false);
    }
  };

  const openEdit = () => {
    if (!client) return;
    setEditForm({
      companyName: client.companyName,
      contactName: client.primaryContactName,
      email: client.primaryContactEmail,
      phone: client.phone || "",
      status: client.status,
      driveUrl: client.googleDriveUrl || "",
      airtableUrl: client.airtableUrl || "",
      managerId: client.manager?.id || "unassigned",
      packageTemplateId: client.package_template_id || "unassigned",
    });
    setShowEditDialog(true);
  };

  const openTaskDialog = async (task?: Task) => {
    if (task) {
      setEditTask(task);
      setTaskForm({ title: task.title, taskType: task.taskType, status: task.status, phaseId: task.phaseId, notes: task.notes || "" });
      // Load existing subtasks
      const { data: stData } = await supabase.from('task_subtasks').select('*').eq('task_id', task.id).order('sort_order');
      setSubtasks((stData || []).map(st => ({ id: st.id, title: st.title, completed: st.completed })));
    } else {
      setEditTask(null);
      setTaskForm({ title: "", taskType: "review", status: "pending", phaseId: phases[0]?.id || "", notes: "" });
      setSubtasks([]);
    }
    setSubtaskInput("");
    setShowTaskDialog(true);
  };

  const saveTask = async () => {
    if (!taskForm.title || !taskForm.phaseId) return;
    setSavingTask(true);
    try {
      // Auto-calculate sort_order for new tasks based on current max
      const phaseTasks = tasks.filter(t => t.phaseId === taskForm.phaseId);
      const sortOrder = phaseTasks.length > 0 ? phaseTasks.length + 1 : 1;

      if (editTask) {
        const { error } = await supabase.from("tasks").update({
          title: taskForm.title, task_type: taskForm.taskType,
          status: taskForm.status, phase_id: taskForm.phaseId,
          notes: taskForm.notes || null,
        }).eq("id", editTask.id);
        if (error) { console.error(error); return; }

        // Sync subtasks
        await supabase.from('task_subtasks').delete().eq('task_id', editTask.id);
        if (subtasks.length > 0) {
          await supabase.from('task_subtasks').insert(
            subtasks.map((st, i) => ({ task_id: editTask.id, title: st.title, completed: st.completed, sort_order: i }))
          );
        }
      } else {
        const { error } = await supabase.from("tasks").insert({
          title: taskForm.title, task_type: taskForm.taskType,
          status: taskForm.status, phase_id: taskForm.phaseId,
          sort_order: sortOrder,
          notes: taskForm.notes || null,
        });
        if (error) { console.error(error); return; }

        // If there are subtasks, fetch the newly inserted task to get its id
        if (subtasks.length > 0) {
          const { data: newTask } = await supabase
            .from('tasks')
            .select('id')
            .eq('phase_id', taskForm.phaseId)
            .eq('title', taskForm.title)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          if (newTask?.id) {
            await supabase.from('task_subtasks').insert(
              subtasks.map((st, i) => ({ task_id: newTask.id, title: st.title, completed: st.completed, sort_order: i }))
            );
          }
        }
      }

      setShowTaskDialog(false);
      loadAll({ silent: true });
    } finally {
      setSavingTask(false);
    }
  };


  const deleteTask = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (!error) loadAll({ silent: true });
  };

  const openDelivDialog = (d?: Deliverable) => {
    if (d) {
      setEditDeliv(d);
      setDelivForm({ title: d.title, description: "", phaseId: d.phaseId, visibleToClient: d.visibleToClient });
    } else {
      setEditDeliv(null);
      setDelivForm({ title: "", description: "", phaseId: phases[0]?.id || "", visibleToClient: false });
    }
    setShowDelivDialog(true);
  };

  const saveDeliv = async () => {
    if (!delivForm.title || !delivForm.phaseId) return;
    setSavingDeliv(true);
    try {
      let error;
      if (editDeliv) {
        const { error: err } = await supabase.from("deliverables").update({
          title: delivForm.title, phase_id: delivForm.phaseId, visible_to_client: delivForm.visibleToClient
          // Add description to update if column exists, skipping for now
        }).eq("id", editDeliv.id);
        error = err;
      } else {
        const { error: err } = await supabase.from("deliverables").insert({
          title: delivForm.title, phase_id: delivForm.phaseId, visible_to_client: delivForm.visibleToClient
        });
        error = err;
      }
      if (!error) {
        setShowDelivDialog(false);
        loadAll({ silent: true });
      } else console.error(error);
    } finally {
      setSavingDeliv(false);
    }
  };

  const deleteDeliv = async (id: string) => {
    if (!confirm("Delete this deliverable?")) return;
    const { error } = await supabase.from("deliverables").delete().eq("id", id);
    if (!error) loadAll({ silent: true });
  };

  // Document CRUD
  const openDocDialog = (d?: DocumentRow) => {
    if (d) {
      setEditDoc(d);
      setDocForm({ title: d.title, documentType: d.documentType, fileUrl: d.fileUrl || "", visibleToClient: d.visibleToClient });
      setDocUploadMode(d.fileUrl?.includes("supabase") ? "upload" : "link");
    } else {
      setEditDoc(null);
      setDocForm({ title: "", documentType: "other", fileUrl: "", visibleToClient: true });
      setDocUploadMode("upload");
    }
    setSelectedFile(null);
    setUploadProgress(0);
    setShowDocDialog(true);
  };

  const saveDoc = async () => {
    if (!docForm.title || !clientId) return;
    setSavingDoc(true);
    try {
      let fileUrl = docForm.fileUrl || null;

      // Handle file upload to Supabase Storage
      if (docUploadMode === "upload" && selectedFile) {
        try {
          setUploadProgress(10);
          const fileExt = selectedFile.name.split(".").pop();
          const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const filePath = `${clientId}/${Date.now()}_${safeName}`;

          setUploadProgress(30);
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("client-documents")
            .upload(filePath, selectedFile, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) {
            console.error("Upload error:", uploadError);
            toast({ title: "Upload Failed", description: uploadError.message, variant: "destructive" });
            setUploadProgress(0);
            return;
          }

          setUploadProgress(80);
          const { data: urlData } = supabase.storage
            .from("client-documents")
            .getPublicUrl(uploadData.path);

          fileUrl = urlData.publicUrl;
          setUploadProgress(100);
        } catch (err) {
          console.error("File upload failed:", err);
          toast({ title: "Upload Failed", description: "Could not upload file. Please try again.", variant: "destructive" });
          setUploadProgress(0);
          return;
        }
      }

      let error;
      if (editDoc) {
        // If editing and replacing with a new uploaded file, remove the old file from storage
        if (selectedFile && editDoc.fileUrl?.includes("client-documents")) {
          try {
            const oldPath = editDoc.fileUrl.split("/client-documents/").pop();
            if (oldPath) {
              await supabase.storage.from("client-documents").remove([decodeURIComponent(oldPath)]);
            }
          } catch { /* old file cleanup is best-effort */ }
        }
        const { error: err } = await supabase.from("documents").update({
          title: docForm.title, document_type: docForm.documentType,
          file_url: fileUrl, visible_to_client: docForm.visibleToClient,
        }).eq("id", editDoc.id);
        error = err;
      } else {
        const { error: err } = await supabase.from("documents").insert({
          client_id: clientId, title: docForm.title, document_type: docForm.documentType,
          file_url: fileUrl, visible_to_client: docForm.visibleToClient,
        });
        error = err;
      }
      setUploadProgress(0);
      if (!error) {
        setShowDocDialog(false);
        toast({ title: editDoc ? "Document Updated" : "Document Added" });
        loadAll({ silent: true });
      } else {
        console.error(error);
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } finally {
      setSavingDoc(false);
    }
  };

  const deleteDoc = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    // Clean up the file from storage if it was uploaded
    const doc = documents.find(d => d.id === id);
    if (doc?.fileUrl?.includes("client-documents")) {
      try {
        const filePath = doc.fileUrl.split("/client-documents/").pop();
        if (filePath) {
          await supabase.storage.from("client-documents").remove([decodeURIComponent(filePath)]);
        }
      } catch { /* storage cleanup is best-effort */ }
    }
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (!error) { toast({ title: "Document Deleted" }); loadAll({ silent: true }); }
  };

  // Link CRUD
  const openLinkDialog = (l?: LinkRow) => {
    if (l) {
      setEditLink(l);
      setLinkForm({ title: l.title, url: l.url, linkType: l.linkType, description: l.description || "", visibleToClient: l.visibleToClient });
    } else {
      setEditLink(null);
      setLinkForm({ title: "", url: "", linkType: "other", description: "", visibleToClient: true });
    }
    setShowLinkDialog(true);
  };

  const saveLink = async () => {
    if (!linkForm.title || !linkForm.url || !clientId) return;
    setSavingLink(true);
    try {
      let error;
      if (editLink) {
        const { error: err } = await supabase.from("client_links").update({
          title: linkForm.title, url: linkForm.url, link_type: linkForm.linkType,
          description: linkForm.description || null, visible_to_client: linkForm.visibleToClient,
        }).eq("id", editLink.id);
        error = err;
      } else {
        const { error: err } = await supabase.from("client_links").insert({
          client_id: clientId, title: linkForm.title, url: linkForm.url,
          link_type: linkForm.linkType, description: linkForm.description || null,
          visible_to_client: linkForm.visibleToClient,
        });
        error = err;
      }
      if (!error) {
        setShowLinkDialog(false);
        toast({ title: editLink ? "Link Updated" : "Link Added" });
        loadAll({ silent: true });
      } else {
        console.error(error);
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Failed to save link", variant: "destructive" });
    } finally {
      setSavingLink(false);
    }
  };

  const deleteLink = async (id: string) => {
    if (!confirm("Delete this link?")) return;
    const { error } = await supabase.from("client_links").delete().eq("id", id);
    if (!error) { toast({ title: "Link Deleted" }); loadAll({ silent: true }); }
  };

  // Kanban Drag Handlers
  const handleDragStart = (event: any) => {
    const { active } = event;
    setActiveDragTask(active.data.current);
  };

  const handleDragEnd = async (event: any) => {
    setActiveDragTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id;
    const newStatus = over.id; // pending, in_progress, completed, blocked
    
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    // Persist
    const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId);
    if (error) {
      toast({ title: "Failed to update status", variant: "destructive" });
      loadAll({ silent: true }); // revert
    } else {
      toast({ title: "Task status updated" });
    }
  };

  // Notes CRUD
  const addNote = async () => {
    if (!newNote.trim() || !clientId) return;
    setSavingNote(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.from("client_notes").insert({
        client_id: clientId,
        content: newNote.trim(),
        created_by: session?.user?.id || null,
        visible_to_client: newNoteVisible,
      });
      if (!error) {
        setNewNote("");
        setNewNoteVisible(false);
        toast({ title: "Note Added" });
        loadAll({ silent: true });
      } else {
        console.error(error);
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } finally {
      setSavingNote(false);
    }
  };

  const updateNote = async (id: string) => {
    if (!editNoteContent.trim()) return;
    setSavingNote(true);
    try {
      const { error } = await supabase.from("client_notes").update({
        content: editNoteContent.trim(),
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (!error) {
        setEditNoteId(null);
        setEditNoteContent("");
        toast({ title: "Note Updated" });
        loadAll({ silent: true });
      } else {
        console.error(error);
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } finally {
      setSavingNote(false);
    }
  };

  const toggleNoteVisibility = async (note: NoteRow) => {
    const { error } = await supabase.from("client_notes").update({
      visible_to_client: !note.visibleToClient,
    }).eq("id", note.id);
    if (!error) {
      toast({ title: note.visibleToClient ? "Note hidden from client" : "Note shared with client" });
      loadAll({ silent: true });
    }
  };

  const deleteNote = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    const { error } = await supabase.from("client_notes").delete().eq("id", id);
    if (!error) { toast({ title: "Note Deleted" }); loadAll({ silent: true }); }
  };

  const createPortalLogin = async () => {
    if (!loginForm.email || !loginForm.password || !clientId || !client) return;
    if (loginForm.password.length < 6) {
      toast({ title: "Password Too Short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setCreatingLogin(true);
    try {
      // Split the client contact name into first/last for the profile
      const nameParts = client.primaryContactName.trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      await edgeFetch("create-user", {
        email: loginForm.email,
        password: loginForm.password,
        first_name: firstName,
        last_name: lastName,
        role: "client",
        client_id: clientId,
      });
      toast({ title: "Portal Login Created", description: `Login created for ${loginForm.email}. The client can now sign in.` });
      setShowLoginDialog(false);
      loadAll({ silent: true });
    } catch (err: any) {
      toast({ title: "Failed to Create Login", description: err?.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setCreatingLogin(false);
    }
  };

  // ── Filtered + Sorted data for tab search/filter ──
  const sq = (key: keyof typeof tabSearch) => (tabSearch[key] as string).toLowerCase();

  const sortedTasks = (() => {
    const filtered = tasks.filter(t => {
      const matchesSearch = !tabSearch.tasks || t.title.toLowerCase().includes(sq("tasks")) || (t.phaseName || "").toLowerCase().includes(sq("tasks"));
      const matchesFilter = tabSearch.tasksFilter === "all" || t.status === tabSearch.tasksFilter;
      return matchesSearch && matchesFilter;
    });
    if (tabSearch.tasksSort === "az") return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    if (tabSearch.tasksSort === "za") return [...filtered].sort((a, b) => b.title.localeCompare(a.title));
    if (tabSearch.tasksSort === "newest") return [...filtered].reverse();
    return filtered;
  })();
  const filteredTasks = sortedTasks;

  const sortedDeliverables = (() => {
    const filtered = deliverables.filter(d => {
      const matchesSearch = !tabSearch.deliverables || d.title.toLowerCase().includes(sq("deliverables")) || (d.phaseName || "").toLowerCase().includes(sq("deliverables"));
      const matchesFilter = tabSearch.deliverablesFilter === "all" || (tabSearch.deliverablesFilter === "visible" ? d.visibleToClient : !d.visibleToClient);
      return matchesSearch && matchesFilter;
    });
    if (tabSearch.deliverablesSort === "az") return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    if (tabSearch.deliverablesSort === "za") return [...filtered].sort((a, b) => b.title.localeCompare(a.title));
    if (tabSearch.deliverablesSort === "newest") return [...filtered].reverse();
    return filtered;
  })();
  const filteredDeliverables = sortedDeliverables;

  const sortedDocuments = (() => {
    const filtered = documents.filter(d => {
      const matchesSearch = !tabSearch.documents || d.title.toLowerCase().includes(sq("documents"));
      const matchesFilter = tabSearch.documentsFilter === "all" || d.documentType === tabSearch.documentsFilter;
      return matchesSearch && matchesFilter;
    });
    if (tabSearch.documentsSort === "az") return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    if (tabSearch.documentsSort === "za") return [...filtered].sort((a, b) => b.title.localeCompare(a.title));
    if (tabSearch.documentsSort === "newest") return [...filtered].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    return filtered;
  })();
  const filteredDocuments = sortedDocuments;

  const sortedLinks = (() => {
    const filtered = clientLinks.filter(l => {
      const matchesSearch = !tabSearch.links || l.title.toLowerCase().includes(sq("links")) || (l.description || "").toLowerCase().includes(sq("links"));
      const matchesFilter = tabSearch.linksFilter === "all" || l.linkType === tabSearch.linksFilter;
      return matchesSearch && matchesFilter;
    });
    if (tabSearch.linksSort === "az") return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    if (tabSearch.linksSort === "za") return [...filtered].sort((a, b) => b.title.localeCompare(a.title));
    if (tabSearch.linksSort === "newest") return [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return filtered;
  })();
  const filteredLinks = sortedLinks;

  const filteredNotes = notes.filter(n => {
    const matchesSearch = !tabSearch.notes || n.content.toLowerCase().includes(sq("notes")) || (n.authorName || "").toLowerCase().includes(sq("notes"));
    const matchesFilter = tabSearch.notesFilter === "all" || (tabSearch.notesFilter === "visible" ? n.visibleToClient : !n.visibleToClient);
    return matchesSearch && matchesFilter;
  });

  const linkTypeIcons: Record<LinkType, React.ElementType> = {
    folder: FolderOpen, document: FileText, video: Video,
    spreadsheet: Table2, design: Palette, other: Globe,
    website: Globe, instagram: Instagram, facebook: Facebook,
    twitter: Twitter, linkedin: Linkedin, tiktok: Hash, youtube: Youtube,
  };

  const linkTypeLabels: Record<LinkType, string> = {
    folder: "Folder", document: "Document", video: "Media",
    spreadsheet: "Spreadsheet", design: "Design", other: "Link",
    website: "Website", instagram: "Instagram", facebook: "Facebook",
    twitter: "Twitter / X", linkedin: "LinkedIn", tiktok: "TikTok", youtube: "YouTube",
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!client) return null;

  const currentPhase = phases.find(p => p.status === "current");
  const completedTasks = tasks.filter(t => t.status === "completed");
  const openQuestions = questions.filter(q => q.status === "open");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/clients")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-heading font-semibold text-foreground">{client.companyName}</h1>
              <Badge className={`text-xs ${statusColors[client.status]}`}>
                {client.status.replaceAll("_", " ")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {client.primaryContactName} · {client.primaryContactEmail}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Portal Login Status */}
          {client.userId ? (
            <Badge className="gap-1.5 bg-success/10 text-success border-success/30 px-3 py-1.5 text-xs font-medium">
              <KeyRound className="h-3.5 w-3.5" /> Portal Login Active
            </Badge>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                setLoginForm({ email: client.primaryContactEmail || "", password: "" });
                setShowLoginDialog(true);
              }}
            >
              <UserPlus className="h-4 w-4" /> Create Portal Login
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              if (clientId && client) {
                startImpersonation(clientId, client.companyName);
                navigate(`/admin/clients/${clientId}/view/dashboard`);
              }
            }}
          >
            <Users className="h-4 w-4" /> View as Client
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={openEdit}>
            <MoreHorizontal className="h-4 w-4" /> Edit Client
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Package</p>
          <p className="text-sm font-medium text-foreground mt-1 truncate">{templates.find(t => t.id === client.package_template_id)?.name || "—"}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Phase</p>
          <p className="text-sm font-medium text-foreground mt-1">{currentPhase?.name || "—"}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Tasks</p>
          <p className="text-sm font-medium text-foreground mt-1">{completedTasks.length}/{tasks.length} done</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Consultant</p>
          <p className="text-sm font-medium text-foreground mt-1">{client.manager?.firstName || "—"}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Questions</p>
          <p className="text-sm font-medium text-foreground mt-1">{openQuestions.length} open</p>
        </CardContent></Card>
      </div>

      {/* Phase Tracker */}
      {phases.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Project Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start w-full">
              {phases.map((phase, i) => (
                <React.Fragment key={phase.id}>
                  <div className="flex flex-col items-center flex-1 min-w-0">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${phaseStatusStyles[phase.status]}`}>
                      {phase.status === "completed" ? <CheckCircle className="h-3.5 w-3.5" /> :
                        phase.status === "locked" ? <Lock className="h-3 w-3" /> : i + 1}
                    </div>
                    <p className={`text-xs mt-1.5 text-center leading-tight px-1 ${phase.status === "current" ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {phase.name}
                    </p>
                  </div>
                  {i < phases.length - 1 && (
                    <div className={`h-0.5 flex-1 mt-3.5 mx-1 shrink-0 ${phases[i + 1].status === "locked" || phases[i + 1].status === "upcoming" ? "bg-muted" : "bg-primary"}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Client Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Client</DialogTitle></DialogHeader>
          {editForm && (
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Company Name</label>
                <Input value={editForm.companyName} onChange={e => setEditForm({ ...editForm, companyName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-sm font-medium">Contact Name</label><Input value={editForm.contactName} onChange={e => setEditForm(f => f ? ({ ...f, contactName: e.target.value }) : null)} /></div>
                <div className="space-y-1.5"><label className="text-sm font-medium">Email</label><Input type="email" value={editForm.email} onChange={e => setEditForm(f => f ? ({ ...f, email: e.target.value }) : null)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-sm font-medium">Phone</label><Input value={editForm.phone} onChange={e => setEditForm(f => f ? ({ ...f, phone: e.target.value }) : null)} /></div>
                <div className="space-y-1.5"><label className="text-sm font-medium">Status</label>
                  <Select value={editForm.status} onValueChange={v => setEditForm(f => f ? ({ ...f, status: v as ClientStatus }) : null)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["lead", "onboarding", "active", "waiting_on_client", "completed", "archived"] as ClientStatus[]).map(s => (
                        <SelectItem key={s} value={s}>{s.replaceAll("_", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5"><label className="text-sm font-medium">Google Drive URL</label><Input value={editForm.driveUrl} onChange={e => setEditForm(f => f ? ({ ...f, driveUrl: e.target.value }) : null)} /></div>
              <div className="space-y-1.5"><label className="text-sm font-medium">Airtable URL</label><Input value={editForm.airtableUrl} onChange={e => setEditForm(f => f ? ({ ...f, airtableUrl: e.target.value }) : null)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-sm font-medium">Business Consultant</label>
                  <Select value={editForm.managerId} onValueChange={v => setEditForm(f => f ? ({ ...f, managerId: v }) : null)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {managers.map(m => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><label className="text-sm font-medium">Package Template</label>
                  <Select value={editForm.packageTemplateId} onValueChange={v => setEditForm(f => f ? ({ ...f, packageTemplateId: v }) : null)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">None</SelectItem>
                      {templates.map(t => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleEditClient} disabled={savingClient}>{savingClient ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Portal Login Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" /> Create Portal Login
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Create a login account so <strong>{client?.primaryContactName || "this client"}</strong> can access their portal dashboard.
          </p>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email *</label>
              <Input
                type="email"
                value={loginForm.email}
                onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                placeholder="client@company.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Password *</label>
              <Input
                type="password"
                value={loginForm.password}
                onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min 6 characters"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoginDialog(false)}>Cancel</Button>
            <Button onClick={createPortalLogin} disabled={creatingLogin || !loginForm.email || !loginForm.password}>
              {creatingLogin ? "Creating…" : "Create Login"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shared Task Form Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editTask ? "Edit Task" : "New Task"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><label className="text-sm font-medium">Task Title</label><Input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Gather Requirements" /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Phase</label>
              <Select value={taskForm.phaseId} onValueChange={v => setTaskForm(f => ({ ...f, phaseId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select phase" /></SelectTrigger>
                <SelectContent>{phases.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className="text-sm font-medium">Task Type</label>
                <Select value={taskForm.taskType} onValueChange={v => setTaskForm(f => ({ ...f, taskType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["review", "upload", "approval", "form", "general"]).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><label className="text-sm font-medium">Status</label>
                <Select value={taskForm.status} onValueChange={v => setTaskForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["pending", "in_progress", "completed", "failed"]).map(s => <SelectItem key={s} value={s}>{s.replaceAll("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Notes — visible to client */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Notes for Client</label>
                <span className="text-[11px] text-muted-foreground bg-primary/5 border border-primary/20 rounded px-1.5 py-0.5">Visible to client</span>
              </div>
              <textarea
                value={taskForm.notes}
                onChange={e => setTaskForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes or instructions the client will see on this task…"
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 resize-none"
              />
            </div>
            {/* Sub-tasks */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Sub-tasks</label>
                <span className="text-[11px] text-muted-foreground bg-primary/5 border border-primary/20 rounded px-1.5 py-0.5">Visible to client</span>
              </div>
              {subtasks.length > 0 && (
                <div className="space-y-1.5">
                  {subtasks.map((st, i) => (
                    <div key={i} className="flex items-center gap-2 group">
                      <input
                        type="checkbox"
                        checked={st.completed}
                        onChange={e => setSubtasks(prev => prev.map((s, j) => j === i ? { ...s, completed: e.target.checked } : s))}
                        className="h-4 w-4 rounded border-border accent-primary shrink-0"
                      />
                      <span className={`flex-1 text-sm ${st.completed ? 'line-through text-muted-foreground' : ''}`}>{st.title}</span>
                      <button
                        onClick={() => setSubtasks(prev => prev.filter((_, j) => j !== i))}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={subtaskInput}
                  onChange={e => setSubtaskInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && subtaskInput.trim()) {
                      e.preventDefault();
                      setSubtasks(prev => [...prev, { title: subtaskInput.trim(), completed: false }]);
                      setSubtaskInput('');
                    }
                  }}
                  placeholder="Add a sub-task and press Enter…"
                  className="text-sm h-8"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 shrink-0"
                  onClick={() => {
                    if (subtaskInput.trim()) {
                      setSubtasks(prev => [...prev, { title: subtaskInput.trim(), completed: false }]);
                      setSubtaskInput('');
                    }
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>Cancel</Button>
            <Button onClick={saveTask} disabled={savingTask}>{savingTask ? "Saving..." : "Save Task"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shared Deliverable Form Dialog */}
      <Dialog open={showDelivDialog} onOpenChange={setShowDelivDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editDeliv ? "Edit Deliverable" : "New Deliverable"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><label className="text-sm font-medium">Title</label><Input value={delivForm.title} onChange={e => setDelivForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Audit Report" /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Phase</label>
              <Select value={delivForm.phaseId} onValueChange={v => setDelivForm(f => ({ ...f, phaseId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select phase" /></SelectTrigger>
                <SelectContent>{phases.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/40 mt-2">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Visible to Client</label>
                <p className="text-xs text-muted-foreground">Will the client see this document?</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={delivForm.visibleToClient} onChange={e => setDelivForm(f => ({ ...f, visibleToClient: e.target.checked }))} />
                <div className="w-9 h-5 bg-muted-foreground/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelivDialog(false)}>Cancel</Button>
            <Button onClick={saveDeliv} disabled={savingDeliv}>{savingDeliv ? "Saving..." : "Save Deliverable"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5"><Building className="h-3.5 w-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5"><ClipboardList className="h-3.5 w-3.5" /> Tasks</TabsTrigger>
          <TabsTrigger value="deliverables" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Deliverables</TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5"><File className="h-3.5 w-3.5" /> Documents</TabsTrigger>
          <TabsTrigger value="links" className="gap-1.5"><Link2 className="h-3.5 w-3.5" /> Links</TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5"><StickyNote className="h-3.5 w-3.5" /> Notes</TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5"><Activity className="h-3.5 w-3.5" /> Activity</TabsTrigger>
          <TabsTrigger value="questions" className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Questions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base font-medium">Contact Information</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{client.primaryContactEmail}</span></div>
                {client.phone && <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{client.phone}</span></div>}
                {client.googleDriveUrl && (
                  <div className="flex items-center gap-3">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <a href={client.googleDriveUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">Google Drive Folder</a>
                  </div>
                )}
                {client.airtableUrl && (
                  <div className="flex items-center gap-3">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <a href={client.airtableUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">Airtable Workspace</a>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base font-medium">Team</CardTitle></CardHeader>
              <CardContent>
                {client.manager ? (
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {client.manager.firstName[0]}{client.manager.lastName[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{client.manager.firstName} {client.manager.lastName}</p>
                      <p className="text-xs text-muted-foreground">Business Consultant</p>
                    </div>
                  </div>
                ) : <p className="text-sm text-muted-foreground">No business consultant assigned.</p>}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base font-medium">Recent Updates</CardTitle></CardHeader>
            <CardContent>
              {updates.length === 0 ? <p className="text-sm text-muted-foreground">No updates yet.</p> : (
                <div className="space-y-3">
                  {updates.map(u => (
                    <div key={u.id} className="border-l-2 border-primary/30 pl-3">
                      <p className="text-sm font-medium">{u.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(u.createdAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-medium">Project Tasks</CardTitle>
              <Button size="sm" onClick={() => openTaskDialog()}><Plus className="h-4 w-4 mr-2" /> New Task</Button>
            </CardHeader>
            <CardContent>
              {/* Search & Filter */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <div className="relative flex-1 min-w-[160px] max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search tasks..." value={tabSearch.tasks} onChange={e => setTabSearch(s => ({ ...s, tasks: e.target.value }))} className="pl-9 h-8 text-sm" />
                </div>
                <Select value={tabSearch.tasksFilter} onValueChange={v => setTabSearch(s => ({ ...s, tasksFilter: v }))}>
                  <SelectTrigger className="w-[140px] h-8 text-xs"><Filter className="h-3 w-3 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={tabSearch.tasksSort} onValueChange={v => setTabSearch(s => ({ ...s, tasksSort: v }))}>
                  <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default Order</SelectItem>
                    <SelectItem value="az">A → Z</SelectItem>
                    <SelectItem value="za">Z → A</SelectItem>
                    <SelectItem value="newest">Newest First</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1 bg-muted p-1 rounded-md ml-auto">
                  <Button variant={tasksViewMode === "list" ? "secondary" : "ghost"} size="sm" className="h-6 px-2 text-xs" onClick={() => setTasksViewMode("list")}>
                    <ClipboardList className="h-3.5 w-3.5 mr-1" /> List
                  </Button>
                  <Button variant={tasksViewMode === "kanban" ? "secondary" : "ghost"} size="sm" className="h-6 px-2 text-xs" onClick={() => setTasksViewMode("kanban")}>
                    <Table2 className="h-3.5 w-3.5 mr-1" /> Kanban
                  </Button>
                </div>
              </div>
              {filteredTasks.length === 0 ? <p className="text-sm text-muted-foreground py-4">{tasks.length === 0 ? "No tasks." : "No tasks match your search."}</p> : (
                tasksViewMode === "list" ? (
                  <div className="space-y-2">
                    {filteredTasks.map(t => (
                      <div key={t.id} className="flex flex-col gap-2 p-3 rounded-lg border group hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center ${t.status === "completed" ? "bg-success/10" : "bg-muted"}`}>
                            {t.status === "completed" ? <CheckCircle className="h-3.5 w-3.5 text-success" /> : <Clock className="h-3 w-3 text-muted-foreground" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{t.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-muted-foreground">{t.phaseName}</p>
                              {t.notes && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-primary/70 bg-primary/5 border border-primary/15 rounded px-1.5 py-0.5">
                                  <StickyNote className="h-2.5 w-2.5" /> Note
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] hidden md:inline-flex">{t.taskType}</Badge>
                          <Badge className={`text-[10px] hidden md:inline-flex ${t.status === "completed" ? 'bg-success/10 text-success hover:bg-success/20' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{t.status}</Badge>
                          <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openTaskDialog(t)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteTask(t.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                        {t.subtasks && t.subtasks.length > 0 && (
                          <div className="ml-9 space-y-1.5 mt-1 border-t pt-2">
                            {t.subtasks.map(st => (
                              <div key={st.id} className="flex items-center gap-2 text-sm">
                                <CheckSquare className={`h-3.5 w-3.5 shrink-0 ${st.completed ? 'text-success' : 'text-muted-foreground'}`} />
                                <span className={st.completed ? 'line-through text-muted-foreground' : 'text-foreground/90'}>{st.title}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                      <KanbanColumn id="pending" title="Pending">
                        {filteredTasks.filter(t => t.status === "pending").map(t => (
                          <KanbanTaskCard key={t.id} task={t} openTaskDialog={openTaskDialog} deleteTask={deleteTask} />
                        ))}
                      </KanbanColumn>
                      <KanbanColumn id="in_progress" title="In Progress">
                        {filteredTasks.filter(t => t.status === "in_progress").map(t => (
                          <KanbanTaskCard key={t.id} task={t} openTaskDialog={openTaskDialog} deleteTask={deleteTask} />
                        ))}
                      </KanbanColumn>
                      <KanbanColumn id="completed" title="Completed">
                        {filteredTasks.filter(t => t.status === "completed").map(t => (
                          <KanbanTaskCard key={t.id} task={t} openTaskDialog={openTaskDialog} deleteTask={deleteTask} />
                        ))}
                      </KanbanColumn>
                      <KanbanColumn id="blocked" title="Blocked">
                        {filteredTasks.filter(t => t.status === "blocked").map(t => (
                          <KanbanTaskCard key={t.id} task={t} openTaskDialog={openTaskDialog} deleteTask={deleteTask} />
                        ))}
                      </KanbanColumn>
                    </div>
                    <DragOverlay>
                      {activeDragTask ? (
                        <div className="opacity-80">
                          <KanbanTaskCard task={activeDragTask} openTaskDialog={openTaskDialog} deleteTask={deleteTask} />
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deliverables" className="mt-6">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-medium">Deliverables</CardTitle>
              <Button size="sm" onClick={() => openDelivDialog()}><Plus className="h-4 w-4 mr-2" /> New Deliverable</Button>
            </CardHeader>
            <CardContent>
              {/* Search & Filter */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <div className="relative flex-1 min-w-[160px] max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search deliverables..." value={tabSearch.deliverables} onChange={e => setTabSearch(s => ({ ...s, deliverables: e.target.value }))} className="pl-9 h-8 text-sm" />
                </div>
                <Select value={tabSearch.deliverablesFilter} onValueChange={v => setTabSearch(s => ({ ...s, deliverablesFilter: v }))}>
                  <SelectTrigger className="w-[140px] h-8 text-xs"><Filter className="h-3 w-3 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="visible">Visible</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={tabSearch.deliverablesSort} onValueChange={v => setTabSearch(s => ({ ...s, deliverablesSort: v }))}>
                  <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default Order</SelectItem>
                    <SelectItem value="az">A → Z</SelectItem>
                    <SelectItem value="za">Z → A</SelectItem>
                    <SelectItem value="newest">Newest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {filteredDeliverables.length === 0 ? <p className="text-sm text-muted-foreground py-4">{deliverables.length === 0 ? "No deliverables." : "No deliverables match your search."}</p> : (
                <div className="space-y-2">
                  {filteredDeliverables.map(d => (
                    <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border group hover:border-primary/50 transition-colors">
                      <FileText className="h-4 w-4 text-primary" />
                      <div className="flex-1"><p className="text-sm font-medium">{d.title}</p><p className="text-xs text-muted-foreground">{d.phaseName}</p></div>
                      <Badge variant="outline" className={`text-[10px] hidden md:inline-flex ${d.visibleToClient ? "bg-primary/5 border-primary/20" : "bg-muted text-muted-foreground"}`}>{d.visibleToClient ? "Visible to Client" : "Internal"}</Badge>
                      <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDelivDialog(d)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDeliv(d.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-medium">Documents</CardTitle>
              <Button size="sm" onClick={() => openDocDialog()}><Plus className="h-4 w-4 mr-2" /> Add Document</Button>
            </CardHeader>
            <CardContent>
              {/* Search & Filter */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <div className="relative flex-1 min-w-[160px] max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search documents..." value={tabSearch.documents} onChange={e => setTabSearch(s => ({ ...s, documents: e.target.value }))} className="pl-9 h-8 text-sm" />
                </div>
                <Select value={tabSearch.documentsFilter} onValueChange={v => setTabSearch(s => ({ ...s, documentsFilter: v }))}>
                  <SelectTrigger className="w-[140px] h-8 text-xs"><Filter className="h-3 w-3 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="sow">SOW</SelectItem>
                    <SelectItem value="agreement">Agreement</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={tabSearch.documentsSort} onValueChange={v => setTabSearch(s => ({ ...s, documentsSort: v }))}>
                  <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="az">A → Z</SelectItem>
                    <SelectItem value="za">Z → A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {filteredDocuments.length === 0 ? <p className="text-sm text-muted-foreground py-4">{documents.length === 0 ? "No documents." : "No documents match your search."}</p> : (
                <div className="space-y-2">
                  {filteredDocuments.map(d => (
                    <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border group hover:border-primary/50 transition-colors">
                      {d.fileUrl ? (d.fileUrl.includes("client-documents") ? <Upload className="h-4 w-4 text-primary shrink-0" /> : <Link2 className="h-4 w-4 text-primary shrink-0" />) : <File className="h-4 w-4 text-muted-foreground shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {d.fileUrl ? (
                            <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline truncate">{d.title}</a>
                          ) : (
                            <p className="text-sm font-medium truncate">{d.title}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px]">
                            {d.documentType === 'contract' ? 'Contract' : d.documentType === 'sow' ? 'Statement of Work' : d.documentType === 'agreement' ? 'Agreement' : 'Document'}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(d.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[10px] hidden md:inline-flex ${d.visibleToClient ? "bg-primary/5 border-primary/20" : "bg-muted text-muted-foreground"}`}>
                        {d.visibleToClient ? "Visible" : "Internal"}
                      </Badge>
                      <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDocDialog(d)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDoc(d.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links" className="mt-6">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-medium">Client Links</CardTitle>
              <Button size="sm" onClick={() => openLinkDialog()}><Plus className="h-4 w-4 mr-2" /> Add Link</Button>
            </CardHeader>
            <CardContent>
              {/* Search & Filter */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <div className="relative flex-1 min-w-[160px] max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search links..." value={tabSearch.links} onChange={e => setTabSearch(s => ({ ...s, links: e.target.value }))} className="pl-9 h-8 text-sm" />
                </div>
                <Select value={tabSearch.linksFilter} onValueChange={v => setTabSearch(s => ({ ...s, linksFilter: v }))}>
                  <SelectTrigger className="w-[140px] h-8 text-xs"><Filter className="h-3 w-3 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="folder">Folder</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="video">Media</SelectItem>
                    <SelectItem value="spreadsheet">Spreadsheet</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="twitter">Twitter / X</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={tabSearch.linksSort} onValueChange={v => setTabSearch(s => ({ ...s, linksSort: v }))}>
                  <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="az">A → Z</SelectItem>
                    <SelectItem value="za">Z → A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {filteredLinks.length === 0 ? <p className="text-sm text-muted-foreground py-4">{clientLinks.length === 0 ? "No links." : "No links match your search."}</p> : (
                <div className="space-y-2">
                  {filteredLinks.map(l => {
                    const LIcon = linkTypeIcons[l.linkType];
                    return (
                      <div key={l.id} className="flex items-center gap-3 p-3 rounded-lg border group hover:border-primary/50 transition-colors">
                        <LIcon className="h-4 w-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline truncate">{l.title}</a>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[10px]">{linkTypeLabels[l.linkType]}</Badge>
                            {l.description && <span className="text-[11px] text-muted-foreground truncate">{l.description}</span>}
                          </div>
                        </div>
                        <Badge variant="outline" className={`text-[10px] hidden md:inline-flex ${l.visibleToClient ? "bg-primary/5 border-primary/20" : "bg-muted text-muted-foreground"}`}>
                          {l.visibleToClient ? "Visible" : "Internal"}
                        </Badge>
                        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openLinkDialog(l)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteLink(l.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <StickyNote className="h-4 w-4" /> Notes
              </CardTitle>
              <p className="text-xs text-muted-foreground">Add notes for this client. Toggle visibility to share specific notes with the client.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Note */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                      placeholder="Write a note..."
                      rows={2}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 resize-none"
                      onKeyDown={e => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          addNote();
                        }
                      }}
                    />
                  </div>
                  <Button
                    size="sm"
                    className="self-end h-9 gap-1.5"
                    onClick={addNote}
                    disabled={savingNote || !newNote.trim()}
                  >
                    <Send className="h-3.5 w-3.5" />
                    {savingNote ? "Saving..." : "Add"}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="note-visible"
                    checked={newNoteVisible}
                    onCheckedChange={c => setNewNoteVisible(!!c)}
                  />
                  <Label htmlFor="note-visible" className="text-xs text-muted-foreground cursor-pointer">
                    {newNoteVisible ? "Visible to client" : "Internal only — not visible to client"}
                  </Label>
                </div>
              </div>

              {/* Search & Filter Notes */}
              <div className="flex items-center gap-2 mb-4 pt-2 border-t">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search notes..." value={tabSearch.notes} onChange={e => setTabSearch(s => ({ ...s, notes: e.target.value }))} className="pl-9 h-8 text-sm" />
                </div>
                <Select value={tabSearch.notesFilter} onValueChange={v => setTabSearch(s => ({ ...s, notesFilter: v }))}>
                  <SelectTrigger className="w-[140px] h-8 text-xs"><Filter className="h-3 w-3 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Notes</SelectItem>
                    <SelectItem value="visible">Visible</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes List */}
              {filteredNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{notes.length === 0 ? "No notes yet. Add the first one above." : "No notes match your search."}</p>
              ) : (
                <div className="space-y-3">
                  {filteredNotes.map(n => (
                    <div key={n.id} className={`p-3 rounded-lg border group hover:border-primary/30 transition-colors ${n.visibleToClient ? "border-primary/20 bg-primary/[0.02]" : ""}`}>
                      {editNoteId === n.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editNoteContent}
                            onChange={e => setEditNoteContent(e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                            autoFocus
                          />
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => { setEditNoteId(null); setEditNoteContent(""); }}>Cancel</Button>
                            <Button size="sm" onClick={() => updateNote(n.id)} disabled={savingNote || !editNoteContent.trim()}>
                              {savingNote ? "Saving..." : "Save"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{n.content}</p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {n.authorName && (
                                <span className="font-medium">{n.authorName}</span>
                              )}
                              <span>·</span>
                              <span>{new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                              {n.updatedAt !== n.createdAt && (
                                <span className="italic">(edited)</span>
                              )}
                              <Badge
                                variant="outline"
                                className={`text-[10px] cursor-pointer select-none ${n.visibleToClient ? "bg-primary/5 border-primary/20" : "bg-muted text-muted-foreground"}`}
                                onClick={() => toggleNoteVisibility(n)}
                              >
                                {n.visibleToClient ? <><Eye className="h-3 w-3 mr-1" />Visible</> : <><EyeOff className="h-3 w-3 mr-1" />Internal</>}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditNoteId(n.id); setEditNoteContent(n.content); }}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteNote(n.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardContent className="p-4">
              {activities.length === 0 ? <p className="text-sm text-muted-foreground py-4">No activity recorded.</p> : (
                <div className="space-y-3">
                  {activities.map(a => (
                    <div key={a.id} className="flex items-center gap-3 text-sm">
                      <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      <span className="flex-1">{a.eventLabel}</span>
                      <span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="mt-6">
          <Card>
            <CardContent className="p-4">
              {questions.length === 0 ? <p className="text-sm text-muted-foreground py-4">No questions.</p> : (
                <div className="space-y-3">
                  {questions.map(q => (
                    <div key={q.id} className="p-3 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">{q.subject}</p>
                        <Badge className={`text-[10px] ${q.status === "open" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>{q.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{q.message}</p>
                      {q.response && <p className="text-sm mt-2 p-2 bg-muted rounded">Response: {q.response}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Document Dialog */}
      <Dialog open={showDocDialog} onOpenChange={(open) => { setShowDocDialog(open); if (!open) { setSelectedFile(null); setUploadProgress(0); } }}>
        <DialogContent className="sm:max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="shrink-0"><DialogTitle>{editDoc ? "Edit Document" : "Add Document"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 overflow-y-auto flex-1 pr-1">
            <div>
              <Label className="text-sm font-medium">Title</Label>
              <Input className="mt-1" value={docForm.title} onChange={e => setDocForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Service Agreement" />
            </div>
            <div>
              <Label className="text-sm font-medium">Document Type</Label>
              <Select value={docForm.documentType} onValueChange={v => setDocForm(f => ({ ...f, documentType: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="sow">Statement of Work</SelectItem>
                  <SelectItem value="agreement">Agreement</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Upload Mode Toggle */}
            <div>
              <Label className="text-sm font-medium mb-2 block">File Source</Label>
              <div className="flex rounded-lg border border-border p-1 bg-muted/40 gap-1">
                <button
                  type="button"
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    docUploadMode === "upload"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setDocUploadMode("upload")}
                >
                  <Upload className="h-4 w-4" /> Upload File
                </button>
                <button
                  type="button"
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    docUploadMode === "link"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setDocUploadMode("link")}
                >
                  <Link2 className="h-4 w-4" /> Paste Link
                </button>
              </div>
            </div>

            {docUploadMode === "upload" ? (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.gif,.svg,.zip"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile(file);
                      // Auto-fill title if empty
                      if (!docForm.title) {
                        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
                        setDocForm(f => ({ ...f, title: nameWithoutExt }));
                      }
                    }
                  }}
                />
                {selectedFile ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/30 bg-primary/[0.03]">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <File className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/[0.02] transition-all"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        setSelectedFile(file);
                        if (!docForm.title) {
                          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
                          setDocForm(f => ({ ...f, title: nameWithoutExt }));
                        }
                      }
                    }}
                  >
                    <Upload className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">Click to browse or drag & drop</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">PDF, DOCX, XLSX, images, ZIP — up to 50 MB</p>
                  </div>
                )}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                {editDoc?.fileUrl && !selectedFile && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <File className="h-3 w-3" /> Current file attached — select a new file to replace it
                  </p>
                )}
              </div>
            ) : (
              <div>
                <Label className="text-sm font-medium">File URL / Link</Label>
                <Input className="mt-1" value={docForm.fileUrl} onChange={e => setDocForm(f => ({ ...f, fileUrl: e.target.value }))} placeholder="https://..." />
                <p className="text-xs text-muted-foreground mt-1">Paste a Google Drive, Dropbox, or any external link</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Checkbox id="doc-visible" checked={docForm.visibleToClient} onCheckedChange={c => setDocForm(f => ({ ...f, visibleToClient: !!c }))} />
              <Label htmlFor="doc-visible" className="text-sm">Visible to client</Label>
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t border-border pt-4">
            <Button variant="outline" onClick={() => setShowDocDialog(false)}>Cancel</Button>
            <Button
              onClick={saveDoc}
              disabled={savingDoc || !docForm.title || (docUploadMode === "upload" && !selectedFile && !editDoc?.fileUrl)}
            >
              {savingDoc ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {selectedFile ? "Uploading..." : "Saving..."}
                </span>
              ) : editDoc ? "Update" : "Add Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editLink ? "Edit Link" : "Add Link"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium">Title</Label>
              <Input className="mt-1" value={linkForm.title} onChange={e => setLinkForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Brand Assets Folder" />
            </div>
            <div>
              <Label className="text-sm font-medium">URL</Label>
              <Input className="mt-1" value={linkForm.url} onChange={e => setLinkForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
              <p className="text-xs text-muted-foreground mt-1">Paste a Google Drive, Dropbox, Loom, or any link</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Link Type</Label>
              <Select value={linkForm.linkType} onValueChange={v => setLinkForm(f => ({ ...f, linkType: v as LinkType }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="folder">📁 Folder</SelectItem>
                  <SelectItem value="document">📄 Document</SelectItem>
                  <SelectItem value="video">🎬 Media</SelectItem>
                  <SelectItem value="spreadsheet">📊 Spreadsheet</SelectItem>
                  <SelectItem value="design">🎨 Design</SelectItem>
                  <SelectItem value="website">🌐 Website</SelectItem>
                  <SelectItem value="other">🔗 Other</SelectItem>
                  <SelectItem value="__social__" disabled className="font-medium text-muted-foreground text-[11px] pointer-events-none opacity-60 mt-1 cursor-default">── Social Media ──</SelectItem>
                  <SelectItem value="instagram">📸 Instagram</SelectItem>
                  <SelectItem value="facebook">👥 Facebook</SelectItem>
                  <SelectItem value="twitter">🐦 Twitter / X</SelectItem>
                  <SelectItem value="linkedin">💼 LinkedIn</SelectItem>
                  <SelectItem value="tiktok">🎵 TikTok</SelectItem>
                  <SelectItem value="youtube">▶️ YouTube</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Description (optional)</Label>
              <Input className="mt-1" value={linkForm.description} onChange={e => setLinkForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description..." />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="link-visible" checked={linkForm.visibleToClient} onCheckedChange={c => setLinkForm(f => ({ ...f, visibleToClient: !!c }))} />
              <Label htmlFor="link-visible" className="text-sm">Visible to client</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>Cancel</Button>
            <Button onClick={saveLink} disabled={savingLink || !linkForm.title || !linkForm.url}>{savingLink ? "Saving..." : editLink ? "Update" : "Add Link"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminClientDetail;
