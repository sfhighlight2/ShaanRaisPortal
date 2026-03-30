import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Plus, MoreHorizontal, Edit, Trash2, Copy, ChevronDown, ChevronRight,
  GripVertical, ClipboardList, Upload, FileCheck, Eye, Calendar, CheckSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { TaskType, PackageTemplate } from "@/lib/types";

const taskTypeIcons: Record<string, React.ElementType> = {
  form: ClipboardList,
  upload: Upload,
  approval: FileCheck,
  review: Eye,
  scheduling: Calendar,
  checklist: CheckSquare,
};

const emptyForm = { name: "", description: "" };

const AdminTemplates: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";
  const [templates, setTemplates] = useState<PackageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  
  // Dialog states
  const [showDialog, setShowDialog] = useState(false);
  const [editTemplate, setEditTemplate] = useState<PackageTemplate | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Phase State
  const [showPhaseDialog, setShowPhaseDialog] = useState(false);
  const [editPhase, setEditPhase] = useState<any>(null);
  const [phaseForm, setPhaseForm] = useState({ name: "", estimatedTimeline: "", templateId: "" });
  
  // Task State
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);
  const [taskForm, setTaskForm] = useState({ title: "", taskType: "review", phaseId: "" });

  // Deliverable State
  const [showDelivDialog, setShowDelivDialog] = useState(false);
  const [editDeliv, setEditDeliv] = useState<any>(null);
  const [delivForm, setDelivForm] = useState({ title: "", visibleToClient: false, phaseId: "" });

  const loadTemplates = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from("package_templates")
        .select(`
          *,
          phases:template_phases(
            *,
            tasks:template_tasks(*),
            deliverables:template_deliverables(*)
          )
        `)
        .order("created_at", { ascending: false });
      
      if (err) throw err;
      setTemplates((data || []) as PackageTemplate[]);
    } catch (err) {
      console.error("Error loading templates:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const togglePhase = (phaseId: string) => {
    const newSet = new Set(expandedPhases);
    if (newSet.has(phaseId)) newSet.delete(phaseId);
    else newSet.add(phaseId);
    setExpandedPhases(newSet);
  };

  const openAdd = () => {
    setEditTemplate(null);
    setForm(emptyForm);
    setError("");
    setShowDialog(true);
  };

  const openEdit = (template: PackageTemplate) => {
    setEditTemplate(template);
    setForm({ name: template.name, description: template.description || "" });
    setError("");
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      setError("Template name is required.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      if (editTemplate) {
        // Update
        const { error: err } = await supabase
          .from("package_templates")
          .update({ name: form.name, description: form.description })
          .eq("id", editTemplate.id);
        if (err) throw err;
      } else {
        // Create (with empty phases)
        const { error: err } = await supabase
          .from("package_templates")
          .insert({ name: form.name, description: form.description, phases: [] });
        if (err) throw err;
      }
      setShowDialog(false);
      loadTemplates();
    } catch (err: any) {
      setError(err.message || "Failed to save template.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async (template: PackageTemplate) => {
    try {
      const { error: err } = await supabase
        .from("package_templates")
        .insert({
          name: `${template.name} (Copy)`,
          description: template.description,
          phases: template.phases || [],
        });
      if (err) throw err;
      loadTemplates();
    } catch (err) {
      console.error("Failed to copy template:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template? All its phases, tasks, and deliverables will be lost.")) return;
    try {
      // Manual cascade delete
      const { data: phases } = await supabase.from("template_phases").select("id").eq("template_id", id);
      if (phases && phases.length > 0) {
        const phaseIds = phases.map(p => p.id);
        await supabase.from("template_tasks").delete().in("template_phase_id", phaseIds);
        await supabase.from("template_deliverables").delete().in("template_phase_id", phaseIds);
        await supabase.from("template_phases").delete().eq("template_id", id);
      }
      
      const { error: err } = await supabase
        .from("package_templates")
        .delete()
        .eq("id", id);
      if (err) throw err;
      toast({ title: "Template Deleted" });
      loadTemplates();
    } catch (err: any) {
      console.error("Failed to delete template:", err);
      toast({ title: "Error Deleting Template", description: err.message, variant: "destructive" });
    }
  };

// Phase CRUD
  const openPhaseDialog = (templateId: string, phase?: any) => {
    if (phase) {
      setEditPhase(phase);
      setPhaseForm({ name: phase.name, estimatedTimeline: phase.estimatedTimeline || "", templateId });
    } else {
      setEditPhase(null);
      setPhaseForm({ name: "", estimatedTimeline: "", templateId });
    }
    setShowPhaseDialog(true);
  };

  const savePhase = async () => {
    if (!phaseForm.name) return;
    const isUpdate = !!editPhase;
    const { error } = isUpdate 
      ? await supabase.from("template_phases").update({ name: phaseForm.name, estimated_timeline: phaseForm.estimatedTimeline }).eq("id", editPhase.id)
      : await supabase.from("template_phases").insert({
          template_id: phaseForm.templateId, name: phaseForm.name, estimated_timeline: phaseForm.estimatedTimeline,
          sort_order: (templates.find(t => t.id === phaseForm.templateId)?.phases?.length || 0) + 1
        });
    if (!error) { 
      toast({ title: "Saved", description: isUpdate ? "Phase updated." : "Phase added." });
      setShowPhaseDialog(false); 
      loadTemplates(); 
    } else {
      console.error(error);
      toast({ title: "Error Saving Phase", description: error.message, variant: "destructive" });
    }
  };

  const deletePhase = async (id: string) => {
    if (!confirm("Delete phase? All associated tasks and deliverables will also be deleted.")) return;
    try {
      // Manual cascade delete
      await supabase.from("template_tasks").delete().eq("template_phase_id", id);
      await supabase.from("template_deliverables").delete().eq("template_phase_id", id);
      
      const { error } = await supabase.from("template_phases").delete().eq("id", id);
      if (!error) {
        toast({ title: "Deleted", description: "Phase deleted." });
        loadTemplates();
      } else {
        throw error;
      }
    } catch (error: any) {
      console.error(error);
      toast({ title: "Error Deleting", description: error.message, variant: "destructive" });
    }
  };

  // Task CRUD
  const openTaskDialog = (phaseId: string, task?: any) => {
    if (task) {
      setEditTask(task);
      setTaskForm({ title: task.title, taskType: task.taskType, phaseId });
    } else {
      setEditTask(null);
      setTaskForm({ title: "", taskType: "review", phaseId });
    }
    setShowTaskDialog(true);
  };

  const saveTask = async () => {
    if (!taskForm.title) return;
    const { error } = editTask
      ? await supabase.from("template_tasks").update({ title: taskForm.title, task_type: taskForm.taskType }).eq("id", editTask.id)
      : await supabase.from("template_tasks").insert({ template_phase_id: taskForm.phaseId, title: taskForm.title, task_type: taskForm.taskType, sort_order: 1 });
    if (!error) { 
      toast({ title: "Saved", description: editTask ? "Task updated." : "Task added." });
      setShowTaskDialog(false); 
      loadTemplates(); 
    } else {
      console.error(error);
      toast({ title: "Error Saving Task", description: error.message, variant: "destructive" });
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Delete task?")) return;
    const { error } = await supabase.from("template_tasks").delete().eq("id", id);
    if (!error) {
      toast({ title: "Deleted", description: "Task deleted." });
      loadTemplates();
    } else {
      console.error(error);
      toast({ title: "Error Deleting", description: error.message, variant: "destructive" });
    }
  };

  // Deliverable CRUD
  const openDelivDialog = (phaseId: string, deliv?: any) => {
    if (deliv) {
      setEditDeliv(deliv);
      setDelivForm({ title: deliv.title, visibleToClient: deliv.visibleToClient, phaseId });
    } else {
      setEditDeliv(null);
      setDelivForm({ title: "", visibleToClient: false, phaseId });
    }
    setShowDelivDialog(true);
  };

  const saveDeliv = async () => {
    if (!delivForm.title) return;
    const { error } = editDeliv
      ? await supabase.from("template_deliverables").update({ title: delivForm.title, visible_to_client: delivForm.visibleToClient }).eq("id", editDeliv.id)
      : await supabase.from("template_deliverables").insert({ template_phase_id: delivForm.phaseId, title: delivForm.title, visible_to_client: delivForm.visibleToClient });
    if (!error) { 
      toast({ title: "Saved", description: editDeliv ? "Deliverable updated." : "Deliverable added." });
      setShowDelivDialog(false); 
      loadTemplates(); 
    } else {
      console.error(error);
      toast({ title: "Error Saving Deliverable", description: error.message, variant: "destructive" });
    }
  };

  const deleteDeliv = async (id: string) => {
    if (!confirm("Delete deliverable?")) return;
    const { error } = await supabase.from("template_deliverables").delete().eq("id", id);
    if (!error) {
      toast({ title: "Deleted", description: "Deliverable deleted." });
      loadTemplates();
    } else {
      console.error(error);
      toast({ title: "Error Deleting", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-semibold text-foreground">Package Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">Create and manage reusable package templates.</p>
        </div>
        {isAdmin && (
          <Button className="gap-2" onClick={openAdd}>
            <Plus className="h-4 w-4" /> New Template
          </Button>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTemplate ? "Edit Template" : "Create New Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Template Name *</label>
              <Input
                placeholder="e.g., Growth Consulting Package"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <Textarea
                placeholder="Describe what this package includes..."
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={submitting}>
                {submitting ? "Saving..." : (editTemplate ? "Save Changes" : "Create Template")}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Templates List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
            No templates found. Create one to get started.
          </div>
        ) : (
          templates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg font-medium">{template.name}</CardTitle>
                        <Badge variant="outline" className={template.active ? "text-success border-success/30" : ""}>
                          {template.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      {template.description && (
                        <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopy(template)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(template)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(template.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      {(template.phases || []).length} Phases · {(template.phases || []).reduce((acc: number, p: any) => acc + (p.tasks?.length || 0), 0)} Tasks · {(template.phases || []).reduce((acc: number, p: any) => acc + (p.deliverables?.length || 0), 0)} Deliverables
                    </p>
                    {isAdmin && (
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openPhaseDialog(template.id)}>
                        <Plus className="h-3 w-3 mr-1" /> Add Phase
                      </Button>
                    )}
                  </div>

                  {/* Phases */}
                  <div className="space-y-2">
                    {(template.phases || []).map((phase: any, i: number) => {
                      const isExpanded = expandedPhases.has(phase.id);
                      return (
                        <div key={phase.id} className="border rounded-lg">
                          <div className="w-full flex items-center gap-2 p-2 hover:bg-muted/50 transition-colors group">
                            <button
                              onClick={() => togglePhase(phase.id)}
                              className="flex items-center gap-3 flex-1 text-left"
                            >
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              <span className="text-sm font-medium flex-1">{i + 1}. {phase.name}</span>
                              {phase.estimatedTimeline && (
                                <span className="text-xs text-muted-foreground">{phase.estimatedTimeline}</span>
                              )}
                              <Badge variant="outline" className="text-[10px]">
                                {(phase.tasks || []).length} tasks
                              </Badge>
                            </button>
                            {isAdmin && (
                              <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openPhaseDialog(template.id, phase)}><Edit className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deletePhase(phase.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                              </div>
                            )}
                          </div>

                          {isExpanded && (
                            <div className="px-3 pb-3 space-y-3">
                              {/* Tasks */}
                              <div>
                                <div className="flex items-center justify-between mb-2 mt-1">
                                  <p className="text-xs text-muted-foreground">Tasks</p>
                                  {isAdmin && <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => openTaskDialog(phase.id)}><Plus className="h-3 w-3 mr-1" /> Add</Button>}
                                </div>
                                {(phase.tasks || []).length > 0 && (
                                  <div className="space-y-1">
                                    {(phase.tasks || []).map((task: any) => {
                                      const Icon = taskTypeIcons[task.taskType] || ClipboardList;
                                      return (
                                        <div key={task.id} className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded group/item">
                                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                                          <span className="flex-1">{task.title}</span>
                                          <Badge variant="outline" className="text-[9px]">{task.taskType}</Badge>
                                          {isAdmin && (
                                            <div className="flex items-center opacity-100 md:opacity-0 md:group-hover/item:opacity-100 transition-opacity">
                                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openTaskDialog(phase.id, task)}><Edit className="h-3 w-3" /></Button>
                                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteTask(task.id)}><Trash2 className="h-3 w-3" /></Button>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Deliverables */}
                              <div>
                                <div className="flex items-center justify-between mb-2 mt-3">
                                  <p className="text-xs text-muted-foreground">Deliverables</p>
                                  {isAdmin && <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => openDelivDialog(phase.id)}><Plus className="h-3 w-3 mr-1" /> Add</Button>}
                                </div>
                                {(phase.deliverables || []).length > 0 && (
                                  <div className="space-y-1">
                                    {(phase.deliverables || []).map((d: any) => (
                                      <div key={d.id} className="flex items-center gap-2 text-sm p-2 bg-primary/5 rounded group/item">
                                        <FileCheck className="h-3.5 w-3.5 text-primary" />
                                        <span className="flex-1">{d.title}</span>
                                        <Badge variant="outline" className={`text-[9px] ${d.visibleToClient ? "bg-primary/5 border-primary/20" : "bg-muted text-muted-foreground"}`}>{d.visibleToClient ? "Client" : "Internal"}</Badge>
                                        {isAdmin && (
                                          <div className="flex items-center opacity-100 md:opacity-0 md:group-hover/item:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openDelivDialog(phase.id, d)}><Edit className="h-3 w-3" /></Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteDeliv(d.id)}><Trash2 className="h-3 w-3" /></Button>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Phase Dialog */}
      <Dialog open={showPhaseDialog} onOpenChange={setShowPhaseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editPhase ? "Edit Phase" : "Add Phase"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><label className="text-sm font-medium">Phase Name</label><Input value={phaseForm.name} onChange={e => setPhaseForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Discovery" /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Estimated Timeline (Optional)</label><Input value={phaseForm.estimatedTimeline} onChange={e => setPhaseForm(f => ({ ...f, estimatedTimeline: e.target.value }))} placeholder="e.g. Weeks 1-2" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPhaseDialog(false)}>Cancel</Button>
            <Button onClick={savePhase}>Save Phase</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editTask ? "Edit Task" : "Add Task"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><label className="text-sm font-medium">Task Title</label><Input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Gather Requirements" /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Task Type</label>
              <Select value={taskForm.taskType} onValueChange={v => setTaskForm(f => ({ ...f, taskType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["review", "upload", "approval", "form", "general"]).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>Cancel</Button>
            <Button onClick={saveTask}>Save Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deliverable Dialog */}
      <Dialog open={showDelivDialog} onOpenChange={setShowDelivDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editDeliv ? "Edit Deliverable" : "Add Deliverable"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><label className="text-sm font-medium">Title</label><Input value={delivForm.title} onChange={e => setDelivForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Audit Report" /></div>
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
            <Button onClick={saveDeliv}>Save Deliverable</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default AdminTemplates;
