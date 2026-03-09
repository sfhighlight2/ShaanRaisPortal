import React, { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address");
      return;
    }
    const success = login(email, password);
    if (!success) setError("Invalid credentials");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branded panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[hsl(0,0%,6%)] relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, hsl(37,45%,49%) 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-md"
        >
          <h1 className="text-4xl md:text-5xl font-display font-semibold text-[hsl(40,10%,90%)] leading-tight">
            Shaan Rais
          </h1>
          <div className="w-12 h-0.5 bg-[hsl(37,45%,49%)] mt-4 mb-6" />
          <p className="text-lg text-[hsl(0,0%,50%)] leading-relaxed">
            Your dedicated client portal. Track progress, access deliverables, and stay connected with your team.
          </p>
          <p className="text-sm text-[hsl(0,0%,35%)] mt-8">
            Scale with clarity and confidence.
          </p>
        </motion.div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-sm"
        >
          <div className="lg:hidden mb-8">
            <h1 className="text-2xl font-display font-semibold text-foreground">Shaan Rais</h1>
            <p className="text-sm text-muted-foreground mt-1">Client Portal</p>
          </div>

          <h2 className="text-2xl font-serif font-semibold text-foreground">
            Welcome back
          </h2>
          <p className="text-sm text-muted-foreground mt-2 mb-8">
            Sign in to access your portal
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Email
              </label>
              <Input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                className="h-11"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                className="h-11"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full h-11 text-sm font-medium">
              Sign in
            </Button>
          </form>

          <p className="text-xs text-muted-foreground mt-6 text-center">
            Forgot your password?{" "}
            <button className="text-primary hover:underline">Reset it here</button>
          </p>

          {/* Dev helper */}
          <div className="mt-10 pt-6 border-t border-border">
            <p className="text-[11px] text-muted-foreground mb-2">Quick login (dev only):</p>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: "Client", email: "david@thorntongroup.com" },
                { label: "Admin", email: "sarah@shaanrais.com" },
                { label: "Manager", email: "james@shaanrais.com" },
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => login(opt.email, "demo")}
                  className="text-[11px] px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
