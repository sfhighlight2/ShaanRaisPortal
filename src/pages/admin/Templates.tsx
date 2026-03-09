import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, MoreHorizontal, Edit, Trash2, Copy, ChevronDown, ChevronRight,
  GripVertical, ClipboardList, Upload, FileCheck, Eye, Calendar, CheckSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { mockTemplates } from "@/lib/mock-data";
import type { TaskType } from "@/lib/types";

const taskTypeIcons: Record<TaskType, React.ElementType> = {
  form: ClipboardList,
  upload: Upload,
  approval: FileCheck,
  review: Eye,
  scheduling: Calendar,
  checklist: CheckSquare,
};

const AdminTemplates: React.FC = () => {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [showNewDialog, setShowNewDialog] = useState(false);

  const togglePhase = (phaseId: string) => {
    const newSet = new Set(expandedPhases);
    if (newSet.has(phaseId)) {
      newSet.delete(phaseId);
    } else {
      newSet.add(phaseId);
    }
    setExpandedPhases(newSet);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-foreground">Package Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">Create and manage reusable package templates.</p>
        </div>
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> New Template</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Template Name</label>
                <Input placeholder="e.g., Growth Consulting Package" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Description</label>
                <Textarea placeholder="Describe what this package includes..." rows={3} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
                <Button onClick={() => setShowNewDialog(false)}>Create Template</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates List */}
      <div className="space-y-4">
      {mockTemplates.map((template, index) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-medium">{template.name}</CardTitle>
                      <Badge variant="outline" className={template.active ? "text-success border-success/30" : ""}>
                        {template.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Copy className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                  {template.phases.length} Phases · {template.phases.reduce((acc, p) => acc + p.tasks.length, 0)} Tasks · {template.phases.reduce((acc, p) => acc + p.deliverables.length, 0)} Deliverables
                </p>

                {/* Phases */}
                <div className="space-y-2">
                  {template.phases.map((phase, i) => {
                    const isExpanded = expandedPhases.has(phase.id);
                    return (
                      <div key={phase.id} className="border rounded-lg">
                        <button
                          onClick={() => togglePhase(phase.id)}
                          className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <span className="text-sm font-medium flex-1">{i + 1}. {phase.name}</span>
                          {phase.estimatedTimeline && (
                            <span className="text-xs text-muted-foreground">{phase.estimatedTimeline}</span>
                          )}
                          <Badge variant="outline" className="text-[10px]">
                            {phase.tasks.length} tasks
                          </Badge>
                        </button>

                        {isExpanded && (
                          <div className="px-3 pb-3 space-y-3">
                            {/* Tasks */}
                            {phase.tasks.length > 0 && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-2">Tasks</p>
                                <div className="space-y-1">
                                  {phase.tasks.map((task) => {
                                    const Icon = taskTypeIcons[task.taskType];
                                    return (
                                      <div key={task.id} className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded">
                                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span className="flex-1">{task.title}</span>
                                        <Badge variant="outline" className="text-[9px]">{task.taskType}</Badge>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Deliverables */}
                            {phase.deliverables.length > 0 && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-2">Deliverables</p>
                                <div className="space-y-1">
                                  {phase.deliverables.map((d) => (
                                    <div key={d.id} className="flex items-center gap-2 text-sm p-2 bg-primary/5 rounded">
                                      <FileCheck className="h-3.5 w-3.5 text-primary" />
                                      <span>{d.title}</span>
                                    </div>
                                  ))}
                                </div>
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
        ))}
      </div>
    </div>
  );
};

export default AdminTemplates;
