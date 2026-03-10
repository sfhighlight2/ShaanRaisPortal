import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
    ExternalLink, FileText, Video, Link2, File, Search,
    BookOpen, FolderOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { mockResources } from "@/lib/mock-data";
import type { Resource, ResourceType } from "@/lib/types";

const typeIcons: Record<ResourceType, React.ElementType> = {
    link: Link2,
    pdf: FileText,
    video: Video,
    gdoc: FileText,
    file: File,
};

const typeLabels: Record<ResourceType, string> = {
    link: "Link",
    pdf: "PDF",
    video: "Video",
    gdoc: "Google Doc",
    file: "File",
};

const typeColors: Record<ResourceType, string> = {
    link: "bg-blue-500/10 text-blue-600",
    pdf: "bg-red-500/10 text-red-600",
    video: "bg-purple-500/10 text-purple-600",
    gdoc: "bg-emerald-500/10 text-emerald-600",
    file: "bg-amber-500/10 text-amber-600",
};

const ManagerResources: React.FC = () => {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");

    // Filter resources visible to current user's role and by search
    const visibleResources = useMemo(() => {
        let resources = mockResources.filter((r) =>
            user ? r.visibleToRole.includes(user.role) : false
        );
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            resources = resources.filter(
                (r) =>
                    r.title.toLowerCase().includes(q) ||
                    r.description?.toLowerCase().includes(q) ||
                    r.category.toLowerCase().includes(q)
            );
        }
        return resources.sort((a, b) => a.displayOrder - b.displayOrder);
    }, [user, searchQuery]);

    // Group by category
    const categories = useMemo(() => {
        const catMap = new Map<string, Resource[]>();
        for (const r of visibleResources) {
            const arr = catMap.get(r.category) || [];
            arr.push(r);
            catMap.set(r.category, arr);
        }
        return Array.from(catMap.entries());
    }, [visibleResources]);

    const getResourceUrl = (resource: Resource) => resource.url || resource.filePath || "#";

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-heading font-semibold text-foreground">Resources</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Access training materials, SOPs, and important company documents.
                    </p>
                </div>
                <div className="relative w-full sm:w-[260px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search resources..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9"
                    />
                </div>
            </div>

            {/* Categories */}
            {categories.length === 0 && (
                <Card>
                    <CardContent className="p-12 text-center">
                        <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">No resources found.</p>
                    </CardContent>
                </Card>
            )}

            {categories.map(([category, resources], catIdx) => (
                <motion.div
                    key={category}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + catIdx * 0.06 }}
                >
                    <div className="mb-3 flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <h2 className="text-sm font-medium text-foreground uppercase tracking-wide">{category}</h2>
                        <Badge variant="outline" className="text-[10px]">{resources.length}</Badge>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {resources.map((resource, rIdx) => {
                            const Icon = typeIcons[resource.type];
                            return (
                                <motion.div
                                    key={resource.id}
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.08 + rIdx * 0.03 }}
                                >
                                    <Card className="group hover:shadow-md transition-shadow h-full">
                                        <CardContent className="p-4 flex flex-col h-full">
                                            <div className="flex items-start gap-3 flex-1">
                                                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${typeColors[resource.type]}`}>
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-foreground truncate">{resource.title}</p>
                                                    {resource.description && (
                                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                            {resource.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                                                <Badge className={`text-[10px] ${typeColors[resource.type]}`}>
                                                    {typeLabels[resource.type]}
                                                </Badge>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    asChild
                                                >
                                                    <a href={getResourceUrl(resource)} target="_blank" rel="noopener noreferrer">
                                                        Open <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

export default ManagerResources;
