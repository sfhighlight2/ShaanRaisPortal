import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
    ChevronDown, ChevronRight, CheckCircle2, Circle, ExternalLink,
    GraduationCap, Rocket,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
    mockOnboardingPhases, mockOnboardingTasks, mockManagerTaskCompletions,
} from "@/lib/mock-data";
import type { OnboardingPhase, OnboardingTask, ManagerTaskCompletion } from "@/lib/types";

const ManagerOnboarding: React.FC = () => {
    const { user } = useAuth();

    // Local state for phases and tasks (cloned from mock)
    const [phases] = useState<OnboardingPhase[]>(
        [...mockOnboardingPhases].sort((a, b) => a.displayOrder - b.displayOrder)
    );
    const [tasks] = useState<OnboardingTask[]>(
        [...mockOnboardingTasks].sort((a, b) => a.displayOrder - b.displayOrder)
    );

    // Track completions in state
    const [completions, setCompletions] = useState<ManagerTaskCompletion[]>(() => {
        if (!user) return [];
        return mockManagerTaskCompletions.filter((c) => c.managerId === user.id);
    });

    // Expand/collapse state
    const [expandedPhases, setExpandedPhases] = useState<Set<string>>(() => new Set(phases.map((p) => p.id)));

    // Computed progress
    const totalTasks = tasks.length;
    const completedTasks = completions.filter((c) => c.completed).length;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const isTaskCompleted = (taskId: string) => completions.some((c) => c.taskId === taskId && c.completed);

    const toggleTask = (taskId: string) => {
        setCompletions((prev) => {
            const existing = prev.find((c) => c.taskId === taskId);
            if (existing) {
                return prev.map((c) =>
                    c.taskId === taskId
                        ? { ...c, completed: !c.completed, completedAt: !c.completed ? new Date().toISOString() : undefined }
                        : c
                );
            }
            return [
                ...prev,
                {
                    id: `mc-${Date.now()}`,
                    managerId: user?.id || "",
                    taskId,
                    completed: true,
                    completedAt: new Date().toISOString(),
                },
            ];
        });
    };

    const togglePhase = (phaseId: string) => {
        setExpandedPhases((prev) => {
            const next = new Set(prev);
            if (next.has(phaseId)) next.delete(phaseId);
            else next.add(phaseId);
            return next;
        });
    };

    const getPhaseProgress = (phaseId: string) => {
        const phaseTasks = tasks.filter((t) => t.phaseId === phaseId);
        const done = phaseTasks.filter((t) => isTaskCompleted(t.id)).length;
        return { done, total: phaseTasks.length };
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-heading font-semibold text-foreground">Onboarding</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Complete your onboarding tasks to get up to speed with ShaanRais.com systems and processes.
                </p>
            </div>

            {/* Progress Overview */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <GraduationCap className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">Onboarding Progress</p>
                                    <p className="text-xs text-muted-foreground">
                                        {completedTasks} / {totalTasks} Tasks Completed
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {progressPercent === 100 && <Rocket className="h-5 w-5 text-success" />}
                                <span className="text-2xl font-semibold text-foreground">{progressPercent}%</span>
                            </div>
                        </div>
                        <Progress value={progressPercent} className="h-2" />
                        {progressPercent === 100 && (
                            <p className="text-xs text-success mt-2 font-medium">
                                🎉 Congratulations! You've completed your onboarding!
                            </p>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* Phases */}
            <div className="space-y-3">
                {phases.map((phase, idx) => {
                    const { done, total } = getPhaseProgress(phase.id);
                    const isExpanded = expandedPhases.has(phase.id);
                    const phaseTasks = tasks.filter((t) => t.phaseId === phase.id);
                    const phaseComplete = done === total && total > 0;

                    return (
                        <motion.div
                            key={phase.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 + idx * 0.04 }}
                        >
                            <Card className={phaseComplete ? "border-success/30 bg-success/[0.02]" : ""}>
                                {/* Phase header */}
                                <button
                                    onClick={() => togglePhase(phase.id)}
                                    className="w-full text-left"
                                >
                                    <CardHeader className="py-4 px-5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
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
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {phaseComplete ? (
                                                    <Badge className="bg-success/10 text-success text-[10px]">Complete</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-[10px]">
                                                        {done}/{total}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>
                                </button>

                                {/* Phase tasks */}
                                {isExpanded && (
                                    <CardContent className="pt-0 pb-4 px-5">
                                        <div className="space-y-1 ml-7">
                                            {phaseTasks.map((task) => {
                                                const completed = isTaskCompleted(task.id);
                                                return (
                                                    <div
                                                        key={task.id}
                                                        className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${completed ? "bg-muted/50" : "hover:bg-muted/30"
                                                            }`}
                                                    >
                                                        <Checkbox
                                                            id={task.id}
                                                            checked={completed}
                                                            onCheckedChange={() => toggleTask(task.id)}
                                                            className="mt-0.5"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <label
                                                                htmlFor={task.id}
                                                                className={`text-sm cursor-pointer ${completed
                                                                        ? "text-muted-foreground line-through"
                                                                        : "text-foreground"
                                                                    }`}
                                                            >
                                                                {task.title}
                                                            </label>
                                                            {task.description && (
                                                                <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            {!task.required && (
                                                                <Badge variant="outline" className="text-[9px]">Optional</Badge>
                                                            )}
                                                            {task.resourceLink && (
                                                                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                                                    <a href={task.resourceLink} target="_blank" rel="noopener noreferrer">
                                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                                    </a>
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default ManagerOnboarding;
