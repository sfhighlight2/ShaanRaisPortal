import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Clock, Lock, Calendar, Upload, FileCheck, ClipboardList, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  mockClients, mockProjects, mockPhases, mockTasks,
  mockDeliverables, mockUpdates, getUserById,
} from "@/lib/mock-data";
import type { TaskType, PhaseStatus } from "@/lib/types";

const taskTypeIcons: Record<TaskType, React.ElementType> = {
  form: ClipboardList,
  upload: Upload,
  approval: FileCheck,
  review: Eye,
  scheduling: Calendar,
  checklist: CheckCircle,
};

const phaseStatusStyles: Record<PhaseStatus, string> = {
  completed: "bg-success text-success-foreground",
  current: "bg-primary text-primary-foreground",
  upcoming: "bg-muted text-muted-foreground",
  locked: "bg-muted/50 text-muted-foreground",
};

const ClientDashboard: React.FC = () => {
  // Mock: use first client
  const client = mockClients[0];
  const project = mockProjects.find((p) => p.clientId === client.id && p.isMainProject);
  const phases = mockPhases.filter((ph) => ph.projectId === project?.id).sort((a, b) => a.sortOrder - b.sortOrder);
  const currentPhase = phases.find((ph) => ph.status === "current");
  const accountManager = getUserById(client.accountManagerId);

  // Tasks for current phase (visible to client, not completed)
  const pendingTasks = mockTasks.filter(
    (t) => t.phaseId === currentPhase?.id && t.visibleToClient && t.status !== "completed"
  );
  const nextTask = pendingTasks[0];

  // Deliverables for current phase
  const deliverables = mockDeliverables.filter(
    (d) => d.phaseId === currentPhase?.id && d.visibleToClient
  );

  // Recent updates
  const updates = mockUpdates.filter((u) => u.clientId === client.id && u.visibleToClient).slice(0, 2);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Status Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-card border border-border">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Package</p>
          <p className="text-sm font-medium text-foreground mt-1">{project?.projectName || "—"}</p>
        </div>
        <div className="p-4 rounded-lg bg-card border border-border">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Current Phase</p>
          <p className="text-sm font-medium text-foreground mt-1">{currentPhase?.name || "—"}</p>
        </div>
        <div className="p-4 rounded-lg bg-card border border-border">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Status</p>
          <Badge variant="outline" className="mt-1 capitalize">{client.status.replace("_", " ")}</Badge>
        </div>
        <div className="p-4 rounded-lg bg-card border border-border">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Account Manager</p>
          <p className="text-sm font-medium text-foreground mt-1">{accountManager?.firstName} {accountManager?.lastName}</p>
        </div>
      </div>

      {/* Next Step Card */}
      {nextTask && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-primary/[0.03] border-primary/20">
            <CardContent className="p-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  {React.createElement(taskTypeIcons[nextTask.taskType], { className: "h-5 w-5 text-primary" })}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Your Next Step</p>
                  <p className="text-lg font-medium text-foreground mt-0.5">{nextTask.title}</p>
                </div>
              </div>
              <Button className="gap-2 shrink-0">
                Start <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Phase Journey Tracker */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium">Your Journey</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {phases.map((phase, i) => (
              <React.Fragment key={phase.id}>
                <div className="flex flex-col items-center min-w-[100px] shrink-0">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium ${phaseStatusStyles[phase.status]}`}
                  >
                    {phase.status === "completed" ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : phase.status === "locked" ? (
                      <Lock className="h-3.5 w-3.5" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <p className={`text-xs mt-2 text-center ${phase.status === "current" ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {phase.name}
                  </p>
                  {phase.estimatedTimeline && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{phase.estimatedTimeline}</p>
                  )}
                </div>
                {i < phases.length - 1 && (
                  <div className={`h-0.5 w-6 shrink-0 ${phases[i + 1].status === "locked" || phases[i + 1].status === "upcoming" ? "bg-muted" : "bg-primary"}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">My Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending tasks right now.</p>
            ) : (
              pendingTasks.map((task) => {
                const Icon = taskTypeIcons[task.taskType];
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer"
                  >
                    <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{task.taskType}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Deliverables */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Recent Deliverables</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {deliverables.length === 0 ? (
              <p className="text-sm text-muted-foreground">No deliverables in this phase yet.</p>
            ) : (
              deliverables.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer"
                >
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                    <FileCheck className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{d.title}</p>
                    {d.uploadedAt && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(d.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs">View</Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Updates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Recent Updates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {updates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No updates yet.</p>
          ) : (
            updates.map((update) => (
              <div key={update.id} className="border-l-2 border-primary/30 pl-4">
                <p className="text-sm font-medium text-foreground">{update.title}</p>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{update.body}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(update.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientDashboard;
