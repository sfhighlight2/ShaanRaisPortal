import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Building, Mail, Phone, ExternalLink, MoreHorizontal,
  CheckCircle, Clock, Lock, MessageSquare, FileText, Activity, ClipboardList,
  Edit, Trash2, Plus, GripVertical, File, Link2, Eye, EyeOff
} from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import type { ClientStatus, PhaseStatus, PackageTemplate } from "@/lib/types";

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
}

interface Phase {
  id: string;
  name: string;
  status: PhaseStatus;
  sortOrder: number;
}

interface Task { id: string; title: string; taskType: string; status: string; phaseId: string; phaseName?: string; }
interface Deliverable { id: string; title: string; phaseId: string; phaseName?: string; visibleToClient: boolean; }
interface Update { id: string; title: string; createdAt: string; }
interface Question { id: string; subject: string; message: string; response?: string; status: string; }
interface ActivityLog { id: string; eventLabel: string; createdAt: string; }
interface DocumentRow { id: string; title: string; documentType: string; fileUrl?: string; visibleToClient: boolean; uploadedAt: string; }

const AdminClientDetail: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { clientId } = useParams();
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
  const [taskForm, setTaskForm] = useState({ title: "", taskType: "review", status: "pending", phaseId: "" });
  const [savingTask, setSavingTask] = useState(false);

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

  const [client, setClient] = useState<ClientData | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  const loadAll = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      // Client + manager
      const { data: c } = await supabase
        .from("clients")
        .select("*, manager:profiles!account_manager_id(first_name, last_name)")
        .eq("id", clientId)
        .single();

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
      });

      // Load Managers and Templates for edit
      const { data: mgrs } = await supabase.from("profiles").select("id, first_name, last_name").in("role", ["admin", "manager"]);
      if (mgrs) setManagers(mgrs.map(m => ({ id: m.id, name: `${m.first_name} ${m.last_name}` })));
      
      const { data: tmpls } = await supabase.from("package_templates").select("id, name").order("name");
      if (tmpls) setTemplates(tmpls as PackageTemplate[]);

      // Project → phases
      const { data: projects } = await supabase.from("projects").select("id").eq("client_id", clientId).eq("is_main_project", true).limit(1);
      const projectId = projects?.[0]?.id;

      if (projectId) {
        const { data: phasesData } = await supabase.from("phases").select("*").eq("project_id", projectId).order("sort_order");
        const formattedPhases: Phase[] = (phasesData || []).map(p => ({
          id: p.id, name: p.name, status: p.status as PhaseStatus, sortOrder: p.sort_order,
        }));
        setPhases(formattedPhases);

        const phaseIds = formattedPhases.map(p => p.id);
        if (phaseIds.length > 0) {
          const [tasksRes, deliverablesRes] = await Promise.all([
            supabase.from("tasks").select("*").in("phase_id", phaseIds).order("sort_order"),
            supabase.from("deliverables").select("*").in("phase_id", phaseIds),
          ]);

          setTasks((tasksRes.data || []).map(t => ({
            id: t.id, title: t.title, taskType: t.task_type, status: t.status,
            phaseId: t.phase_id, phaseName: formattedPhases.find(p => p.id === t.phase_id)?.name,
          })));

          setDeliverables((deliverablesRes.data || []).map(d => ({
            id: d.id, title: d.title, phaseId: d.phase_id, visibleToClient: d.visible_to_client,
            phaseName: formattedPhases.find(p => p.id === d.phase_id)?.name,
          })));
        }
      }

      // Updates, Questions, Activity, Documents
      const [updatesRes, questionsRes, activityRes, docsRes] = await Promise.all([
        supabase.from("updates").select("id, title, created_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(5),
        supabase.from("questions").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
        supabase.from("activity_logs").select("id, event_label, created_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(10),
        supabase.from("documents").select("*").eq("client_id", clientId).order("uploaded_at", { ascending: false }),
      ]);

      setUpdates((updatesRes.data || []).map(u => ({ id: u.id, title: u.title, createdAt: u.created_at })));
      setQuestions((questionsRes.data || []).map(q => ({
        id: q.id, subject: q.subject, message: q.message, response: q.response ?? undefined, status: q.status,
      })));
      setActivities((activityRes.data || []).map(a => ({ id: a.id, eventLabel: a.event_label, createdAt: a.created_at })));
      setDocuments((docsRes.data || []).map(d => ({
        id: d.id, title: d.title, documentType: d.document_type, fileUrl: d.file_url ?? undefined,
        visibleToClient: d.visible_to_client, uploadedAt: d.uploaded_at,
      })));
    } catch (err) {
      console.error("ClientDetail load error:", err);
    } finally {
      setLoading(false);
    }
  }, [clientId, navigate]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleEditClient = async () => {
    if (!editForm || !clientId || !client) return;
    setSavingClient(true);
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
      setSavingClient(false);
      return;
    }

    if (packageTemplateId && packageTemplateId !== client.package_template_id) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assign-package`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ client_id: clientId, package_template_id: packageTemplateId })
        });
        toast({ title: "Package Assigned", description: "Template tasks have been successfully applied." });
      } catch (pkgErr) {
        console.error("Failed to assign package:", pkgErr);
        toast({ title: "Template Warning", description: "Updated client but applying the new template failed.", variant: "destructive" });
      }
    } else {
      toast({ title: "Saved", description: "Client details updated." });
    }

    setSavingClient(false);
    setShowEditDialog(false);
    loadAll();
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

  const openTaskDialog = (task?: Task) => {
    if (task) {
      setEditTask(task);
      setTaskForm({ title: task.title, taskType: task.taskType, status: task.status, phaseId: task.phaseId });
    } else {
      setEditTask(null);
      setTaskForm({ title: "", taskType: "review", status: "pending", phaseId: phases[0]?.id || "" });
    }
    setShowTaskDialog(true);
  };

  const saveTask = async () => {
    if (!taskForm.title || !taskForm.phaseId) return;
    setSavingTask(true);
    let error;
    
    // Auto-calculate sort_order for new tasks based on current max
    const phaseTasks = tasks.filter(t => t.phaseId === taskForm.phaseId);
    let sortOrder = phaseTasks.length > 0 ? phaseTasks.length + 1 : 1;

    if (editTask) {
      const { error: err } = await supabase.from("tasks").update({
        title: taskForm.title, task_type: taskForm.taskType,
        status: taskForm.status, phase_id: taskForm.phaseId
      }).eq("id", editTask.id);
      error = err;
    } else {
      const { error: err } = await supabase.from("tasks").insert({
        title: taskForm.title, task_type: taskForm.taskType,
        status: taskForm.status, phase_id: taskForm.phaseId,
        sort_order: sortOrder
      });
      error = err;
    }
    setSavingTask(false);
    if (!error) {
      setShowTaskDialog(false);
      loadAll();
    } else console.error(error);
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (!error) loadAll();
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
    setSavingDeliv(false);
    if (!error) {
      setShowDelivDialog(false);
      loadAll();
    } else console.error(error);
  };

  const deleteDeliv = async (id: string) => {
    if (!confirm("Delete this deliverable?")) return;
    const { error } = await supabase.from("deliverables").delete().eq("id", id);
    if (!error) loadAll();
  };

  // Document CRUD
  const openDocDialog = (d?: DocumentRow) => {
    if (d) {
      setEditDoc(d);
      setDocForm({ title: d.title, documentType: d.documentType, fileUrl: d.fileUrl || "", visibleToClient: d.visibleToClient });
    } else {
      setEditDoc(null);
      setDocForm({ title: "", documentType: "other", fileUrl: "", visibleToClient: true });
    }
    setShowDocDialog(true);
  };

  const saveDoc = async () => {
    if (!docForm.title || !clientId) return;
    setSavingDoc(true);
    let error;
    if (editDoc) {
      const { error: err } = await supabase.from("documents").update({
        title: docForm.title, document_type: docForm.documentType,
        file_url: docForm.fileUrl || null, visible_to_client: docForm.visibleToClient,
      }).eq("id", editDoc.id);
      error = err;
    } else {
      const { error: err } = await supabase.from("documents").insert({
        client_id: clientId, title: docForm.title, document_type: docForm.documentType,
        file_url: docForm.fileUrl || null, visible_to_client: docForm.visibleToClient,
      });
      error = err;
    }
    setSavingDoc(false);
    if (!error) {
      setShowDocDialog(false);
      toast({ title: editDoc ? "Document Updated" : "Document Added" });
      loadAll();
    } else {
      console.error(error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const deleteDoc = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (!error) { toast({ title: "Document Deleted" }); loadAll(); }
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
                {client.status.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {client.primaryContactName} · {client.primaryContactEmail}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={openEdit}>
          <MoreHorizontal className="h-4 w-4" /> Edit Client
        </Button>
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
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {phases.map((phase, i) => (
                <React.Fragment key={phase.id}>
                  <div className="flex flex-col items-center min-w-[90px] shrink-0">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium ${phaseStatusStyles[phase.status]}`}>
                      {phase.status === "completed" ? <CheckCircle className="h-3.5 w-3.5" /> :
                        phase.status === "locked" ? <Lock className="h-3 w-3" /> : i + 1}
                    </div>
                    <p className={`text-xs mt-1.5 text-center ${phase.status === "current" ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {phase.name}
                    </p>
                  </div>
                  {i < phases.length - 1 && (
                    <div className={`h-0.5 w-4 shrink-0 ${phases[i + 1].status === "locked" || phases[i + 1].status === "upcoming" ? "bg-muted" : "bg-primary"}`} />
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
                        <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
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

      {/* Shared Task Form Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="sm:max-w-md">
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
                    {(["pending", "in_progress", "completed", "failed"]).map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
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
              {tasks.length === 0 ? <p className="text-sm text-muted-foreground py-4">No tasks.</p> : (
                <div className="space-y-2">
                  {tasks.map(t => (
                    <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border group hover:border-primary/50 transition-colors">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center ${t.status === "completed" ? "bg-success/10" : "bg-muted"}`}>
                        {t.status === "completed" ? <CheckCircle className="h-3.5 w-3.5 text-success" /> : <Clock className="h-3 w-3 text-muted-foreground" />}
                      </div>
                      <div className="flex-1"><p className="text-sm font-medium">{t.title}</p><p className="text-xs text-muted-foreground">{t.phaseName}</p></div>
                      <Badge variant="outline" className="text-[10px] hidden md:inline-flex">{t.taskType}</Badge>
                      <Badge className={`text-[10px] hidden md:inline-flex ${t.status === "completed" ? 'bg-success/10 text-success hover:bg-success/20' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{t.status}</Badge>
                      <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openTaskDialog(t)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteTask(t.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
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
              {deliverables.length === 0 ? <p className="text-sm text-muted-foreground py-4">No deliverables.</p> : (
                <div className="space-y-2">
                  {deliverables.map(d => (
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
              {documents.length === 0 ? <p className="text-sm text-muted-foreground py-4">No documents.</p> : (
                <div className="space-y-2">
                  {documents.map(d => (
                    <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border group hover:border-primary/50 transition-colors">
                      {d.fileUrl ? <Link2 className="h-4 w-4 text-primary shrink-0" /> : <File className="h-4 w-4 text-muted-foreground shrink-0" />}
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
      <Dialog open={showDocDialog} onOpenChange={setShowDocDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editDoc ? "Edit Document" : "Add Document"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
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
            <div>
              <Label className="text-sm font-medium">File URL / Link</Label>
              <Input className="mt-1" value={docForm.fileUrl} onChange={e => setDocForm(f => ({ ...f, fileUrl: e.target.value }))} placeholder="https://..." />
              <p className="text-xs text-muted-foreground mt-1">Paste a Google Drive, Dropbox, or any external link</p>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="doc-visible" checked={docForm.visibleToClient} onCheckedChange={c => setDocForm(f => ({ ...f, visibleToClient: !!c }))} />
              <Label htmlFor="doc-visible" className="text-sm">Visible to client</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDocDialog(false)}>Cancel</Button>
            <Button onClick={saveDoc} disabled={savingDoc || !docForm.title}>{savingDoc ? "Saving..." : editDoc ? "Update" : "Add Document"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminClientDetail;
