import React from "react";
import { motion } from "framer-motion";
import { FileText, Download, Eye, ExternalLink, FolderOpen, File, FileCheck, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useClientData } from "@/hooks/useClientData";

const documentTypeIcons: Record<string, React.ElementType> = {
  contract: FileCheck,
  sow: FileText,
  agreement: File,
  other: File,
};

const documentTypeLabels: Record<string, string> = {
  contract: "Contract",
  sow: "Statement of Work",
  agreement: "Agreement",
  other: "Document",
};

const ClientDocuments: React.FC = () => {
  const { toast } = useToast();
  const { client, documents, loading } = useClientData();

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

  const contracts = documents.filter((d) => d.documentType === "contract");
  const sows = documents.filter((d) => d.documentType === "sow");
  const agreements = documents.filter((d) => d.documentType === "agreement");

  const handleView = (title: string) => {
    toast({ title: "Opening Preview", description: `Viewing "${title}" — file preview will be available once connected to storage.` });
  };

  const handleDownload = (title: string) => {
    toast({ title: "Download Started", description: `Downloading "${title}" — file downloads will be available once connected to storage.` });
  };

  const handleOpenDrive = () => {
    if (client.googleDriveUrl) {
      window.open(client.googleDriveUrl, "_blank", "noopener,noreferrer");
    } else {
      toast({ title: "Drive Not Available", description: "Google Drive folder has not been set up yet." });
    }
  };

  const handleOpenAirtable = () => {
    if (client.airtableUrl) {
      window.open(client.airtableUrl, "_blank", "noopener,noreferrer");
    } else {
      toast({ title: "Airtable Not Available", description: "Airtable link has not been set up yet." });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-heading font-semibold text-foreground">Documents</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Access your contracts, agreements, and important project documents.
        </p>
      </div>

      {/* Project Links */}
      {(client.googleDriveUrl || client.airtableUrl) && (
        <Card className="bg-primary/[0.03] border-primary/20">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Project Links</p>
                <p className="text-sm text-muted-foreground">Access your complete project files and records</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {client.googleDriveUrl && (
                <Button onClick={handleOpenDrive} className="gap-2">
                  Open Drive <ExternalLink className="h-4 w-4" />
                </Button>
              )}
              {client.airtableUrl && (
                <Button onClick={handleOpenAirtable} variant="outline" className="gap-2 bg-background border-primary text-primary hover:bg-primary/5">
                  Open Airtable <Database className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-foreground">{documents.length}</p>
            <p className="text-xs text-muted-foreground">Total Documents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-foreground">{contracts.length}</p>
            <p className="text-xs text-muted-foreground">Contracts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-foreground">{sows.length}</p>
            <p className="text-xs text-muted-foreground">Statements of Work</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-foreground">{agreements.length}</p>
            <p className="text-xs text-muted-foreground">Agreements</p>
          </CardContent>
        </Card>
      </div>

      {/* Documents List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">All Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No documents available yet.</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc, i) => {
                const Icon = documentTypeIcons[doc.documentType] || File;
                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer"
                    onClick={() => handleView(doc.title)}
                  >
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{doc.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">
                          {documentTypeLabels[doc.documentType]}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          Uploaded {new Date(doc.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={(e) => { e.stopPropagation(); handleView(doc.title); }}>
                        <Eye className="h-3.5 w-3.5" /> View
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={(e) => { e.stopPropagation(); handleDownload(doc.title); }}>
                        <Download className="h-3.5 w-3.5" /> Download
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientDocuments;
