import React, { useState } from "react";
import { motion } from "framer-motion";
import { FileText, CheckCircle, Clock, Lock, ThumbsUp, ThumbsDown, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useClientData } from "@/hooks/useClientData";
import { supabase } from "@/lib/supabase";
import type { PhaseStatus } from "@/lib/types";

const phaseStatusIcons: Record<PhaseStatus, React.ElementType> = {
  completed: CheckCircle,
  current: Clock,
  upcoming: Clock,
  locked: Lock,
};

type FilterMode = "all" | "pending" | "approved" | "denied";

const ClientDeliverables: React.FC = () => {
  const { toast } = useToast();
  const [actioning, setActioning] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const { phases, deliverables, tasks, documents, loading, refetch } = useClientData();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const sortedPhases = [...phases].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const isPhaseUnlocked = (phaseIndex: number): boolean => {
    if (phaseIndex === 0) return true;
    const prevPhase = sortedPhases[phaseIndex - 1];
    const prevPhaseTasks = tasks.filter(t => t.phaseId === prevPhase.id);
    return prevPhaseTasks.length === 0 || prevPhaseTasks.every(t => t.status === "completed");
  };

  const handleAction = async (deliverableId: string, title: string, action: "approved" | "denied", unlocked: boolean) => {
    if (!unlocked) return;
    setActioning(deliverableId);
    try {
      const now = new Date().toISOString();
      const patch = action === "approved"
        ? { status: "approved", approved_at: now, denied_at: null }
        : { status: "denied", denied_at: now, approved_at: null };

      const { error } = await supabase.from("deliverables").update(patch).eq("id", deliverableId);
      if (error) throw error;

      toast({
        title: action === "approved" ? "Deliverable Approved ✅" : "Deliverable Denied ✗",
        description: `"${title}" has been marked as ${action}.`,
      });
      await refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setActioning(null);
    }
  };

  // Stats
  const totalDeliverables = deliverables.length;
  const approvedCount = deliverables.filter(d => d.status === "approved").length;
  const deniedCount = deliverables.filter(d => d.status === "denied").length;
  const pendingCount = deliverables.filter(d => d.status === "pending" || !d.status || d.status === "completed").length;

  // Filter pills config
  const filters: { key: FilterMode; label: string; count: number }[] = [
    { key: "all", label: "All", count: totalDeliverables },
    { key: "pending", label: "Pending", count: pendingCount },
    { key: "approved", label: "Approved", count: approvedCount },
    { key: "denied", label: "Denied", count: deniedCount },
  ];

  const deliverablesByPhase = sortedPhases.map((phase, idx) => ({
    phase,
    phaseIndex: idx,
    deliverables: deliverables
      .filter(d => d.phaseId === phase.id)
      .filter(d => {
        if (filterMode === "all") return true;
        if (filterMode === "pending") return !d.status || d.status === "pending" || d.status === "completed";
        return d.status === filterMode;
      })
      .sort((a, b) => (a.title || "").localeCompare(b.title || "")),
    unlocked: isPhaseUnlocked(idx),
  })).filter(g => g.deliverables.length > 0);

  // Build document lookup map from hook data
  const docMap = new Map((documents ?? []).map(d => [d.id, d]));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-heading font-semibold text-foreground">Deliverables</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and approve or deny each deliverable for your project.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-foreground">{totalDeliverables}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-muted-foreground">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-success">{approvedCount}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-destructive">{deniedCount}</p>
            <p className="text-xs text-muted-foreground">Denied</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilterMode(f.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              filterMode === f.key
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {f.label}
            <span className={`inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-bold ${
              filterMode === f.key ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Deliverables by Phase */}
      {deliverablesByPhase.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No deliverables match this filter.
          </CardContent>
        </Card>
      ) : (
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
                      <Badge variant="outline" className="capitalize text-xs">{group.phase.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {group.deliverables.map((deliverable) => {
                        const isApproved = deliverable.status === "approved";
                        const isDenied = deliverable.status === "denied";
                        const isActioned = isApproved || isDenied;
                        const linkedDoc = deliverable.documentId ? docMap.get(deliverable.documentId) : null;

                        return (
                          <div
                            key={deliverable.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 ${
                              isLocked ? "border-border cursor-not-allowed opacity-60" :
                              isApproved ? "border-success/30 bg-success/5" :
                              isDenied ? "border-destructive/30 bg-destructive/5" :
                              "border-border hover:border-primary/30 hover:shadow-sm"
                            }`}
                          >
                            {/* Icon */}
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                              isApproved ? "bg-success/10" :
                              isDenied ? "bg-destructive/10" :
                              isLocked ? "bg-muted/50" : "bg-primary/10"
                            }`}>
                              {isApproved ? (
                                <ThumbsUp className="h-5 w-5 text-success" />
                              ) : isDenied ? (
                                <ThumbsDown className="h-5 w-5 text-destructive" />
                              ) : isLocked ? (
                                <Lock className="h-5 w-5 text-muted-foreground/40" />
                              ) : (
                                <FileText className="h-5 w-5 text-primary" />
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium text-sm ${
                                isLocked ? "text-muted-foreground" : "text-foreground"
                              }`}>
                                {deliverable.title}
                              </p>
                              {deliverable.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{deliverable.description}</p>
                              )}
                              {isApproved && deliverable.approvedAt && (
                                <p className="text-[11px] text-success mt-0.5">
                                  Approved {new Date(deliverable.approvedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </p>
                              )}
                              {isDenied && deliverable.deniedAt && (
                                <p className="text-[11px] text-destructive mt-0.5">
                                  Denied {new Date(deliverable.deniedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </p>
                              )}
                              {linkedDoc && (
                                <a
                                  href={linkedDoc.fileUrl ?? "#"}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-1"
                                >
                                  <ExternalLink className="h-3 w-3" /> {linkedDoc.title}
                                </a>
                              )}
                            </div>

                            {/* Actions */}
                            {!isLocked && (
                              <div className="shrink-0 flex flex-col gap-1.5 items-end">
                                {isActioned ? (
                                  <Badge className={`text-xs ${
                                    isApproved ? "bg-success/10 text-success border-success/30" : "bg-destructive/10 text-destructive border-destructive/30"
                                  }`}>
                                    {isApproved ? "Approved" : "Denied"}
                                  </Badge>
                                ) : (
                                  <div className="flex gap-1.5">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-1 border-success/40 text-success hover:bg-success/10 hover:border-success h-8 text-xs"
                                      disabled={actioning === deliverable.id}
                                      onClick={() => handleAction(deliverable.id, deliverable.title, "approved", group.unlocked)}
                                    >
                                      {actioning === deliverable.id ? (
                                        <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                      ) : (
                                        <ThumbsUp className="h-3 w-3" />
                                      )}
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-1 border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive h-8 text-xs"
                                      disabled={actioning === deliverable.id}
                                      onClick={() => handleAction(deliverable.id, deliverable.title, "denied", group.unlocked)}
                                    >
                                      {actioning === deliverable.id ? (
                                        <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                      ) : (
                                        <ThumbsDown className="h-3 w-3" />
                                      )}
                                      Deny
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClientDeliverables;
