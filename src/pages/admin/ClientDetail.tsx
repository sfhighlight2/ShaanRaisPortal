import React, { useState } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Building, Mail, Phone, ExternalLink, MoreHorizontal,
  CheckCircle, Clock, Lock, MessageSquare, FileText, Users, Activity, ClipboardList,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  mockClients, mockProjects, mockPhases, mockTasks, mockDeliverables,
  mockUpdates, mockQuestions, mockActivityLogs, getUserById,
} from "@/lib/mock-data";
import type { ClientStatus, PhaseStatus } from "@/lib/types";

const statusColors: Record<ClientStatus, string> = {
  lead: "bg-muted text-muted-foreground",
  onboarding: "bg-warning/10 text-warning",
  active: "bg-success/10 text-success",
  waiting_on_client: "bg-destructive/10 text-destructive",
  completed: "bg-primary/10 text-primary",
  archived: "bg-muted text-muted-foreground",
};

const phaseStatusStyles: Record<PhaseStatus, string> = {
  completed: "bg-success text-success-foreground",
  current: "bg-primary text-primary-foreground",
  upcoming: "bg-muted text-muted-foreground",
  locked: "bg-muted/50 text-muted-foreground",
};

const AdminClientDetail: React.FC = () => {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const [activeTab, setActiveTab] = useState("overview");

  // Default to first client if no ID
  const client = mockClients.find((c) => c.id === clientId) || mockClients[0];
  const project = mockProjects.find((p) => p.clientId === client.id && p.isMainProject);
  const phases = mockPhases.filter((ph) => ph.projectId === project?.id).sort((a, b) => a.sortOrder - b.sortOrder);
  const currentPhase = phases.find((ph) => ph.status === "current");
  const accountManager = getUserById(client.accountManagerId);

  // Tasks
  const allTasks = phases.flatMap((phase) =>
    mockTasks.filter((t) => t.phaseId === phase.id).map((t) => ({ ...t, phaseName: phase.name }))
  );
  const pendingTasks = allTasks.filter((t) => t.status !== "completed");
  const completedTasks = allTasks.filter((t) => t.status === "completed");

  // Deliverables
  const deliverables = phases.flatMap((phase) =>
    mockDeliverables.filter((d) => d.phaseId === phase.id).map((d) => ({ ...d, phaseName: phase.name }))
  );

  // Updates, questions, activity
  const updates = mockUpdates.filter((u) => u.clientId === client.id);
  const questions = mockQuestions.filter((q) => q.clientId === client.id);
  const activities = mockActivityLogs.filter((a) => a.clientId === client.id).slice(0, 10);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/clients")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-serif font-semibold text-foreground">{client.companyName}</h1>
              <Badge className={`text-xs ${statusColors[client.status]}`}>
                {client.status.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {client.primaryContactName} · {client.primaryContactEmail}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <MoreHorizontal className="h-4 w-4" /> Actions
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Package</p>
            <p className="text-sm font-medium text-foreground mt-1 truncate">{project?.projectName || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Phase</p>
            <p className="text-sm font-medium text-foreground mt-1">{currentPhase?.name || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Tasks</p>
            <p className="text-sm font-medium text-foreground mt-1">{completedTasks.length}/{allTasks.length} done</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Manager</p>
            <p className="text-sm font-medium text-foreground mt-1">{accountManager?.firstName || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Questions</p>
            <p className="text-sm font-medium text-foreground mt-1">{questions.filter((q) => q.status === "open").length} open</p>
          </CardContent>
        </Card>
      </div>

      {/* Phase Tracker */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Project Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {phases.map((phase, i) => (
              <React.Fragment key={phase.id}>
                <div className="flex flex-col items-center min-w-[90px] shrink-0">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium ${phaseStatusStyles[phase.status]}`}>
                    {phase.status === "completed" ? <CheckCircle className="h-3.5 w-3.5" /> :
                      phase.status === "locked" ? <Lock className="h-3 w-3" /> : i + 1}
                  </div>
                  <p className={`text-xs mt-1.5 text-center ${phase.status === "current" ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {phase.name}
                  </p>
                </div>
                {i < phases.length - 1 && (
                  <div className={`h-0.5 w-4 shrink-0 ${phases[i + 1].status === "locked" || phases[i + 1].status === "upcoming" ? "bg-muted" : "bg-primary"}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5"><Building className="h-3.5 w-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5"><ClipboardList className="h-3.5 w-3.5" /> Tasks</TabsTrigger>
          <TabsTrigger value="deliverables" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Deliverables</TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5"><Activity className="h-3.5 w-3.5" /> Activity</TabsTrigger>
          <TabsTrigger value="questions" className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Questions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base font-medium">Contact Information</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{client.primaryContactEmail}</span></div>
                {client.phone && <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{client.phone}</span></div>}
                {client.googleDriveUrl && (
                  <div className="flex items-center gap-3">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <a href={client.googleDriveUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">Google Drive Folder</a>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base font-medium">Team</CardTitle></CardHeader>
              <CardContent>
                {accountManager && (
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium">{accountManager.firstName[0]}{accountManager.lastName[0]}</div>
                    <div>
                      <p className="text-sm font-medium">{accountManager.firstName} {accountManager.lastName}</p>
                      <p className="text-xs text-muted-foreground">Account Manager</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base font-medium">Recent Updates</CardTitle></CardHeader>
            <CardContent>
              {updates.length === 0 ? <p className="text-sm text-muted-foreground">No updates yet.</p> : (
                <div className="space-y-3">
                  {updates.slice(0, 3).map((u) => (
                    <div key={u.id} className="border-l-2 border-primary/30 pl-3">
                      <p className="text-sm font-medium">{u.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(u.createdAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <Card>
            <CardContent className="p-4">
              {allTasks.length === 0 ? <p className="text-sm text-muted-foreground py-4">No tasks.</p> : (
                <div className="space-y-2">
                  {allTasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center ${t.status === "completed" ? "bg-success/10" : "bg-muted"}`}>
                        {t.status === "completed" ? <CheckCircle className="h-3.5 w-3.5 text-success" /> : <Clock className="h-3 w-3 text-muted-foreground" />}
                      </div>
                      <div className="flex-1"><p className="text-sm">{t.title}</p><p className="text-xs text-muted-foreground">{t.phaseName}</p></div>
                      <Badge variant="outline" className="text-[10px]">{t.taskType}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deliverables" className="mt-6">
          <Card>
            <CardContent className="p-4">
              {deliverables.length === 0 ? <p className="text-sm text-muted-foreground py-4">No deliverables.</p> : (
                <div className="space-y-2">
                  {deliverables.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border">
                      <FileText className="h-4 w-4 text-primary" />
                      <div className="flex-1"><p className="text-sm">{d.title}</p><p className="text-xs text-muted-foreground">{d.phaseName}</p></div>
                      <Badge variant="outline" className="text-[10px]">{d.visibleToClient ? "Visible" : "Internal"}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardContent className="p-4">
              {activities.length === 0 ? <p className="text-sm text-muted-foreground py-4">No activity recorded.</p> : (
                <div className="space-y-3">
                  {activities.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 text-sm">
                      <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      <span className="flex-1">{a.eventLabel}</span>
                      <span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="mt-6">
          <Card>
            <CardContent className="p-4">
              {questions.length === 0 ? <p className="text-sm text-muted-foreground py-4">No questions.</p> : (
                <div className="space-y-3">
                  {questions.map((q) => (
                    <div key={q.id} className="p-3 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">{q.subject}</p>
                        <Badge className={`text-[10px] ${q.status === "open" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>{q.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{q.message}</p>
                      {q.response && <p className="text-sm mt-2 p-2 bg-muted rounded">Response: {q.response}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminClientDetail;
