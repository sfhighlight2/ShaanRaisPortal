import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Plus, MoreHorizontal, Edit, Trash2, Copy, ChevronDown, ChevronRight,
  GripVertical, ClipboardList, Upload, FileCheck, Eye, Calendar, CheckSquare, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { edgeFetch } from "@/lib/edgeFetch";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { TaskType, PackageTemplate } from "@/lib/types";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const taskTypeIcons: Record<string, React.ElementType> = {
  form: ClipboardList,
  upload: Upload,
  approval: FileCheck,
  review: Eye,
  scheduling: Calendar,
  checklist: CheckSquare,
};

const emptyForm = { name: "", description: "" };

// ── Sortable Task Item ──
function SortableTaskItem({ task, isAdmin, openTaskDialog, deleteTask, phaseId }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const Icon = taskTypeIcons[task.task_type] || taskTypeIcons[task.taskType] || ClipboardList;
  const isVisible = task.visible_to_client ?? task.visibleToClient ?? true;
  const subtasks = task.subtasks || [];
  return (
    <div ref={setNodeRef} style={style} className="flex flex-col gap-1 p-2 bg-muted/50 rounded group/item">
      <div className="flex items-center gap-2 text-sm">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="flex-1 truncate">{task.title}</span>
        <Badge variant="outline" className={`text-[9px] shrink-0 ${isVisible ? "bg-primary/5 border-primary/20 text-primary" : "text-muted-foreground"}`}>
          {isVisible ? "Client" : "Internal"}
        </Badge>
        {isAdmin && (
          <div className="flex items-center opacity-100 md:opacity-0 md:group-hover/item:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openTaskDialog(phaseId, task)}><Edit className="h-3 w-3" /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteTask(task.id)}><Trash2 className="h-3 w-3" /></Button>
          </div>
        )}
      </div>
      {subtasks.length > 0 && (
        <div className="ml-8 space-y-1 mt-1 border-t border-border/50 pt-1.5">
          {subtasks.sort((a: any, b: any) => a.sort_order - b.sort_order).map((st: any) => (
            <div key={st.id} className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckSquare className="h-3 w-3 shrink-0 text-muted-foreground/50" />
              <span className="truncate">{st.title}</span>
              {!(st.visible_to_client ?? true) && (
                <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded ml-auto">Internal</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ── Sortable Deliverable Item ──
function SortableDelivItem({ deliv, isAdmin, openDelivDialog, deleteDeliv, phaseId }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: deliv.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 text-sm p-2 bg-primary/5 rounded group/item">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      <FileCheck className="h-3.5 w-3.5 text-primary" />
      <span className="flex-1">{deliv.title}</span>
      <Badge variant="outline" className={`text-[9px] ${deliv.visibleToClient || deliv.visible_to_client ? "bg-primary/5 border-primary/20" : "bg-muted text-muted-foreground"}`}>
        {deliv.visibleToClient || deliv.visible_to_client ? "Client" : "Internal"}
      </Badge>
      {isAdmin && (
        <div className="flex items-center opacity-100 md:opacity-0 md:group-hover/item:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openDelivDialog(phaseId, deliv)}><Edit className="h-3 w-3" /></Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteDeliv(deliv.id)}><Trash2 className="h-3 w-3" /></Button>
        </div>
      )}
    </div>
  );
}

// ── Sortable Subtask Item ──
function SortableSubtaskItem({ st, index, toggleVisibility, removeSubtask }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: st.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 group">
      <div className="flex-1 flex items-center gap-2 p-2 rounded-md bg-muted/50 border border-transparent hover:border-border transition-colors">
        <button type="button" {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none p-0.5 shrink-0">
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <span className="flex-1 text-sm truncate">{st.title}</span>
        <button
          type="button"
          onPointerDown={e => e.stopPropagation()}
          onClick={() => toggleVisibility(index)}
          className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded border font-medium transition-colors ${
            st.visibleToClient
              ? "bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
              : "bg-muted border-transparent text-muted-foreground hover:bg-muted/80"
          }`}
          title={st.visibleToClient ? "Click to hide from client" : "Click to show to client"}
        >
          {st.visibleToClient ? "Client" : "Internal"}
        </button>
        <button
          type="button"
          onPointerDown={e => e.stopPropagation()}
          onClick={() => removeSubtask(index)}
          className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Sortable Phase Item ──
function SortablePhaseItem({
  phase, index, templateId, isExpanded, togglePhase, isAdmin,
  openPhaseDialog, deletePhase, sensors, handleDragEnd, handleDragEndDeliv,
  openTaskDialog, openDelivDialog, deleteTask, deleteDeliv,
}: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: phase.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg">
      <div className="w-full flex items-center gap-2 p-2 hover:bg-muted/50 transition-colors group">
        {/* Drag handle – separate from expand toggle */}
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none shrink-0 p-0.5">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        {/* Expand toggle */}
        <button onClick={() => togglePhase(phase.id)} className="flex items-center gap-2 flex-1 text-left min-w-0">
          {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          <span className="text-sm font-medium flex-1 truncate">{index + 1}. {phase.name}</span>
          {phase.estimatedTimeline && (
            <span className="text-xs text-muted-foreground shrink-0">{phase.estimatedTimeline}</span>
          )}
          <Badge variant="outline" className="text-[10px] shrink-0">{(phase.tasks || []).length} tasks</Badge>
        </button>
        {isAdmin && (
          <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openPhaseDialog(templateId, phase); }}><Edit className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); deletePhase(phase.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
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
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, phase.id)}>
                <SortableContext items={(phase.tasks || []).map((t: any) => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1">
                    {(phase.tasks || []).map((task: any) => (
                      <SortableTaskItem key={task.id} task={task} isAdmin={isAdmin} openTaskDialog={openTaskDialog} deleteTask={deleteTask} phaseId={phase.id} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
          {/* Deliverables */}
          <div>
            <div className="flex items-center justify-between mb-2 mt-3">
              <p className="text-xs text-muted-foreground">Deliverables</p>
              {isAdmin && <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => openDelivDialog(phase.id)}><Plus className="h-3 w-3 mr-1" /> Add</Button>}
            </div>
            {(phase.deliverables || []).length > 0 && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEndDeliv(e, phase.id)}>
                <SortableContext items={(phase.deliverables || []).map((d: any) => d.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1">
                    {(phase.deliverables || []).map((d: any) => (
                      <SortableDelivItem key={d.id} deliv={d} isAdmin={isAdmin} openDelivDialog={openDelivDialog} deleteDeliv={deleteDeliv} phaseId={phase.id} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
  
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);
  const [taskForm, setTaskForm] = useState({ title: "", taskType: "review", phaseId: "", notes: "", visibleToClient: true });
  // Subtask state for template task dialog
  const [subtasks, setSubtasks] = useState<{ id?: string; title: string; visibleToClient: boolean }[]>([]);
  const [subtaskInput, setSubtaskInput] = useState("");

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
            tasks:template_tasks(
              *,
              subtasks:template_task_subtasks(id, title, sort_order, visible_to_client)
            ),
            deliverables:template_deliverables(*)
          )
        `)
        .order("created_at", { ascending: false });
      
      if (err) throw err;
      
      // Sort all nested relationships by sort_order before setting state
      const sortedData = (data || []).map((template: any) => {
        if (template.phases) {
          template.phases.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
          template.phases.forEach((phase: any) => {
            if (phase.tasks) {
              phase.tasks.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
              phase.tasks.forEach((task: any) => {
                if (task.subtasks) {
                  task.subtasks.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
                }
              });
            }
            if (phase.deliverables) {
              phase.deliverables.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
            }
          });
        }
        return template;
      });

      setTemplates(sortedData as PackageTemplate[]);
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
        // Route through edge function (service role) to bypass RLS on package_templates
        await adminAction({
          action: "update_template",
          template_id: editTemplate.id,
          name: form.name,
          description: form.description,
        });
      } else {
        // Create new template (phases are stored in template_phases, not as a column)
        const { error: err } = await supabase
          .from("package_templates")
          .insert({ name: form.name, description: form.description });
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
      // 1) Create the new template
      const { data: newTpl, error: tplErr } = await supabase
        .from("package_templates")
        .insert({ name: `${template.name} (Copy)`, description: template.description })
        .select("id")
        .single();
      if (tplErr) throw tplErr;

      // 2) Deep-copy each phase + its tasks + deliverables
      for (const [phaseIndex, phase] of (template.phases || []).entries()) {
        const { data: newPhase, error: phaseErr } = await supabase
          .from("template_phases")
          .insert({
            template_id: newTpl.id,
            name: phase.name,
            description: (phase as any).description || null,
            estimated_timeline: (phase as any).estimated_timeline || (phase as any).estimatedTimeline || null,
            sort_order: phaseIndex + 1,
          })
          .select("id")
          .single();
        if (phaseErr) throw phaseErr;

        // Copy tasks
        const phaseTasks = (phase as any).tasks || [];
        for (const [taskIndex, task] of phaseTasks.entries()) {
          await supabase.from("template_tasks").insert({
            template_phase_id: newPhase.id,
            title: task.title,
            description: task.description || null,
            task_type: task.task_type || task.taskType || "checklist",
            required: task.required ?? true,
            sort_order: taskIndex + 1,
          });
        }

        // Copy deliverables
        const phaseDeliverables = (phase as any).deliverables || [];
        for (const [delivIndex, deliv] of phaseDeliverables.entries()) {
          await supabase.from("template_deliverables").insert({
            template_phase_id: newPhase.id,
            title: deliv.title,
            description: deliv.description || null,
            visible_to_client: deliv.visible_to_client ?? deliv.visibleToClient ?? true,
            sort_order: delivIndex + 1,
          });
        }
      }

      toast({ title: "Template Duplicated", description: `"${template.name} (Copy)" has been created.` });
      loadTemplates();
    } catch (err: any) {
      console.error("Failed to copy template:", err);
      toast({ title: "Error Duplicating", description: err.message || "Failed to duplicate template.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template? All its phases, tasks, and deliverables will be lost.")) return;
    try {
      // Route through edge function (service role) to bypass RLS on child tables
      await adminAction({ action: "delete_template", template_id: id });
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

  // ── Edge Function helper — delegates to shared utility ──
  const adminAction = (payload: Record<string, unknown>) => edgeFetch("create-user", payload);

  const deletePhase = async (id: string) => {
    if (!confirm("Delete phase? All associated tasks and deliverables will also be deleted.")) return;
    try {
      await adminAction({ action: "delete_phase", phase_id: id });
      toast({ title: "Deleted", description: "Phase deleted." });
      loadTemplates();
    } catch (error: any) {
      console.error(error);
      toast({ title: "Error Deleting Phase", description: error.message, variant: "destructive" });
    }
  };

  // Task CRUD
  const openTaskDialog = (phaseId: string, task?: any) => {
    if (task) {
      setEditTask(task);
      setTaskForm({ title: task.title, taskType: task.task_type || task.taskType, phaseId, notes: task.notes || "", visibleToClient: task.visible_to_client ?? task.visibleToClient ?? true });
      const rawSubs = task.subtasks || [];
      setSubtasks(rawSubs.map((s: any) => ({ id: s.id, title: s.title, visibleToClient: s.visible_to_client ?? s.visibleToClient ?? true })));
    } else {
      setEditTask(null);
      setTaskForm({ title: "", taskType: "review", phaseId, notes: "", visibleToClient: true });
      setSubtasks([]);
    }
    setSubtaskInput("");
    setShowTaskDialog(true);
  };

  const saveTask = async () => {
    if (!taskForm.title) return;
    let savedTaskId: string | null = null;

    if (editTask) {
      const { error } = await supabase
        .from("template_tasks")
        .update({ title: taskForm.title, task_type: taskForm.taskType, notes: taskForm.notes || null, visible_to_client: taskForm.visibleToClient })
        .eq("id", editTask.id);
      if (error) {
        console.error(error);
        toast({ title: "Error Saving Task", description: error.message, variant: "destructive" });
        return;
      }
      savedTaskId = editTask.id;
    } else {
      const { data: newTask, error } = await supabase
        .from("template_tasks")
        .insert({ template_phase_id: taskForm.phaseId, title: taskForm.title, task_type: taskForm.taskType, notes: taskForm.notes || null, sort_order: 1, visible_to_client: taskForm.visibleToClient })
        .select("id")
        .single();
      if (error) {
        console.error(error);
        toast({ title: "Error Saving Task", description: error.message, variant: "destructive" });
        return;
      }
      savedTaskId = newTask?.id || null;
    }

    // Sync subtasks — delete all then re-insert with current order and visibility
    if (savedTaskId) {
      await supabase.from("template_task_subtasks").delete().eq("template_task_id", savedTaskId);
      if (subtasks.length > 0) {
        await supabase.from("template_task_subtasks").insert(
          subtasks.map((st, i) => ({ template_task_id: savedTaskId, title: st.title, sort_order: i, visible_to_client: st.visibleToClient }))
        );
      }
    }

    toast({ title: "Saved", description: editTask ? "Task updated." : "Task added." });
    setShowTaskDialog(false);
    loadTemplates();
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Delete task?")) return;
    try {
      await adminAction({ action: "delete_task", task_id: id });
      toast({ title: "Deleted", description: "Task deleted." });
      loadTemplates();
    } catch (error: any) {
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
    try {
      await adminAction({ action: "delete_deliverable", deliverable_id: id });
      toast({ title: "Deleted", description: "Deliverable deleted." });
      loadTemplates();
    } catch (error: any) {
      console.error(error);
      toast({ title: "Error Deleting", description: error.message, variant: "destructive" });
    }
  };

  // ── Drag & Drop Reorder ──
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = async (event: DragEndEvent, phaseId: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Find phase in templates
    const tpl = templates.find(t => t.phases?.some((p: any) => p.id === phaseId));
    const phase = tpl?.phases?.find((p: any) => p.id === phaseId);
    if (!phase?.tasks) return;

    const oldIndex = phase.tasks.findIndex((t: any) => t.id === active.id);
    const newIndex = phase.tasks.findIndex((t: any) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(phase.tasks, oldIndex, newIndex);
    
    // Optimistic update
    setTemplates(prev => prev.map(t => t.id !== tpl!.id ? t : {
      ...t,
      phases: (t.phases || []).map((p: any) => p.id !== phaseId ? p : { ...p, tasks: reordered }),
    }));

    // Persist
    try {
      await Promise.all(
        reordered.map((t: any, i: number) => 
          supabase.from("template_tasks").update({ sort_order: i + 1 }).eq("id", t.id)
        )
      );
    } catch (err) {
      console.error("Reorder failed:", err);
      loadTemplates(); // revert on failure
    }
  };

  const handleDragEndPhase = async (event: DragEndEvent, templateId: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const tpl = templates.find(t => t.id === templateId);
    if (!tpl?.phases) return;

    const oldIndex = tpl.phases.findIndex((p: any) => p.id === active.id);
    const newIndex = tpl.phases.findIndex((p: any) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(tpl.phases, oldIndex, newIndex);

    // Optimistic update
    setTemplates(prev => prev.map(t => t.id !== templateId ? t : { ...t, phases: reordered }));

    // Persist
    try {
      await Promise.all(
        reordered.map((p: any, i: number) => 
          supabase.from("template_phases").update({ sort_order: i + 1 }).eq("id", p.id)
        )
      );
    } catch (err) {
      console.error("Phase reorder failed:", err);
      loadTemplates();
    }
  };

  const handleSubtaskDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSubtasks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDragEndDeliv = async (event: DragEndEvent, phaseId: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const tpl = templates.find(t => t.phases?.some((p: any) => p.id === phaseId));
    const phase = tpl?.phases?.find((p: any) => p.id === phaseId);
    if (!phase?.deliverables) return;

    const oldIndex = phase.deliverables.findIndex((d: any) => d.id === active.id);
    const newIndex = phase.deliverables.findIndex((d: any) => d.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(phase.deliverables, oldIndex, newIndex);

    // Optimistic update
    setTemplates(prev => prev.map(t => t.id !== tpl!.id ? t : {
      ...t,
      phases: (t.phases || []).map((p: any) => p.id !== phaseId ? p : { ...p, deliverables: reordered }),
    }));

    // Persist
    try {
      await Promise.all(
        reordered.map((d: any, i: number) => 
          supabase.from("template_deliverables").update({ sort_order: i + 1 }).eq("id", d.id)
        )
      );
    } catch (err) {
      console.error("Deliverable reorder failed:", err);
      loadTemplates();
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

      <Sheet open={showDialog} onOpenChange={setShowDialog}>
        <SheetContent className="sm:max-w-md md:max-w-lg overflow-y-auto w-full">
          <SheetHeader>
            <SheetTitle>{editTemplate ? "Edit Template" : "Create New Template"}</SheetTitle>
          </SheetHeader>
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
            <SheetFooter className="mt-6 flex gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={submitting}>
                {submitting ? "Saving..." : (editTemplate ? "Save Changes" : "Create Template")}
              </Button>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>

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

                  {/* Phases – sortable by drag */}
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEndPhase(e, template.id)}>
                    <SortableContext items={(template.phases || []).map((p: any) => p.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {(template.phases || []).map((phase: any, i: number) => (
                          <SortablePhaseItem
                            key={phase.id}
                            phase={phase}
                            index={i}
                            templateId={template.id}
                            isExpanded={expandedPhases.has(phase.id)}
                            togglePhase={togglePhase}
                            isAdmin={isAdmin}
                            openPhaseDialog={openPhaseDialog}
                            deletePhase={deletePhase}
                            sensors={sensors}
                            handleDragEnd={handleDragEnd}
                            handleDragEndDeliv={handleDragEndDeliv}
                            openTaskDialog={openTaskDialog}
                            openDelivDialog={openDelivDialog}
                            deleteTask={deleteTask}
                            deleteDeliv={deleteDeliv}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Phase Dialog */}
      <Sheet open={showPhaseDialog} onOpenChange={setShowPhaseDialog}>
        <SheetContent className="sm:max-w-md md:max-w-lg overflow-y-auto w-full">
          <SheetHeader><SheetTitle>{editPhase ? "Edit Phase" : "Add Phase"}</SheetTitle></SheetHeader>
          <div className="space-y-4 py-2 mt-4">
            <div className="space-y-1.5"><label className="text-sm font-medium">Phase Name</label><Input value={phaseForm.name} onChange={e => setPhaseForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Discovery" /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Estimated Timeline (Optional)</label><Input value={phaseForm.estimatedTimeline} onChange={e => setPhaseForm(f => ({ ...f, estimatedTimeline: e.target.value }))} placeholder="e.g. Weeks 1-2" /></div>
          </div>
          <SheetFooter className="mt-6 flex gap-2">
            <Button variant="outline" onClick={() => setShowPhaseDialog(false)}>Cancel</Button>
            <Button onClick={savePhase}>Save Phase</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Task Dialog */}
      <Sheet open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <SheetContent className="sm:max-w-md md:max-w-lg overflow-y-auto w-full">
          <SheetHeader><SheetTitle>{editTask ? "Edit Task" : "Add Task"}</SheetTitle></SheetHeader>
          <div className="space-y-4 py-2 mt-4">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Task Title</label>
              <Input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Gather Requirements" />
            </div>

            {/* Task Type */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Task Type</label>
              <Select value={taskForm.taskType} onValueChange={v => setTaskForm(f => ({ ...f, taskType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["review", "upload", "approval", "form", "general"]).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Notes for Client</label>
                <span className="text-[11px] text-muted-foreground bg-primary/5 border border-primary/20 rounded px-1.5 py-0.5">Visible to client</span>
              </div>
              <textarea
                value={taskForm.notes}
                onChange={e => setTaskForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes or instructions the client will see on this task…"
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 resize-none"
              />
            </div>

            {/* Client Visibility Toggle */}
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/40">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Visible to Client</label>
                <p className="text-xs text-muted-foreground">Should the client see this task on their dashboard?</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={taskForm.visibleToClient}
                  onChange={e => setTaskForm(f => ({ ...f, visibleToClient: e.target.checked }))}
                />
                <div className="w-9 h-5 bg-muted-foreground/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
              </label>
            </div>

            {/* Subtasks */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Subtasks</label>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
                <DndContext collisionDetection={closestCenter} onDragEnd={handleSubtaskDragEnd}>
                  <SortableContext items={subtasks.map(s => s.id as string)} strategy={verticalListSortingStrategy}>
                    {subtasks.map((st, i) => (
                      <SortableSubtaskItem
                        key={st.id}
                        st={st}
                        index={i}
                        toggleVisibility={(idx: number) => setSubtasks(prev => prev.map((s, idx2) => idx2 === idx ? { ...s, visibleToClient: !s.visibleToClient } : s))}
                        removeSubtask={(idx: number) => setSubtasks(prev => prev.filter((_, idx2) => idx2 !== idx))}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
              <div className="flex gap-2">
                <Input
                  value={subtaskInput}
                  onChange={e => setSubtaskInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const val = subtaskInput.trim();
                      if (val) { setSubtasks(prev => [...prev, { id: crypto.randomUUID(), title: val, visibleToClient: true }]); setSubtaskInput(""); }
                    }
                  }}
                  placeholder="Add subtask and press Enter…"
                  className="text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    const val = subtaskInput.trim();
                    if (val) { setSubtasks(prev => [...prev, { id: crypto.randomUUID(), title: val, visibleToClient: true }]); setSubtaskInput(""); }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Each subtask inherits the parent task's client visibility by default. Click the badge to override per subtask.</p>
            </div>
          </div>
          <SheetFooter className="mt-6 flex gap-2">
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>Cancel</Button>
            <Button onClick={saveTask}>Save Task</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Deliverable Dialog */}
      <Sheet open={showDelivDialog} onOpenChange={setShowDelivDialog}>
        <SheetContent className="sm:max-w-md md:max-w-lg overflow-y-auto w-full">
          <SheetHeader><SheetTitle>{editDeliv ? "Edit Deliverable" : "Add Deliverable"}</SheetTitle></SheetHeader>
          <div className="space-y-4 py-2 mt-4">
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
          <SheetFooter className="mt-6 flex gap-2">
            <Button variant="outline" onClick={() => setShowDelivDialog(false)}>Cancel</Button>
            <Button onClick={saveDeliv}>Save Deliverable</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

    </div>
  );
};

export default AdminTemplates;
