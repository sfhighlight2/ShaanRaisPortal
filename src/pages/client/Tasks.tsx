import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle, Clock, ArrowRight, Filter,
  ClipboardList, Upload, FileCheck, Eye, Calendar, CheckSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  mockClients, mockProjects, mockPhases, mockTasks,
} from "@/lib/mock-data";
import type { TaskType, TaskStatus } from "@/lib/types";

const taskTypeIcons: Record<TaskType, React.ElementType> = {
  form: ClipboardList,
  upload: Upload,
  approval: FileCheck,
  review: Eye,
  scheduling: Calendar,
  checklist: CheckSquare,
};

const taskTypeLabels: Record<TaskType, string> = {
  form: "Form",
  upload: "Upload",
  approval: "Approval",
  review: "Review",
  scheduling: "Schedule",
  checklist: "Checklist",
};

const statusStyles: Record<TaskStatus, { bg: string; text: string }> = {
  pending: { bg: "bg-muted", text: "text-muted-foreground" },
  in_progress: { bg: "bg-warning/10", text: "text-warning" },
  completed: { bg: "bg-success/10", text: "text-success" },
  blocked: { bg: "bg-destructive/10", text: "text-destructive" },
};

const ClientTasks: React.FC = () => {
  const [activeTab, setActiveTab] = useState("pending");

  const client = mockClients[0];
  const project = mockProjects.find((p) => p.clientId === client.id && p.isMainProject);
  const phases = mockPhases.filter((ph) => ph.projectId === project?.id).sort((a, b) => a.sortOrder - b.sortOrder);

  // Get all client-visible tasks
  const allTasks = phases.flatMap((phase) =>
    mockTasks
      .filter((t) => t.phaseId === phase.id && t.visibleToClient)
      .map((t) => ({ ...t, phaseName: phase.name, phaseStatus: phase.status }))
  );

  const pendingTasks = allTasks.filter((t) => t.status !== "completed");
  const completedTasks = allTasks.filter((t) => t.status === "completed");

  const displayTasks = activeTab === "pending" ? pendingTasks : completedTasks;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-serif font-semibold text-foreground">My Tasks</h1>
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
                const Icon = taskTypeIcons[task.taskType];
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="hover:border-primary/30 transition-colors cursor-pointer">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          task.status === "completed" ? "bg-success/10" : "bg-muted"
                        }`}>
                          {task.status === "completed" ? (
                            <CheckCircle className="h-5 w-5 text-success" />
                          ) : (
                            <Icon className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{task.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px]">
                              {task.phaseName}
                            </Badge>
                            <Badge className={`text-[10px] ${statusStyles[task.status].bg} ${statusStyles[task.status].text}`}>
                              {taskTypeLabels[task.taskType]}
                            </Badge>
                          </div>
                        </div>
                        {task.status !== "completed" && (
                          <Button size="sm" className="gap-1.5 shrink-0">
                            Start <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {task.status === "completed" && task.completedAt && (
                          <p className="text-xs text-muted-foreground shrink-0">
                            {new Date(task.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
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
