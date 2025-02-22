import { useState } from "react";
import { api } from "~/trpc/react";
import { v4 as uuidv4 } from "uuid";

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
  const [error, setError] = useState<string | null>(null);

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

      // Generate a kiosk ID (in a real app, this would come from the kiosk itself)
      const kioskId = uuidv4();

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

  const clearSession = () => {
    setSessionId(null);
    setError(null);
  };

  return {
    startSession,
    clearSession,
    isCreatingSession,
    sessionId,
    error,
  };
}
