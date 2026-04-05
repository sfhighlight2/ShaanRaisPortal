import React, { createContext, useContext, useState, useCallback } from "react";

interface ImpersonationContextType {
  impersonatedClientId: string | null;
  impersonatedClientName: string | null;
  startImpersonation: (clientId: string, clientName: string) => void;
  stopImpersonation: () => void;
  isImpersonating: boolean;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export const ImpersonationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [impersonatedClientId, setImpersonatedClientId] = useState<string | null>(null);
  const [impersonatedClientName, setImpersonatedClientName] = useState<string | null>(null);

  const startImpersonation = useCallback((clientId: string, clientName: string) => {
    setImpersonatedClientId(clientId);
    setImpersonatedClientName(clientName);
  }, []);

  const stopImpersonation = useCallback(() => {
    setImpersonatedClientId(null);
    setImpersonatedClientName(null);
  }, []);

  return (
    <ImpersonationContext.Provider
      value={{
        impersonatedClientId,
        impersonatedClientName,
        startImpersonation,
        stopImpersonation,
        isImpersonating: !!impersonatedClientId,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
};

export const useImpersonation = () => {
  const ctx = useContext(ImpersonationContext);
  if (!ctx) throw new Error("useImpersonation must be used within ImpersonationProvider");
  return ctx;
};
