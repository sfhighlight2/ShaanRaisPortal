import React, { useState } from "react";
import { motion } from "framer-motion";
import { User, Building, Mail, Phone, Globe } from "lucide-react";
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
              <Badge variant="outline" className="capitalize">{client.status.replaceAll("_", " ")}</Badge>
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


    </div>
  );
};

export default ClientProfile;
