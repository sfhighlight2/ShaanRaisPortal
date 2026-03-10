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
    Dialog, DialogContent, DialogDescription, DialogHeader,
    DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { mockOnboardingPhases, mockOnboardingTasks } from "@/lib/mock-data";
import type { OnboardingPhase, OnboardingTask } from "@/lib/types";

const AdminOnboardingManagement: React.FC = () => {
    // Local state
    const [phases, setPhases] = useState<OnboardingPhase[]>(
        [...mockOnboardingPhases].sort((a, b) => a.displayOrder - b.displayOrder)
    );
    const [tasks, setTasks] = useState<OnboardingTask[]>(
        [...mockOnboardingTasks].sort((a, b) => a.displayOrder - b.displayOrder)
    );

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

    const savePhase = () => {
        if (!phaseName.trim()) return;
        if (editingPhase) {
            setPhases((prev) =>
                prev.map((p) =>
                    p.id === editingPhase.id ? { ...p, name: phaseName.trim(), description: phaseDescription.trim() || undefined } : p
                )
            );
        } else {
            const maxOrder = phases.reduce((max, p) => Math.max(max, p.displayOrder), 0);
            setPhases((prev) => [
                ...prev,
                {
                    id: `op-${Date.now()}`,
                    name: phaseName.trim(),
                    description: phaseDescription.trim() || undefined,
                    displayOrder: maxOrder + 1,
                    createdAt: new Date().toISOString(),
                },
            ]);
        }
        setPhaseDialogOpen(false);
    };

    const movePhase = (phaseId: string, direction: "up" | "down") => {
        setPhases((prev) => {
            const sorted = [...prev].sort((a, b) => a.displayOrder - b.displayOrder);
            const idx = sorted.findIndex((p) => p.id === phaseId);
            if ((direction === "up" && idx === 0) || (direction === "down" && idx === sorted.length - 1)) return prev;
            const swapIdx = direction === "up" ? idx - 1 : idx + 1;
            const tempOrder = sorted[idx].displayOrder;
            sorted[idx] = { ...sorted[idx], displayOrder: sorted[swapIdx].displayOrder };
            sorted[swapIdx] = { ...sorted[swapIdx], displayOrder: tempOrder };
            return sorted;
        });
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

    const saveTask = () => {
        if (!taskTitle.trim()) return;
        if (editingTask) {
            setTasks((prev) =>
                prev.map((t) =>
                    t.id === editingTask.id
                        ? {
                            ...t,
                            title: taskTitle.trim(),
                            description: taskDescription.trim() || undefined,
                            required: taskRequired,
                            resourceLink: taskResourceLink.trim() || undefined,
                        }
                        : t
                )
            );
        } else {
            const phaseTasks = tasks.filter((t) => t.phaseId === targetPhaseId);
            const maxOrder = phaseTasks.reduce((max, t) => Math.max(max, t.displayOrder), 0);
            setTasks((prev) => [
                ...prev,
                {
                    id: `ot-${Date.now()}`,
                    phaseId: targetPhaseId,
                    title: taskTitle.trim(),
                    description: taskDescription.trim() || undefined,
                    displayOrder: maxOrder + 1,
                    required: taskRequired,
                    resourceLink: taskResourceLink.trim() || undefined,
                },
            ]);
        }
        setTaskDialogOpen(false);
    };

    const moveTask = (taskId: string, phaseId: string, direction: "up" | "down") => {
        setTasks((prev) => {
            const phaseTasks = prev
                .filter((t) => t.phaseId === phaseId)
                .sort((a, b) => a.displayOrder - b.displayOrder);
            const idx = phaseTasks.findIndex((t) => t.id === taskId);
            if ((direction === "up" && idx === 0) || (direction === "down" && idx === phaseTasks.length - 1)) return prev;
            const swapIdx = direction === "up" ? idx - 1 : idx + 1;
            const tempOrder = phaseTasks[idx].displayOrder;
            const update = new Map<string, number>();
            update.set(phaseTasks[idx].id, phaseTasks[swapIdx].displayOrder);
            update.set(phaseTasks[swapIdx].id, tempOrder);
            return prev.map((t) => (update.has(t.id) ? { ...t, displayOrder: update.get(t.id)! } : t));
        });
    };

    // === Delete ===
    const confirmDelete = () => {
        if (!deleteTarget) return;
        if (deleteTarget.type === "phase") {
            setPhases((prev) => prev.filter((p) => p.id !== deleteTarget.id));
            setTasks((prev) => prev.filter((t) => t.phaseId !== deleteTarget.id));
        } else {
            setTasks((prev) => prev.filter((t) => t.id !== deleteTarget.id));
        }
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
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
            <Dialog open={phaseDialogOpen} onOpenChange={setPhaseDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingPhase ? "Edit Phase" : "Add Phase"}</DialogTitle>
                        <DialogDescription>
                            {editingPhase ? "Update the phase details." : "Create a new onboarding phase."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="phase-name">Phase Name</Label>
                            <Input id="phase-name" value={phaseName} onChange={(e) => setPhaseName(e.target.value)} placeholder="e.g. Welcome & Account Setup" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phase-desc">Description</Label>
                            <Textarea id="phase-desc" value={phaseDescription} onChange={(e) => setPhaseDescription(e.target.value)} placeholder="Brief description of this phase" rows={3} />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={savePhase} disabled={!phaseName.trim()}>
                            {editingPhase ? "Save Changes" : "Create Phase"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Task Dialog */}
            <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingTask ? "Edit Task" : "Add Task"}</DialogTitle>
                        <DialogDescription>
                            {editingTask ? "Update the task details." : "Add a new task to this phase."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
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
                        <div className="flex items-center justify-between">
                            <Label htmlFor="task-required" className="text-sm">Required</Label>
                            <Switch id="task-required" checked={taskRequired} onCheckedChange={setTaskRequired} />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={saveTask} disabled={!taskTitle.trim()}>
                            {editingTask ? "Save Changes" : "Add Task"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
