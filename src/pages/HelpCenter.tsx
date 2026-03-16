import React from "react";
import { 
  HelpCircle, Book, MessageCircle, FileText, 
  Settings, Users, CheckSquare, BarChart3, 
  ArrowRight, GraduationCap, LifeBuoy, Info
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const HelpCenter = () => {
  const { user } = useAuth();
  const role = user?.role || "client";

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="container py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Help Center</h1>
        <p className="text-muted-foreground">
          Welcome to the Shaan Rais Portal Help Center. Find answers and learn how to use the platform.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="pb-2">
            <LifeBuoy className="h-5 w-5 text-primary mb-2" />
            <CardTitle className="text-lg">Quick Start</CardTitle>
            <CardDescription>Get up and running in minutes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="link" className="p-0 h-auto text-primary px-0 font-medium">
              View Guide <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
        
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="pb-2">
            <Book className="h-5 w-5 text-primary mb-2" />
            <CardTitle className="text-lg">Documentation</CardTitle>
            <CardDescription>Detailed guides on every feature.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="link" className="p-0 h-auto text-primary px-0 font-medium">
              Browse Docs <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="pb-2">
            <MessageCircle className="h-5 w-5 text-primary mb-2" />
            <CardTitle className="text-lg">Contact Support</CardTitle>
            <CardDescription>Need more help? Our team is here.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="link" className="p-0 h-auto text-primary px-0 font-medium">
              Get in Touch <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-background border">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="faq">FAQs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            <motion.div variants={item} className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                System Overview
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                The Shaan Rais Client Portal is your centralized hub for project management, 
                delivery, and communication. It's designed to provide total transparency 
                into your branding and coaching journey.
              </p>
              
              <div className="space-y-4 pt-4">
                <h3 className="font-medium">What's New in Version 2.0</h3>
                <ul className="space-y-2 list-disc pl-5 text-sm text-muted-foreground">
                  <li>Integrated client onboarding workflow</li>
                  <li>Real-time task tracking and approvals</li>
                  <li>Centralized document repository</li>
                  <li>Resource library for premium educational content</li>
                </ul>
              </div>
            </motion.div>

            <motion.div variants={item} className="rounded-lg border bg-card p-6 border-dashed">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Understanding Your Role
              </h3>
              <div className="space-y-4">
                {role === "admin" && (
                  <div className="bg-primary/5 p-4 rounded-md border border-primary/10">
                    <p className="text-sm font-semibold text-primary mb-1">Administrator Access</p>
                    <p className="text-xs text-muted-foreground">
                      You have full control over the system. This includes managing clients, 
                      configuring service templates, assigning managers, and overseeing all 
                      platform activity.
                    </p>
                  </div>
                )}
                {role === "manager" && (
                  <div className="bg-primary/5 p-4 rounded-md border border-primary/10">
                    <p className="text-sm font-semibold text-primary mb-1">Manager Access</p>
                    <p className="text-xs text-muted-foreground">
                      You are responsible for client success. You can track progress, 
                      approve deliverables, and guide clients through their onboarding 
                      and project phases.
                    </p>
                  </div>
                )}
                {role === "client" && (
                  <div className="bg-primary/5 p-4 rounded-md border border-primary/10">
                    <p className="text-sm font-semibold text-primary mb-1">Client Access</p>
                    <p className="text-xs text-muted-foreground">
                      You can view your project timeline, complete onboarding tasks, 
                      upload deliverables, and access the resource library specifically 
                      curated for your package.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </TabsContent>

        <TabsContent value="features">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<LayoutDashboard className="h-5 w-5" />}
              title="Dashboard"
              description="A bird's eye view of all activities, pending tasks, and recent updates."
            />
            <FeatureCard 
              icon={<CheckSquare className="h-5 w-5" />}
              title="Project Roadmap"
              description="Chronological phases showing exactly where you are in the journey."
            />
            <FeatureCard 
              icon={<FileText className="h-5 w-5" />}
              title="Document Center"
              description="Secure access to contracts, strategy documents, and deliverables."
            />
            {role !== "client" && (
              <FeatureCard 
                icon={<Settings className="h-5 w-5" />}
                title="Management"
                description="Tools to configure packages, phases, and global system settings."
              />
            )}
            <FeatureCard 
              icon={<BookOpen className="h-5 w-5" />}
              title="Resource Library"
              description="Curated videos, PDFs, and links to accelerate your growth."
            />
            <FeatureCard 
              icon={<Users className="h-5 w-5" />}
              title="Team View"
              description="Know exactly who is working on your project and how to reach them."
            />
          </div>
        </TabsContent>

        <TabsContent value="faq">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>Find quick answers to common questions about using the portal.</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>How do I reset my password?</AccordionTrigger>
                  <AccordionContent>
                    You can reset your password from the login screen by clicking "Forgot password". 
                    An email with instructions will be sent to your registered address.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>Where can I find my signed contracts?</AccordionTrigger>
                  <AccordionContent>
                    All contracts and formal agreements are stored in the "Documents" tab. 
                    They are organized by date and visible to authorized team members.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>How do I complete a task?</AccordionTrigger>
                  <AccordionContent>
                    Navigate to your dashboard or the tasks page. Click on a pending task, 
                    and follow the instructions. Some tasks require a simple confirmation, 
                    while others might ask for a file upload or form submission.
                  </AccordionContent>
                </AccordionItem>
                {role !== "client" && (
                  <AccordionItem value="item-4">
                    <AccordionTrigger>How do I create a new service template?</AccordionTrigger>
                    <AccordionContent>
                      Admins can create templates in the "Templates" tab. You can define phases, 
                      tasks, and deliverables that will serve as the blueprint for new client projects.
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <Card className="hover:border-primary/50 transition-colors">
    <CardHeader className="pb-3">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
        {icon}
      </div>
      <CardTitle className="text-base">{title}</CardTitle>
      <CardDescription className="text-xs leading-relaxed">
        {description}
      </CardDescription>
    </CardHeader>
  </Card>
);

const LayoutDashboard = ({ className }: { className?: string }) => <BarChart3 className={className} />;
const BookOpen = ({ className }: { className?: string }) => <Book className={className} />;

export default HelpCenter;
