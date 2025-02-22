import { useState, useEffect } from "react";

interface GoogleFitData {
  steps: {
    weekly: number;
    daily: number;
  };
  sleep: {
    monthly: Array<{
      startTime: string;
      endTime: string;
      duration: number; // in minutes
      sleepStages?: {
        light?: number;
        deep?: number;
        rem?: number;
        awake?: number;
      };
    }>;
  };
  heartRate: {
    current: number;
    daily: {
      min: number;
      max: number;
      average: number;
    };
  };
  calories: {
    daily: number;
    weekly: number;
  };
  activity: {
    daily: {
      sedentary: number; // minutes
      light: number; // minutes
      moderate: number; // minutes
      vigorous: number; // minutes
    };
  };
}

interface GoogleFitResponse {
  error?: string;
  bucket?: Array<{
    startTimeMillis?: string;
    endTimeMillis?: string;
    dataset: Array<{
      point: Array<{
        startTimeNanos?: string;
        endTimeNanos?: string;
        value: Array<{
          intVal?: number;
          fpVal?: number;
          mapVal?: Array<{
            key: string;
            value: {
              intVal?: number;
              fpVal?: number;
            };
          }>;
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

    async function fetchHealthData() {
      try {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        const oneWeek = 7 * oneDay;
        const oneMonth = 30 * oneDay;

        // Fetch different time ranges in parallel
        const [dailyResponse, weeklyResponse, monthlyResponse] =
          await Promise.all([
            // Daily data (last 24 hours)
            fetch("/api/google-fit", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                timeRange: {
                  startTime: now - oneDay,
                  endTime: now,
                },
                dataTypes: ["steps", "heartRate", "calories", "activity"],
              }),
            }),
            // Weekly data (last 7 days)
            fetch("/api/google-fit", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                timeRange: {
                  startTime: now - oneWeek,
                  endTime: now,
                },
                dataTypes: ["steps", "calories"],
              }),
            }),
            // Monthly data (last 30 days)
            fetch("/api/google-fit", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                timeRange: {
                  startTime: now - oneMonth,
                  endTime: now,
                },
                dataTypes: ["sleep"],
              }),
            }),
          ]);

        const [dailyData, weeklyData, monthlyData] = (await Promise.all([
          dailyResponse.json(),
          weeklyResponse.json(),
          monthlyResponse.json(),
        ])) as [GoogleFitResponse, GoogleFitResponse, GoogleFitResponse];

        if (!isMounted) return;

        if (
          dailyResponse.ok &&
          weeklyResponse.ok &&
          monthlyResponse.ok &&
          !dailyData.error &&
          !weeklyData.error &&
          !monthlyData.error
        ) {
          setIsConnected(true);

          // Process the data
          const processedData: GoogleFitData = {
            steps: {
              daily:
                dailyData.bucket?.[0]?.dataset[0]?.point[0]?.value[0]?.intVal ??
                0,
              weekly:
                weeklyData.bucket?.[0]?.dataset[0]?.point[0]?.value[0]
                  ?.intVal ?? 0,
            },
            sleep: {
              monthly:
                monthlyData.bucket?.map((bucket) => ({
                  startTime: bucket.startTimeMillis ?? "",
                  endTime: bucket.endTimeMillis ?? "",
                  duration: calculateDuration(
                    bucket.startTimeMillis,
                    bucket.endTimeMillis,
                  ),
                  sleepStages: processSleepStages(
                    bucket.dataset[0]?.point[0]?.value[0]?.mapVal,
                  ),
                })) ?? [],
            },
            heartRate: {
              current: Math.round(
                dailyData.bucket?.[0]?.dataset[1]?.point[0]?.value[0]?.fpVal ??
                  0,
              ),
              daily: {
                min: Math.round(
                  dailyData.bucket?.[0]?.dataset[1]?.point[0]?.value[1]
                    ?.fpVal ?? 0,
                ),
                max: Math.round(
                  dailyData.bucket?.[0]?.dataset[1]?.point[0]?.value[2]
                    ?.fpVal ?? 0,
                ),
                average: Math.round(
                  dailyData.bucket?.[0]?.dataset[1]?.point[0]?.value[3]
                    ?.fpVal ?? 0,
                ),
              },
            },
            calories: {
              daily: Math.round(
                dailyData.bucket?.[0]?.dataset[2]?.point[0]?.value[0]?.fpVal ??
                  0,
              ),
              weekly: Math.round(
                weeklyData.bucket?.[0]?.dataset[1]?.point[0]?.value[0]?.fpVal ??
                  0,
              ),
            },
            activity: {
              daily: {
                sedentary: Math.round(
                  dailyData.bucket?.[0]?.dataset[3]?.point[0]?.value[0]
                    ?.intVal ?? 0,
                ),
                light: Math.round(
                  dailyData.bucket?.[0]?.dataset[3]?.point[0]?.value[1]
                    ?.intVal ?? 0,
                ),
                moderate: Math.round(
                  dailyData.bucket?.[0]?.dataset[3]?.point[0]?.value[2]
                    ?.intVal ?? 0,
                ),
                vigorous: Math.round(
                  dailyData.bucket?.[0]?.dataset[3]?.point[0]?.value[3]
                    ?.intVal ?? 0,
                ),
              },
            },
          };

          setData(processedData);
        } else {
          setIsConnected(false);
          setData(null);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("Error fetching Google Fit data:", error);
        setIsConnected(false);
        setData(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void fetchHealthData();

    return () => {
      isMounted = false;
    };
  }, []);

  return { isConnected, isLoading, data };
}

function calculateDuration(startTime?: string, endTime?: string): number {
  if (!startTime || !endTime) return 0;
  return Math.round((parseInt(endTime) - parseInt(startTime)) / (60 * 1000)); // Convert to minutes
}

function processSleepStages(
  mapVal?: Array<{ key: string; value: { intVal?: number } }>,
) {
  if (!mapVal) return undefined;

  type SleepStages = {
    light_sleep?: number;
    deep_sleep?: number;
    rem_sleep?: number;
    awake?: number;
  };

  const stages = mapVal.reduce<SleepStages>((acc, item) => {
    if (item.value.intVal !== undefined) {
      acc[item.key as keyof SleepStages] = item.value.intVal;
    }
    return acc;
  }, {});

  return {
    light: stages.light_sleep,
    deep: stages.deep_sleep,
    rem: stages.rem_sleep,
    awake: stages.awake,
  };
}
