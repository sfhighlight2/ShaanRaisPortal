import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle, Clock,
  ClipboardList, Upload, FileCheck, Eye, Calendar, CheckSquare,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useClientData } from "@/hooks/useClientData";
import { supabase } from "@/lib/supabase";
import type { TaskType } from "@/lib/types";

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

  const { phases, tasks, loading, refetch } = useClientData();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Sort tasks by phase sort_order first, then by task sort_order within the phase
  const allTasks = tasks
    .map(t => {
      const phase = phases.find(p => p.id === t.phaseId);
      return {
        ...t,
        phaseName: phase?.name || "Unknown Phase",
        phaseSortOrder: phase?.sortOrder ?? 9999,
        phaseStatus: phase?.status || "upcoming",
      };
    })
    .sort((a, b) => {
      if (a.phaseSortOrder !== b.phaseSortOrder) return a.phaseSortOrder - b.phaseSortOrder;
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });

  const pendingTasks = allTasks.filter(t => t.status !== "completed");
  const completedTasks = allTasks.filter(t => t.status === "completed");
  const displayTasks = activeTab === "pending" ? pendingTasks : completedTasks;

  const handleComplete = async (e: React.MouseEvent, taskId: string, taskTitle: string) => {
    e.stopPropagation();
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
          Complete these tasks to keep your project moving forward.
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
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Card className={`transition-all duration-200 ${isCompleted ? "opacity-70" : "hover:border-primary/30 hover:shadow-md"}`}>
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                          isCompleted ? "bg-success/10" : "bg-muted"
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="h-5 w-5 text-success" />
                          ) : (
                            <Icon className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-[10px]">
                              {task.phaseName}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {taskTypeLabels[task.taskType] || task.taskType}
                            </Badge>
                          </div>
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
                            disabled={completing === task.id}
                            onClick={(e) => handleComplete(e, task.id, task.title)}
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
