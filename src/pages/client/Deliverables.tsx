import React, { useState } from "react";
import { motion } from "framer-motion";
import { FileText, CheckCircle, Clock, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useClientData } from "@/hooks/useClientData";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { PhaseStatus } from "@/lib/types";

const phaseStatusIcons: Record<PhaseStatus, React.ElementType> = {
  completed: CheckCircle,
  current: Clock,
  upcoming: Clock,
  locked: Lock,
};

const ClientDeliverables: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [completing, setCompleting] = useState<string | null>(null);
  const { phases, deliverables, tasks, loading, refetch } = useClientData();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Sort phases by sort order
  const sortedPhases = [...phases].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  // Determine which phases are unlocked:
  // A phase is accessible only if the previous phase's tasks are all completed
  const isPhaseUnlocked = (phaseIndex: number): boolean => {
    if (phaseIndex === 0) return true;
    const prevPhase = sortedPhases[phaseIndex - 1];
    const prevPhaseTasks = tasks.filter(t => t.phaseId === prevPhase.id);
    // Phase unlocks when all tasks in the previous phase are done
    return prevPhaseTasks.length === 0 || prevPhaseTasks.every(t => t.status === "completed");
  };

  // Build deliverables grouped by phase
  const deliverablesByPhase = sortedPhases.map((phase, idx) => ({
    phase,
    phaseIndex: idx,
    deliverables: deliverables
      .filter(d => d.phaseId === phase.id)
      .sort((a, b) => (a.title || "").localeCompare(b.title || "")),
    unlocked: isPhaseUnlocked(idx),
  })).filter(g => g.deliverables.length > 0 || g.phase.status === "current");

  const totalDeliverables = deliverables.length;
  const completedCount = deliverables.filter(d => d.status === "completed").length;
  const phasesCompleted = phases.filter(p => p.status === "completed").length;

  const handleComplete = async (deliverableId: string, title: string, phaseUnlocked: boolean) => {
    if (!phaseUnlocked) return;
    setCompleting(deliverableId);
    try {
      const { error } = await supabase
        .from("deliverables")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", deliverableId);

      if (error) throw error;

      toast({ title: "Deliverable Completed! ✅", description: `"${title}" has been marked as complete.` });
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
        <h1 className="text-2xl font-heading font-semibold text-foreground">Deliverables</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Complete all tasks in a phase to unlock the next phase's deliverables.
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
            <p className="text-2xl font-semibold text-success">{completedCount}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
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
          const isLocked = !group.unlocked;

          return (
            <motion.div
              key={group.phase.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIndex * 0.1 }}
            >
              <Card className={isLocked ? "opacity-50" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        group.phase.status === "completed" ? "bg-success/10" :
                        group.phase.status === "current" ? "bg-primary/10" : "bg-muted"
                      }`}>
                        {isLocked ? (
                          <Lock className="h-4 w-4 text-muted-foreground/50" />
                        ) : (
                          <PhaseIcon className={`h-4 w-4 ${
                            group.phase.status === "completed" ? "text-success" :
                            group.phase.status === "current" ? "text-primary" : "text-muted-foreground"
                          }`} />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base font-medium">{group.phase.name}</CardTitle>
                        {group.phase.estimatedTimeline && (
                          <p className="text-xs text-muted-foreground">{group.phase.estimatedTimeline}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isLocked && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Complete previous phase tasks to unlock
                        </Badge>
                      )}
                      <Badge variant="outline" className="capitalize text-xs">
                        {group.phase.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {group.deliverables.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      {isLocked ? "This phase is locked." : "No deliverables yet."}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {group.deliverables.map((deliverable) => {
                        const isDone = deliverable.status === "completed";
                        return (
                          <div
                            key={deliverable.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
                              isLocked
                                ? "border-border cursor-not-allowed"
                                : isDone
                                ? "border-success/30 bg-success/5"
                                : "border-border hover:border-primary/30 hover:shadow-md cursor-pointer"
                            }`}
                          >
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                              isDone ? "bg-success/10" : isLocked ? "bg-muted/50" : "bg-primary/10"
                            }`}>
                              {isDone ? (
                                <CheckCircle className="h-5 w-5 text-success" />
                              ) : isLocked ? (
                                <Lock className="h-5 w-5 text-muted-foreground/40" />
                              ) : (
                                <FileText className="h-5 w-5 text-primary" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium text-sm ${isDone ? "line-through text-muted-foreground" : isLocked ? "text-muted-foreground" : "text-foreground"}`}>
                                {deliverable.title}
                              </p>
                              {deliverable.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{deliverable.description}</p>
                              )}
                              {isDone && deliverable.completedAt && (
                                <p className="text-[11px] text-success mt-0.5">
                                  Completed {new Date(deliverable.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </p>
                              )}
                            </div>
                            {!isLocked && (
                              <div className="shrink-0">
                                {isDone ? (
                                  <Badge className="bg-success/10 text-success border-success/30 text-xs">Done</Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    className="gap-1.5"
                                    disabled={completing === deliverable.id}
                                    onClick={() => handleComplete(deliverable.id, deliverable.title, group.unlocked)}
                                  >
                                    {completing === deliverable.id ? (
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
                              </div>
                            )}
                          </div>
                        );
                      })}
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
