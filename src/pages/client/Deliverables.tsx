import React from "react";
import { motion } from "framer-motion";
import { FileText, Download, Eye, CheckCircle, Clock, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  mockClients, mockProjects, mockPhases, mockDeliverables,
} from "@/lib/mock-data";
import type { PhaseStatus } from "@/lib/types";

const phaseStatusIcons: Record<PhaseStatus, React.ElementType> = {
  completed: CheckCircle,
  current: Clock,
  upcoming: Clock,
  locked: Lock,
};

const ClientDeliverables: React.FC = () => {
  const client = mockClients[0];
  const project = mockProjects.find((p) => p.clientId === client.id && p.isMainProject);
  const phases = mockPhases.filter((ph) => ph.projectId === project?.id).sort((a, b) => a.sortOrder - b.sortOrder);

  // Get deliverables grouped by phase
  const deliverablesByPhase = phases.map((phase) => ({
    phase,
    deliverables: mockDeliverables.filter((d) => d.phaseId === phase.id && d.visibleToClient),
  })).filter((group) => group.deliverables.length > 0 || group.phase.status !== "locked");

  const totalDeliverables = deliverablesByPhase.reduce((acc, g) => acc + g.deliverables.length, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-serif font-semibold text-foreground">Deliverables</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Access all project deliverables organized by phase.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-foreground">{totalDeliverables}</p>
            <p className="text-xs text-muted-foreground">Total Deliverables</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-foreground">{phases.filter((p) => p.status === "completed").length}</p>
            <p className="text-xs text-muted-foreground">Phases Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-foreground">{phases.length}</p>
            <p className="text-xs text-muted-foreground">Total Phases</p>
          </CardContent>
        </Card>
      </div>

      {/* Deliverables by Phase */}
      <div className="space-y-6">
        {deliverablesByPhase.map((group, groupIndex) => {
          const PhaseIcon = phaseStatusIcons[group.phase.status];
          const isLocked = group.phase.status === "locked";

          return (
            <motion.div
              key={group.phase.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIndex * 0.1 }}
            >
              <Card className={isLocked ? "opacity-60" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        group.phase.status === "completed" ? "bg-success/10" :
                        group.phase.status === "current" ? "bg-primary/10" : "bg-muted"
                      }`}>
                        <PhaseIcon className={`h-4 w-4 ${
                          group.phase.status === "completed" ? "text-success" :
                          group.phase.status === "current" ? "text-primary" : "text-muted-foreground"
                        }`} />
                      </div>
                      <div>
                        <CardTitle className="text-base font-medium">{group.phase.name}</CardTitle>
                        {group.phase.estimatedTimeline && (
                          <p className="text-xs text-muted-foreground">{group.phase.estimatedTimeline}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize text-xs">
                      {group.phase.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {group.deliverables.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      {isLocked ? "This phase is not yet active." : "No deliverables uploaded yet."}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {group.deliverables.map((deliverable) => (
                        <div
                          key={deliverable.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors"
                        >
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm">{deliverable.title}</p>
                            {deliverable.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{deliverable.description}</p>
                            )}
                            {deliverable.uploadedAt && (
                              <p className="text-[11px] text-muted-foreground mt-1">
                                Uploaded {new Date(deliverable.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button variant="ghost" size="sm" className="h-8 gap-1.5">
                              <Eye className="h-3.5 w-3.5" /> View
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 gap-1.5">
                              <Download className="h-3.5 w-3.5" /> Download
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ClientDeliverables;
