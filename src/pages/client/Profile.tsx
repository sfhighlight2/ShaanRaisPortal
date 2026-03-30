import React, { useState } from "react";
import { motion } from "framer-motion";
import { User, Building, Mail, Phone, Globe, MessageSquare, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useClientData } from "@/hooks/useClientData";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const ClientProfile: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { client, project, accountManager, loading, refetch } = useClientData();

  const [questionSubject, setQuestionSubject] = useState("");
  const [questionMessage, setQuestionMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!client) {
    return null;
  }

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionSubject || !questionMessage || !isSupabaseConfigured) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("questions").insert({
        client_id: client.id,
        project_id: project?.id || null,
        subject: questionSubject,
        message: questionMessage,
        status: "open",
        created_at: new Date().toISOString()
      });

      if (error) throw error;

      setSubmitted(true);
      setQuestionSubject("");
      setQuestionMessage("");
      
      // Refresh the data so it shows up in their dashboard/updates if applicable
      refetch();

      setTimeout(() => setSubmitted(false), 3000);
    } catch (err: any) {
      console.error("Error submitting question:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to submit your question. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-heading font-semibold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your account information and contact options.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Your Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <User className="h-4 w-4" /> Your Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xl font-medium text-primary">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
              <div>
                <p className="text-lg font-medium text-foreground">{user?.firstName} {user?.lastName}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Building className="h-4 w-4" /> Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Company</p>
              <p className="font-medium text-foreground">{client.companyName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Primary Contact</p>
              <p className="text-sm text-foreground">{client.primaryContactName}</p>
              <p className="text-sm text-muted-foreground">{client.primaryContactEmail}</p>
            </div>
            {client.phone && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Phone</p>
                <p className="text-sm text-foreground">{client.phone}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
              <Badge variant="outline" className="capitalize">{client.status.replace("_", " ")}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Your Account Manager */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Your Business Consultant</CardTitle>
          </CardHeader>
          <CardContent>
            {accountManager ? (
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-sm font-medium text-foreground">
                    {accountManager.firstName[0]}{accountManager.lastName[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-foreground">{accountManager.firstName} {accountManager.lastName}</p>
                  <p className="text-sm text-muted-foreground">{accountManager.email}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No business consultant assigned.</p>
            )}
          </CardContent>
        </Card>

        {/* Current Package */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Current Package</CardTitle>
          </CardHeader>
          <CardContent>
            {project ? (
              <div>
                <p className="font-medium text-foreground">{project.projectName}</p>
                {project.description && (
                  <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                )}
                <Badge variant="outline" className="mt-3 capitalize">{project.status}</Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active project.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ask a Question */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Ask a Question
          </CardTitle>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 text-center"
            >
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                <Send className="h-5 w-5 text-success" />
              </div>
              <p className="text-foreground font-medium">Question submitted!</p>
              <p className="text-sm text-muted-foreground mt-1">We'll get back to you as soon as possible.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmitQuestion} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Subject</label>
                <Input
                  placeholder="What's your question about?"
                  value={questionSubject}
                  onChange={(e) => setQuestionSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Message</label>
                <Textarea
                  placeholder="Describe your question in detail..."
                  rows={4}
                  value={questionMessage}
                  onChange={(e) => setQuestionMessage(e.target.value)}
                />
              </div>
              <Button type="submit" className="gap-2" disabled={!questionSubject || !questionMessage || isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Submitting...
                  </span>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Submit Question
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientProfile;
