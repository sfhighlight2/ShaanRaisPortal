import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle, Clock, Lock,
  ClipboardList, Upload, FileCheck, Eye, Calendar, CheckSquare, StickyNote,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useClientData } from "@/hooks/useClientData";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

const taskTypeIcons: Record<string, React.ElementType> = {
  form: ClipboardList,
  upload: Upload,
  approval: FileCheck,
  review: Eye,
  scheduling: Calendar,
  checklist: CheckSquare,
};

const taskTypeLabels: Record<string, string> = {
  form: "Form",
  upload: "Upload",
  approval: "Approval",
  review: "Review",
  scheduling: "Schedule",
  checklist: "Checklist",
};

const ClientTasks: React.FC = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [completing, setCompleting] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const { phases, tasks, loading, refetch } = useClientData();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Sort tasks by phase sort_order, then task sort_order within the phase
  const allTasks = tasks
    .map(t => {
      const phase = phases.find(p => p.id === t.phaseId);
      return {
        ...t,
        phaseName: phase?.name || "Unknown Phase",
        phaseSortOrder: phase?.sortOrder ?? 9999,
      };
    })
    .sort((a, b) => {
      if (a.phaseSortOrder !== b.phaseSortOrder) return a.phaseSortOrder - b.phaseSortOrder;
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });

  const pendingTasks = allTasks.filter(t => t.status !== "completed");
  const completedTasks = allTasks.filter(t => t.status === "completed");
  const displayTasks = activeTab === "pending" ? pendingTasks : completedTasks;

  // Sequential locking: a task is locked if the task before it in the pending list is not completed
  // Find the index of each pending task in allTasks to determine if the previous one is done
  const firstPendingIndex = allTasks.findIndex(t => t.status !== "completed");

  const isTaskUnlocked = (task: typeof allTasks[0]): boolean => {
    const idx = allTasks.indexOf(task);
    if (idx === 0) return true;
    return allTasks[idx - 1].status === "completed";
  };

  const handleComplete = async (e: React.MouseEvent, taskId: string, taskTitle: string, locked: boolean) => {
    e.stopPropagation();
    if (locked) return;
    setCompleting(taskId);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", taskId);

      if (error) throw error;

      toast({ title: "Task Completed! 🎉", description: `"${taskTitle}" has been marked as complete.` });
      await refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCompleting(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-heading font-semibold text-foreground">My Tasks</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Complete tasks in order to keep your project moving forward.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-foreground">{allTasks.length}</p>
            <p className="text-xs text-muted-foreground">Total Tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-foreground">{pendingTasks.length}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-success">{completedTasks.length}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-foreground">
              {allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0}%
            </p>
            <p className="text-xs text-muted-foreground">Progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-3.5 w-3.5" />
            Pending ({pendingTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle className="h-3.5 w-3.5" />
            Completed ({completedTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="space-y-3">
            {displayTasks.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-10 w-10 text-success mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {activeTab === "pending" ? "No pending tasks — you're all caught up!" : "No completed tasks yet."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              displayTasks.map((task, i) => {
                const Icon = taskTypeIcons[task.taskType] || ClipboardList;
                const isCompleted = task.status === "completed";
                const locked = !isCompleted && !isTaskUnlocked(task);

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Card className={`transition-all duration-200 ${locked ? "opacity-45" : isCompleted ? "opacity-70" : "hover:border-primary/30 hover:shadow-md"}`}>
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                          isCompleted ? "bg-success/10" : locked ? "bg-muted/50" : "bg-muted"
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="h-5 w-5 text-success" />
                          ) : locked ? (
                            <Lock className="h-5 w-5 text-muted-foreground/50" />
                          ) : (
                            <Icon className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${isCompleted ? "line-through text-muted-foreground" : locked ? "text-muted-foreground" : "text-foreground"}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-[10px]">
                              {task.phaseName}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {taskTypeLabels[task.taskType] || task.taskType}
                            </Badge>
                            {locked && (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                Complete previous task first
                              </Badge>
                            )}
                          </div>
                        {task.notes && !locked && (
                             <div className="mt-2 flex items-start gap-1.5 rounded-md bg-primary/5 border border-primary/15 px-2.5 py-2">
                               <StickyNote className="h-3.5 w-3.5 text-primary/60 mt-0.5 shrink-0" />
                               <p className="text-xs text-foreground/80 leading-relaxed">{task.notes}</p>
                             </div>
                           )}
                        </div>
                        {isCompleted ? (
                          <p className="text-xs text-muted-foreground shrink-0">
                            {task.completedAt
                              ? new Date(task.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                              : "Done"}
                          </p>
                        ) : (
                          <Button
                            size="sm"
                            className="gap-1.5 shrink-0"
                            disabled={locked || completing === task.id}
                            onClick={(e) => handleComplete(e, task.id, task.title, locked)}
                          >
                            {completing === task.id ? (
                              <span className="flex items-center gap-1.5">
                                <span className="h-3 w-3 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                                Saving…
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5">
                                <CheckCircle className="h-3.5 w-3.5" /> Complete
                              </span>
                            )}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientTasks;
