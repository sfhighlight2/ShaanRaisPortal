import React from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileText, BarChart3 } from "lucide-react";

const steps = [
  {
    icon: BarChart3,
    title: "Track your progress",
    description: "See exactly where your project stands and what's coming next.",
  },
  {
    icon: CheckCircle,
    title: "Complete tasks",
    description: "Submit forms, upload files, and approve deliverables as needed.",
  },
  {
    icon: FileText,
    title: "Access everything",
    description: "Contracts, deliverables, updates, and resources in one place.",
  },
];

const Welcome: React.FC = () => {
  const { completeWelcome, user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-lg w-full text-center"
      >
        <div className="w-12 h-0.5 bg-primary mx-auto mb-8" />

        <h1 className="text-3xl md:text-4xl font-heading font-semibold text-foreground leading-tight">
          Welcome, {user?.firstName}
        </h1>
        <p className="text-muted-foreground mt-3 text-base leading-relaxed max-w-md mx-auto">
          This is your dedicated client portal. Everything you need to stay
          informed and engaged throughout your project is right here.
        </p>

        <div className="mt-10 space-y-4">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.15 }}
              className="flex items-start gap-4 text-left bg-card rounded-lg p-5 border border-border"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <step.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">{step.title}</p>
                <p className="text-muted-foreground text-sm mt-0.5">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-10"
        >
          <Button onClick={completeWelcome} size="lg" className="px-10 h-12 text-sm font-medium">
            Enter your portal
          </Button>
        </motion.div>

        <p className="text-xs text-muted-foreground mt-8">
          Shaan Rais Client Portal
        </p>
      </motion.div>
    </div>
  );
};

export default Welcome;
