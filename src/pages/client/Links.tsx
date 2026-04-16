import React from "react";
import { motion } from "framer-motion";
import { ExternalLink, FolderOpen, FileText, Video, Table2, Palette, Link2, Globe, Instagram, Twitter, Linkedin, Youtube, Facebook, Hash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useClientData } from "@/hooks/useClientData";
import type { LinkType } from "@/lib/types";

const linkTypeIcons: Record<LinkType, React.ElementType> = {
  folder: FolderOpen,
  document: FileText,
  video: Video,
  spreadsheet: Table2,
  design: Palette,
  other: Globe,
  website: Globe,
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin,
  tiktok: Hash,
  youtube: Youtube,
};

const linkTypeLabels: Record<LinkType, string> = {
  folder: "Folder",
  document: "Document",
  video: "Video",
  spreadsheet: "Spreadsheet",
  design: "Design",
  other: "Link",
  website: "Website",
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "Twitter / X",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
};

const linkTypeColors: Record<LinkType, string> = {
  folder: "bg-warning/10 text-warning",
  document: "bg-primary/10 text-primary",
  video: "bg-destructive/10 text-destructive",
  spreadsheet: "bg-success/10 text-success",
  design: "bg-violet-500/10 text-violet-600",
  other: "bg-muted text-muted-foreground",
  website: "bg-sky-500/10 text-sky-600",
  instagram: "bg-pink-500/10 text-pink-600",
  facebook: "bg-blue-600/10 text-blue-600",
  twitter: "bg-sky-400/10 text-sky-500",
  linkedin: "bg-blue-700/10 text-blue-700",
  tiktok: "bg-neutral-800/10 text-neutral-600",
  youtube: "bg-red-500/10 text-red-600",
};

const ClientLinks: React.FC = () => {
  const { client, links, loading } = useClientData();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!client) return null;

  // Group links by type
  const groupedLinks = links.reduce((acc, link) => {
    const type = link.linkType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(link);
    return acc;
  }, {} as Record<string, typeof links>);

  const typeOrder: LinkType[] = ["folder", "document", "video", "spreadsheet", "design", "website", "instagram", "facebook", "twitter", "linkedin", "tiktok", "youtube", "other"];
  const sortedGroups = typeOrder.filter(t => groupedLinks[t]?.length);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-heading font-semibold text-foreground">Links</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Quick access to all your project folders, documents, videos, and resources.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-foreground">{links.length}</p>
            <p className="text-xs text-muted-foreground">Total Links</p>
          </CardContent>
        </Card>
        {sortedGroups.slice(0, 3).map(type => (
          <Card key={type}>
            <CardContent className="p-4">
              <p className="text-2xl font-semibold text-foreground">{groupedLinks[type].length}</p>
              <p className="text-xs text-muted-foreground">{linkTypeLabels[type]}s</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Links by group */}
      {links.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                <Link2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">No links yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your team will add links to folders, documents, and resources here.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        sortedGroups.map(type => {
          const Icon = linkTypeIcons[type];
          const typeLinks = groupedLinks[type];
          return (
            <Card key={type}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {linkTypeLabels[type]}s
                  <Badge variant="outline" className="text-[10px] ml-1">{typeLinks.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {typeLinks.map((link, i) => {
                    const LinkIcon = linkTypeIcons[link.linkType];
                    return (
                      <motion.a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer group"
                      >
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${linkTypeColors[link.linkType]}`}>
                          <LinkIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm group-hover:text-primary transition-colors truncate">
                            {link.title}
                          </p>
                          {link.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{link.description}</p>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 gap-1.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                          Open <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </motion.a>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default ClientLinks;
