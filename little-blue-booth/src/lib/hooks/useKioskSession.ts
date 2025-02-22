import { useState, useEffect } from "react";
import { api } from "~/trpc/react";

interface UseKioskSessionProps {
  onSessionCreated?: () => void;
  onError?: (error: string) => void;
}

export function useKioskSession({
  onSessionCreated,
  onError,
}: UseKioskSessionProps = {}) {
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [kioskId, setKioskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get or create kiosk query
  const { data: kioskData } = api.kiosk.getOrCreateKiosk.useQuery(undefined, {
    retry: 2,
  });

  // Set kiosk ID when data is available
  useEffect(() => {
    if (kioskData?.id) {
      setKioskId(kioskData.id);
      setError(null);
    }
  }, [kioskData]);

  // Create session mutation
  const createSession = api.kiosk.createSession.useMutation({
    onSuccess: (session) => {
      setSessionId(session.id);
      setError(null);
      onSessionCreated?.();
    },
    onError: (error) => {
      const errorMessage = error.message || "Failed to create session";
      setError(errorMessage);
      onError?.(errorMessage);
    },
    onSettled: () => {
      setIsCreatingSession(false);
    },
  });

  const startSession = async (userId: string) => {
    try {
      setIsCreatingSession(true);
      setError(null);

      if (!userId) {
        throw new Error("User not authenticated");
      }

      if (!kioskId) {
        throw new Error("No kiosk available");
      }

      // Create a new session
      await createSession.mutateAsync({
        kioskId,
        userId,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to start consultation";
      setError(errorMessage);
      onError?.(errorMessage);
      setIsCreatingSession(false);
    }
  };

  const ensureSession = async (userId: string) => {
    if (sessionId) return sessionId;
    
    if (!userId) {
      throw new Error("User not authenticated");
    }

    if (!kioskId) {
      throw new Error("No kiosk available");
    }

    const session = await createSession.mutateAsync({
      kioskId,
      userId,
    });

    return session.id;
  };

  const clearSession = () => {
    setSessionId(null);
    setError(null);
  };

  return {
    startSession,
    clearSession,
    ensureSession,
    isCreatingSession,
    sessionId,
    kioskId,
    error,
  };
}
