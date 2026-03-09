import React from "react";
import { motion } from "framer-motion";
import { Bell, MessageSquare, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockClients, mockUpdates, getUserById } from "@/lib/mock-data";

const ClientUpdates: React.FC = () => {
  const client = mockClients[0];
  const updates = mockUpdates
    .filter((u) => u.clientId === client.id && u.visibleToClient)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-heading font-semibold text-foreground">Updates</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Stay informed about your project progress and team communications.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-foreground">{updates.length}</p>
            <p className="text-xs text-muted-foreground">Total Updates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-foreground">
              {updates.filter((u) => {
                const date = new Date(u.createdAt);
                const now = new Date();
                const diff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
                return diff <= 7;
              }).length}
            </p>
            <p className="text-xs text-muted-foreground">This Week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-foreground">
              {updates.length > 0 ? new Date(updates[0].createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Last Update</p>
          </CardContent>
        </Card>
      </div>

      {/* Updates Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">All Updates</CardTitle>
        </CardHeader>
        <CardContent>
          {updates.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No updates yet. Check back soon!</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

              <div className="space-y-6">
                {updates.map((update, i) => {
                  const author = getUserById(update.createdBy);
                  const date = new Date(update.createdAt);

                  return (
                    <motion.div
                      key={update.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="relative pl-10"
                    >
                      {/* Timeline dot */}
                      <div className="absolute left-0 top-1 h-8 w-8 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center">
                        <MessageSquare className="h-3.5 w-3.5 text-primary" />
                      </div>

                      <div className="bg-card rounded-lg border border-border p-4">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <h3 className="font-medium text-foreground">{update.title}</h3>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {update.body}
                        </p>
                        {author && (
                          <p className="text-xs text-muted-foreground mt-3">
                            — {author.firstName} {author.lastName}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientUpdates;
