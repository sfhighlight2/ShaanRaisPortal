import React, { useState } from "react";
import { motion } from "framer-motion";
import {
    Plus, Pencil, Trash2, ChevronDown, ChevronRight, GripVertical,
    ArrowUp, ArrowDown, ExternalLink, GraduationCap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Sheet, SheetContent, SheetDescription, SheetHeader,
    SheetTitle, SheetFooter, SheetClose,
} from "@/components/ui/sheet";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { OnboardingPhase, OnboardingTask } from "@/lib/types";

const AdminOnboardingManagement: React.FC = () => {
    // Local state
    const [phases, setPhases] = useState<OnboardingPhase[]>([]);
    const [tasks, setTasks] = useState<OnboardingTask[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = React.useCallback(async () => {
        try {
            if (!isSupabaseConfigured) return;
            const [phasesRes, tasksRes] = await Promise.all([
                supabase.from("onboarding_phases").select("*").order("display_order"),
                supabase.from("onboarding_tasks").select("*").order("display_order"),
            ]);
            if (phasesRes.error) throw phasesRes.error;
            if (tasksRes.error) throw tasksRes.error;
            
            setPhases((phasesRes.data || []).map(p => ({
                id: p.id, name: p.name, description: p.description, displayOrder: p.display_order, createdAt: p.created_at
            })));
            setTasks((tasksRes.data || []).map(t => ({
                id: t.id, phaseId: t.phase_id, title: t.title, description: t.description, displayOrder: t.display_order, required: t.required, resourceLink: t.resource_link
            })));
        } catch (err) {
            console.error("Error loading onboarding management data:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    // UI state
    const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
    const [phaseDialogOpen, setPhaseDialogOpen] = useState(false);
    const [taskDialogOpen, setTaskDialogOpen] = useState(false);
    const [editingPhase, setEditingPhase] = useState<OnboardingPhase | null>(null);
    const [editingTask, setEditingTask] = useState<OnboardingTask | null>(null);
    const [targetPhaseId, setTargetPhaseId] = useState<string>("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ type: "phase" | "task"; id: string } | null>(null);

    // Form state
    const [phaseName, setPhaseName] = useState("");
    const [phaseDescription, setPhaseDescription] = useState("");
    const [taskTitle, setTaskTitle] = useState("");
    const [taskDescription, setTaskDescription] = useState("");
    const [taskRequired, setTaskRequired] = useState(true);
    const [taskResourceLink, setTaskResourceLink] = useState("");

    // Toggle expansion
    const togglePhase = (phaseId: string) => {
        setExpandedPhases((prev) => {
            const next = new Set(prev);
            if (next.has(phaseId)) next.delete(phaseId);
            else next.add(phaseId);
            return next;
        });
    };

    // === Phase CRUD ===
    const openPhaseDialog = (phase?: OnboardingPhase) => {
        if (phase) {
            setEditingPhase(phase);
            setPhaseName(phase.name);
            setPhaseDescription(phase.description || "");
        } else {
            setEditingPhase(null);
            setPhaseName("");
            setPhaseDescription("");
        }
        setPhaseDialogOpen(true);
    };

    const savePhase = async () => {
        if (!phaseName.trim()) return;
        try {
            if (editingPhase) {
                const { error } = await supabase.from("onboarding_phases").update({
                    name: phaseName.trim(), description: phaseDescription.trim() || null
                }).eq("id", editingPhase.id);
                if (error) throw error;
            } else {
                const maxOrder = phases.reduce((max, p) => Math.max(max, p.displayOrder), 0);
                const { error } = await supabase.from("onboarding_phases").insert({
                    name: phaseName.trim(), description: phaseDescription.trim() || null, display_order: maxOrder + 1
                });
                if (error) throw error;
            }
            loadData();
            setPhaseDialogOpen(false);
        } catch (err) {
            console.error("Error saving phase:", err);
        }
    };

    const movePhase = async (phaseId: string, direction: "up" | "down") => {
        const sorted = [...phases].sort((a, b) => a.displayOrder - b.displayOrder);
        const idx = sorted.findIndex((p) => p.id === phaseId);
        if ((direction === "up" && idx === 0) || (direction === "down" && idx === sorted.length - 1)) return;
        
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        const currentPhase = sorted[idx];
        const targetPhase = sorted[swapIdx];
        
        try {
            await Promise.all([
                supabase.from("onboarding_phases").update({ display_order: targetPhase.displayOrder }).eq("id", currentPhase.id),
                supabase.from("onboarding_phases").update({ display_order: currentPhase.displayOrder }).eq("id", targetPhase.id),
            ]);
            loadData();
        } catch (err) {
            console.error("Error moving phase:", err);
        }
    };

    // === Task CRUD ===
    const openTaskDialog = (phaseId: string, task?: OnboardingTask) => {
        setTargetPhaseId(phaseId);
        if (task) {
            setEditingTask(task);
            setTaskTitle(task.title);
            setTaskDescription(task.description || "");
            setTaskRequired(task.required);
            setTaskResourceLink(task.resourceLink || "");
        } else {
            setEditingTask(null);
            setTaskTitle("");
            setTaskDescription("");
            setTaskRequired(true);
            setTaskResourceLink("");
        }
        setTaskDialogOpen(true);
    };

    const saveTask = async () => {
        if (!taskTitle.trim()) return;
        try {
            if (editingTask) {
                const { error } = await supabase.from("onboarding_tasks").update({
                    title: taskTitle.trim(),
                    description: taskDescription.trim() || null,
                    required: taskRequired,
                    resource_link: taskResourceLink.trim() || null,
                }).eq("id", editingTask.id);
                if (error) throw error;
            } else {
                const phaseTasks = tasks.filter((t) => t.phaseId === targetPhaseId);
                const maxOrder = phaseTasks.reduce((max, t) => Math.max(max, t.displayOrder), 0);
                const { error } = await supabase.from("onboarding_tasks").insert({
                    phase_id: targetPhaseId,
                    title: taskTitle.trim(),
                    description: taskDescription.trim() || null,
                    display_order: maxOrder + 1,
                    required: taskRequired,
                    resource_link: taskResourceLink.trim() || null,
                });
                if (error) throw error;
            }
            loadData();
            setTaskDialogOpen(false);
        } catch (err) {
            console.error("Error saving task:", err);
        }
    };

    const moveTask = async (taskId: string, phaseId: string, direction: "up" | "down") => {
        const phaseTasks = tasks.filter((t) => t.phaseId === phaseId).sort((a, b) => a.displayOrder - b.displayOrder);
        const idx = phaseTasks.findIndex((t) => t.id === taskId);
        if ((direction === "up" && idx === 0) || (direction === "down" && idx === phaseTasks.length - 1)) return;
        
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        const currentTask = phaseTasks[idx];
        const targetTask = phaseTasks[swapIdx];

        try {
            await Promise.all([
                supabase.from("onboarding_tasks").update({ display_order: targetTask.displayOrder }).eq("id", currentTask.id),
                supabase.from("onboarding_tasks").update({ display_order: currentTask.displayOrder }).eq("id", targetTask.id),
            ]);
            loadData();
        } catch (err) {
            console.error("Error moving task:", err);
        }
    };

    // === Delete ===
    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            if (deleteTarget.type === "phase") {
                const { error } = await supabase.from("onboarding_phases").delete().eq("id", deleteTarget.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("onboarding_tasks").delete().eq("id", deleteTarget.id);
                if (error) throw error;
            }
            loadData();
        } catch (err) {
            console.error("Error deleting:", err);
        } finally {
            setDeleteDialogOpen(false);
            setDeleteTarget(null);
        }
    };

    const requestDelete = (type: "phase" | "task", id: string) => {
        setDeleteTarget({ type, id });
        setDeleteDialogOpen(true);
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-heading font-semibold text-foreground">Onboarding Management</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Create and manage onboarding phases and tasks for new managers.
                    </p>
                </div>
                <Button onClick={() => openPhaseDialog()} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Phase
                </Button>
            </div>

            {/* Stats */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                    {phases.length} Phases
                                </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {tasks.length} Total Tasks
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {tasks.filter((t) => t.required).length} Required
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Phases list */}
            <div className="space-y-3">
                {phases
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((phase, idx) => {
                        const phaseTasks = tasks
                            .filter((t) => t.phaseId === phase.id)
                            .sort((a, b) => a.displayOrder - b.displayOrder);
                        const isExpanded = expandedPhases.has(phase.id);

                        return (
                            <motion.div
                                key={phase.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.04 }}
                            >
                                <Card>
                                    <CardHeader className="py-3 px-5">
                                        <div className="flex items-center justify-between">
                                            <button onClick={() => togglePhase(phase.id)} className="flex items-center gap-3 text-left flex-1">
                                                {isExpanded ? (
                                                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                                )}
                                                <div>
                                                    <CardTitle className="text-sm font-medium">
                                                        Phase {phase.displayOrder}: {phase.name}
                                                    </CardTitle>
                                                    {phase.description && (
                                                        <p className="text-xs text-muted-foreground mt-0.5">{phase.description}</p>
                                                    )}
                                                </div>
                                            </button>
                                            <div className="flex items-center gap-1">
                                                <Badge variant="outline" className="text-[10px] mr-2">
                                                    {phaseTasks.length} tasks
                                                </Badge>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => movePhase(phase.id, "up")} disabled={idx === 0}>
                                                    <ArrowUp className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => movePhase(phase.id, "down")} disabled={idx === phases.length - 1}>
                                                    <ArrowDown className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openPhaseDialog(phase)}>
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => requestDelete("phase", phase.id)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>

                                    {isExpanded && (
                                        <CardContent className="pt-0 pb-4 px-5">
                                            <div className="space-y-1 ml-7">
                                                {phaseTasks.map((task, tIdx) => (
                                                    <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 group">
                                                        <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{tIdx + 1}.</span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm text-foreground">{task.title}</p>
                                                            {task.description && (
                                                                <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            {!task.required && <Badge variant="outline" className="text-[9px]">Optional</Badge>}
                                                            {task.resourceLink && <ExternalLink className="h-3 w-3 text-muted-foreground" />}
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => moveTask(task.id, phase.id, "up")} disabled={tIdx === 0}>
                                                                <ArrowUp className="h-3 w-3" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => moveTask(task.id, phase.id, "down")} disabled={tIdx === phaseTasks.length - 1}>
                                                                <ArrowDown className="h-3 w-3" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openTaskDialog(phase.id, task)}>
                                                                <Pencil className="h-3 w-3" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive" onClick={() => requestDelete("task", task.id)}>
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                                <Button variant="ghost" size="sm" className="mt-2 text-xs gap-1 text-muted-foreground" onClick={() => openTaskDialog(phase.id)}>
                                                    <Plus className="h-3 w-3" /> Add Task
                                                </Button>
                                            </div>
                                        </CardContent>
                                    )}
                                </Card>
                            </motion.div>
                        );
                    })}

                {phases.length === 0 && (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <GraduationCap className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">No onboarding phases yet. Create your first phase to get started.</p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Phase Dialog */}
            <Sheet open={phaseDialogOpen} onOpenChange={setPhaseDialogOpen}>
                <SheetContent className="sm:max-w-md md:max-w-lg overflow-y-auto w-full">
                    <SheetHeader>
                        <SheetTitle>{editingPhase ? "Edit Phase" : "Add Phase"}</SheetTitle>
                        <SheetDescription>
                            {editingPhase ? "Update the phase details." : "Create a new onboarding phase."}
                        </SheetDescription>
                    </SheetHeader>
                    <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="phase-name">Phase Name</Label>
                            <Input id="phase-name" value={phaseName} onChange={(e) => setPhaseName(e.target.value)} placeholder="e.g. Welcome & Account Setup" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phase-desc">Description</Label>
                            <Textarea id="phase-desc" value={phaseDescription} onChange={(e) => setPhaseDescription(e.target.value)} placeholder="Brief description of this phase" rows={3} />
                        </div>
                    </div>
                    <SheetFooter className="mt-6 flex gap-2">
                        <Button variant="outline" onClick={() => setPhaseDialogOpen(false)}>Cancel</Button>
                        <Button onClick={savePhase} disabled={!phaseName.trim()}>
                            {editingPhase ? "Save Changes" : "Create Phase"}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* Task Dialog */}
            <Sheet open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                <SheetContent className="sm:max-w-md md:max-w-lg overflow-y-auto w-full">
                    <SheetHeader>
                        <SheetTitle>{editingTask ? "Edit Task" : "Add Task"}</SheetTitle>
                        <SheetDescription>
                            {editingTask ? "Update the task details." : "Add a new task to this phase."}
                        </SheetDescription>
                    </SheetHeader>
                    <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="task-title">Task Title</Label>
                            <Input id="task-title" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="e.g. Watch CRM walkthrough" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="task-desc">Description</Label>
                            <Textarea id="task-desc" value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} placeholder="Describe what the manager should do" rows={3} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="task-link">Resource Link (optional)</Label>
                            <Input id="task-link" value={taskResourceLink} onChange={(e) => setTaskResourceLink(e.target.value)} placeholder="https://..." />
                        </div>
                        <div className="flex items-center justify-between mt-2 p-2 border rounded-md">
                            <Label htmlFor="task-required" className="text-sm">Required</Label>
                            <Switch id="task-required" checked={taskRequired} onCheckedChange={setTaskRequired} />
                        </div>
                    </div>
                    <SheetFooter className="mt-6 flex gap-2">
                        <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Cancel</Button>
                        <Button onClick={saveTask} disabled={!taskTitle.trim()}>
                            {editingTask ? "Save Changes" : "Add Task"}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* Delete Confirmation */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTarget?.type === "phase"
                                ? "This will delete the phase and all its tasks. This action cannot be undone."
                                : "This will delete this task. This action cannot be undone."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default AdminOnboardingManagement;
