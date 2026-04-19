import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import logoImg from "@/assets/shaan-rais-logo.png";

const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address");
      return;
    }
    setSubmitting(true);
    const success = await login(email, password);
    setSubmitting(false);
    if (!success) setError("Invalid email or password");
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Enter your email address above first");
      return;
    }
    if (!isSupabaseConfigured) return;
    setResetSubmitting(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setResetSubmitting(false);
    setResetSent(true);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branded panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1f2a3a] relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, hsl(37,45%,49%) 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }} />
        <div className="animate-fade-in relative z-10 flex flex-col items-center text-center max-w-md">
          <img src={logoImg} alt="Shaan Rais Media" className="h-56 w-auto mb-8" width={224} height={224} />
          <div className="w-12 h-0.5 bg-[hsl(37,45%,49%)] mb-6" />
          <p className="text-lg text-[hsl(0,0%,50%)] leading-relaxed">
            Your dedicated client portal. Track progress, access deliverables, and stay connected with your team.
          </p>
          <p className="text-sm text-[hsl(0,0%,35%)] mt-8">
            Scale with clarity and confidence.
          </p>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div
          className="animate-fade-in w-full max-w-sm"
          style={{ animationDelay: "100ms", animationFillMode: "both" }}
        >
          <div className="lg:hidden mb-8 flex flex-col items-center">
            <img src={logoImg} alt="Shaan Rais Media" className="h-28 w-auto mb-2" width={112} height={112} />
            <p className="text-sm text-muted-foreground">Client Portal</p>
          </div>

          {resetSent ? (
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-heading font-semibold text-foreground">Check your email</h2>
              <p className="text-sm text-muted-foreground">
                We sent a password reset link to <strong>{email}</strong>.
              </p>
              <button
                className="text-sm text-primary hover:underline mt-4 block mx-auto"
                onClick={() => { setResetSent(false); setResetMode(false); }}
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-heading font-semibold text-foreground">
                {resetMode ? "Reset password" : "Welcome back"}
              </h2>
              <p className="text-sm text-muted-foreground mt-2 mb-8">
                {resetMode ? "Enter your email and we'll send a reset link" : "Sign in to access your portal"}
              </p>

              <form onSubmit={resetMode ? handleReset : handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                  <Input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    className="h-11"
                  />
                </div>
                {!resetMode && (
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      className="h-11"
                    />
                  </div>
                )}

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button
                  type="submit"
                  className="w-full h-11 text-sm font-medium"
                  disabled={submitting || resetSubmitting}
                >
                  {resetMode
                    ? (resetSubmitting ? "Sending…" : "Send reset link")
                    : (submitting ? "Signing in…" : "Sign in")}
                </Button>
              </form>

              <p className="text-xs text-muted-foreground mt-6 text-center">
                {resetMode ? (
                  <button className="text-primary hover:underline" onClick={() => { setResetMode(false); setError(""); }}>
                    Back to sign in
                  </button>
                ) : (
                  <>
                    Forgot your password?{" "}
                    <button className="text-primary hover:underline" onClick={() => { setResetMode(true); setError(""); }}>
                      Reset it here
                    </button>
                  </>
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
