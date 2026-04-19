import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle, Clock, Lock, Calendar, Upload, FileCheck, ClipboardList, Eye, Mail, ChevronDown, StickyNote } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useClientData } from "@/hooks/useClientData";
import { Link } from "react-router-dom";
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
  const navigate = useNavigate();
  const { 
    client, 
    project, 
    phases, 
    tasks, 
    deliverables,
    updates, 
    notes,
    accountManager, 
    loading 
  } = useClientData();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!client || !project) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No active project found for your account. Please contact your business consultant.
        </CardContent>
      </Card>
    );
  }

  // Current Phase Logic — phases come pre-sorted from the hook
  const currentPhase = phases.find((p) => p.status === "current") || phases[0];

  // Tasks are pre-sorted by the hook (phase order → task sort_order)
  const pendingTasks = tasks
    .filter((t) => t.status === "pending" || t.status === "in_progress")
    .slice(0, 5);
  const nextTask = pendingTasks[0];

  const recentDeliverables = deliverables.slice(0, 5);
  const recentUpdates = updates.slice(0, 2);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Status Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Package */}
        <div className="animate-fade-in p-5 rounded-lg bg-card border border-border" style={{ animationDelay: "0ms", animationFillMode: "both" }}>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Package</p>
          <p className="text-sm font-medium text-foreground mt-1.5">{project?.projectName || "—"}</p>
        </div>

        {/* Current Phase */}
        <div className="animate-fade-in p-5 rounded-lg bg-card border border-border" style={{ animationDelay: "70ms", animationFillMode: "both" }}>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Current Phase</p>
          <p className="text-sm font-medium text-foreground mt-1.5">{currentPhase?.name || "—"}</p>
        </div>

        {/* Status */}
        <div className="animate-fade-in p-5 rounded-lg bg-card border border-border" style={{ animationDelay: "140ms", animationFillMode: "both" }}>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="mt-1.5 capitalize">{client.status.replaceAll("_", " ")}</Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Your current relationship status with our team</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Business Consultant — clickable popover */}
        <div className="animate-fade-in p-5 rounded-lg bg-card border border-border" style={{ animationDelay: "210ms", animationFillMode: "both" }}>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Business Consultant</p>
          {accountManager ? (
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 mt-1.5 group">
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {accountManager.firstName} {accountManager.lastName}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 p-0" sideOffset={8}>
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                      {accountManager.firstName?.[0]}{accountManager.lastName?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{accountManager.firstName} {accountManager.lastName}</p>
                      <p className="text-xs text-muted-foreground capitalize">{accountManager.role === "manager" ? "Business Consultant" : accountManager.role}</p>
                    </div>
                  </div>
                  <div className="border-t border-border pt-3">
                    <a
                      href={`mailto:${accountManager.email}`}
                      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{accountManager.email}</span>
                    </a>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <p className="text-sm font-medium text-foreground mt-1.5">—</p>
          )}
        </div>
      </div>

      {/* Next Step Card */}
      {nextTask && (
        <div className="animate-fade-in" style={{ animationDelay: "300ms", animationFillMode: "both" }}>
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
              <Button onClick={() => navigate("/tasks")} className="gap-2 shrink-0 hover:scale-[1.02] active:scale-[0.98]">
                Start <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Phase Journey Tracker — Full Width */}
      <div className="animate-fade-in" style={{ animationDelay: "350ms", animationFillMode: "both" }}>
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-medium">Your Journey</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center w-full">
              {phases.map((phase, i) => (
                <React.Fragment key={phase.id}>
                  <div className="flex flex-col items-center flex-1 min-w-0">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <div
                            className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-medium ${phaseStatusStyles[phase.status]}`}
                          >
                            {phase.status === "completed" ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : phase.status === "locked" ? (
                              <Lock className="h-3.5 w-3.5" />
                            ) : (
                              i + 1
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{phase.name}: {phase.status.charAt(0).toUpperCase() + phase.status.slice(1)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <p className={`text-xs mt-2 text-center truncate max-w-full px-1 ${phase.status === "current" ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {phase.name}
                    </p>
                    {phase.estimatedTimeline && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{phase.estimatedTimeline}</p>
                    )}
                  </div>
                  {i < phases.length - 1 && (
                    <div className={`h-0.5 flex-1 min-w-3 shrink-0 -mt-6 ${phases[i + 1].status === "locked" || phases[i + 1].status === "upcoming" ? "bg-border" : "bg-primary"}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Tasks */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium">My Tasks</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/tasks")} className="text-xs gap-1">
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Button>
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
                    onClick={() => navigate("/tasks")}
                    className="group flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer"
                  >
                    <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{task.taskType}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Deliverables */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium">Recent Deliverables</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/deliverables")} className="text-xs gap-1">
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentDeliverables.length === 0 ? (
              <p className="text-sm text-muted-foreground">No deliverables in this phase yet.</p>
            ) : (
              recentDeliverables.map((d) => (
                <div
                  key={d.id}
                  onClick={() => navigate("/deliverables")}
                  className="group flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer"
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
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Updates */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium">Recent Updates</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/updates")} className="text-xs gap-1">
            View All <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {updates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No updates yet.</p>
          ) : (
            updates.map((update) => (
              <div
                key={update.id}
                onClick={() => navigate("/updates")}
                className="border-l-2 border-primary/30 pl-4 cursor-pointer hover:border-primary transition-colors"
              >
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

      {/* Notes from Team */}
      {notes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <StickyNote className="h-4 w-4" /> Notes from Your Team
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="p-3 rounded-lg border border-border bg-primary/[0.02]"
              >
                <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  {note.authorName && (
                    <span className="font-medium">{note.authorName}</span>
                  )}
                  <span>·</span>
                  <span>{new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientDashboard;
