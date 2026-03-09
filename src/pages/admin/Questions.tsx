import React, { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Send, Clock, CheckCircle, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockQuestions, mockClients, getUserById } from "@/lib/mock-data";

const AdminQuestions: React.FC = () => {
  const [activeTab, setActiveTab] = useState("open");
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [response, setResponse] = useState("");

  const openQuestions = mockQuestions.filter((q) => q.status === "open");
  const answeredQuestions = mockQuestions.filter((q) => q.status === "answered");

  const displayQuestions = activeTab === "open" ? openQuestions : answeredQuestions;

  const handleRespond = (questionId: string) => {
    // Mock response
    setResponse("");
    setSelectedQuestion(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-heading font-semibold text-foreground">Questions</h1>
        <p className="text-sm text-muted-foreground mt-1">Respond to client questions and inquiries.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-foreground">{mockQuestions.length}</p>
            <p className="text-xs text-muted-foreground">Total Questions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-warning">{openQuestions.length}</p>
            <p className="text-xs text-muted-foreground">Open</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-success">{answeredQuestions.length}</p>
            <p className="text-xs text-muted-foreground">Answered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-foreground">—</p>
            <p className="text-xs text-muted-foreground">Avg Response Time</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="open" className="gap-2">
            <Clock className="h-3.5 w-3.5" /> Open ({openQuestions.length})
          </TabsTrigger>
          <TabsTrigger value="answered" className="gap-2">
            <CheckCircle className="h-3.5 w-3.5" /> Answered ({answeredQuestions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {displayQuestions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {activeTab === "open" ? "No open questions — all caught up!" : "No answered questions yet."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {displayQuestions.map((question, i) => {
                const client = mockClients.find((c) => c.id === question.clientId);
                const responder = question.respondedBy ? getUserById(question.respondedBy) : null;
                const isExpanded = selectedQuestion === question.id;

                return (
                  <motion.div
                    key={question.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className={isExpanded ? "border-primary/30" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{question.subject}</p>
                              <p className="text-xs text-muted-foreground">
                                {client?.companyName} · {new Date(question.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge className={`text-[10px] ${question.status === "open" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                            {question.status}
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground mb-4">{question.message}</p>

                        {question.response && (
                          <div className="bg-muted/50 rounded-lg p-3 mb-4">
                            <p className="text-xs text-muted-foreground mb-1">Response</p>
                            <p className="text-sm">{question.response}</p>
                            {responder && (
                              <p className="text-xs text-muted-foreground mt-2">— {responder.firstName} {responder.lastName}</p>
                            )}
                          </div>
                        )}

                        {question.status === "open" && (
                          <>
                            {isExpanded ? (
                              <div className="space-y-3">
                                <Textarea
                                  placeholder="Type your response..."
                                  value={response}
                                  onChange={(e) => setResponse(e.target.value)}
                                  rows={3}
                                />
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" size="sm" onClick={() => setSelectedQuestion(null)}>Cancel</Button>
                                  <Button size="sm" className="gap-1.5" onClick={() => handleRespond(question.id)}>
                                    <Send className="h-3.5 w-3.5" /> Send Response
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button variant="outline" size="sm" onClick={() => setSelectedQuestion(question.id)}>
                                Respond
                              </Button>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminQuestions;
