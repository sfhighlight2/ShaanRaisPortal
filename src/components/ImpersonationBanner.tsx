import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useAuth } from "@/contexts/AuthContext";

export const ImpersonationBanner: React.FC = () => {
  const { isImpersonating, impersonatedClientName, impersonatedClientId, stopImpersonation } = useImpersonation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { clientId } = useParams();

  const isAdminOrManager = user?.role === "admin" || user?.role === "manager" || user?.role === "team_member";

  if (!isImpersonating || !isAdminOrManager) return null;

  const effectiveClientId = clientId || impersonatedClientId;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 bg-primary px-4 py-2 shadow-lg">
      <div className="flex items-center gap-3">
        <Eye className="h-4 w-4 text-primary-foreground shrink-0" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-primary-foreground">Viewing as client:</span>
          <span className="text-sm text-primary-foreground/90 font-medium">{impersonatedClientName}</span>
        </div>
        <span className="hidden sm:inline text-xs text-primary-foreground/60 bg-primary-foreground/10 rounded-full px-2 py-0.5">
          Actions taken here are on behalf of this client
        </span>
      </div>
      <div className="flex items-center gap-2">
        {/* Quick nav links within the client view */}
        <nav className="hidden md:flex items-center gap-1">
          {[
            { label: "Dashboard", path: "dashboard" },
            { label: "Tasks", path: "tasks" },
            { label: "Deliverables", path: "deliverables" },
            { label: "Documents", path: "documents" },
            { label: "Updates", path: "updates" },
          ].map(({ label, path }) => (
            <button
              key={path}
              onClick={() => navigate(`/admin/clients/${effectiveClientId}/view/${path}`)}
              className="text-xs text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 px-2 py-1 rounded-md transition-colors"
            >
              {label}
            </button>
          ))}
        </nav>
        {/* Back to admin view */}
        <Button
          size="sm"
          variant="secondary"
          className="gap-1.5 text-xs h-7"
          onClick={() => {
            stopImpersonation();
            if (effectiveClientId) {
              navigate(`/admin/clients/${effectiveClientId}`);
            } else {
              navigate("/admin/clients");
            }
          }}
        >
          <ArrowLeft className="h-3 w-3" />
          Exit Client View
        </Button>
      </div>
    </div>
  );
};
