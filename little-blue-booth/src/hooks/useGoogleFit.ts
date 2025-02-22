import { useState, useEffect } from "react";

interface GoogleFitData {
  steps: number;
  heartRate: number;
}

interface GoogleFitResponse {
  error?: string;
  bucket?: Array<{
    dataset: Array<{
      point: Array<{
        value: Array<{
          intVal?: number;
          fpVal?: number;
        }>;
      }>;
    }>;
  }>;
}

export function useGoogleFit() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<GoogleFitData | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkConnection() {
      try {
        // Get last 24 hours of data
        const response = await fetch("/api/google-fit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            timeRange: {
              startTime: Date.now() - 24 * 60 * 60 * 1000, // 24 hours ago
              endTime: Date.now(),
            },
          }),
        });

        const result = (await response.json()) as GoogleFitResponse;

        if (!isMounted) return;

        if (response.ok && !result.error) {
          setIsConnected(true);
          // Process the data
          const steps =
            result.bucket?.[0]?.dataset[0]?.point[0]?.value[0]?.intVal ?? 0;
          const heartRate =
            result.bucket?.[0]?.dataset[1]?.point[0]?.value[0]?.fpVal ?? 0;

          setData({
            steps,
            heartRate: Math.round(heartRate),
          });
        } else {
          setIsConnected(false);
          setData(null);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("Error checking Google Fit connection:", error);
        setIsConnected(false);
        setData(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void checkConnection();

    return () => {
      isMounted = false;
    };
  }, []);

  return { isConnected, isLoading, data };
}
