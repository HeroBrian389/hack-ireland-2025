import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import type { GoogleFitData } from "~/services/googleFitService";

interface UseGoogleFitReturn {
  isConnected: boolean;
  isLoading: boolean;
  data: GoogleFitData | null;
  error: string | null;
}

export function useGoogleFit(): UseGoogleFitReturn {
  const { userId } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<GoogleFitData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      if (!userId) {
        setIsConnected(false);
        setData(null);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/google-fit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const result = await response.json();

        if (!isMounted) return;

        if (response.ok) {
          setIsConnected(true);
          setData(result);
          setError(null);
        } else {
          setIsConnected(false);
          setData(null);
          setError(result.error || "Failed to fetch Google Fit data");
        }
      } catch (err) {
        if (!isMounted) return;
        setIsConnected(false);
        setData(null);
        setError("Failed to fetch Google Fit data");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void fetchData();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  return { isConnected, isLoading, data, error };
}
