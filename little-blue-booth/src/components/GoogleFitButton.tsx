import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useGoogleFit } from "~/hooks/useGoogleFit";

interface GoogleFitResponse {
  authUrl: string;
}

export function GoogleFitButton() {
  const [isConnecting, setIsConnecting] = useState(false);
  const searchParams = useSearchParams();
  const { isConnected, isLoading, data } = useGoogleFit();

  // Check for success or error params in URL
  const success = searchParams.get("success") === "true";
  const error = searchParams.get("error");

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      const response = await fetch("/api/google-fit");
      const data = (await response.json()) as GoogleFitResponse;

      // Redirect to Google's OAuth consent screen
      window.location.href = data.authUrl;
    } catch (error) {
      console.error("Failed to initiate Google Fit connection:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  // Show success message if just connected
  if (success) {
    return (
      <div className="flex items-center gap-2 text-green-400">
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span>Successfully connected to Google Fit!</span>
      </div>
    );
  }

  // Show error message if connection failed
  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-400">
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
        <span>Failed to connect to Google Fit. Please try again.</span>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-blue-400">
        <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span>Checking connection...</span>
      </div>
    );
  }

  // Show connected state with data
  if (isConnected && data) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-green-400">
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>Connected to Google Fit</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Activity Metrics */}
          <div className="rounded-lg bg-gray-800/50 p-4">
            <h3 className="mb-3 font-medium text-gray-300">Activity</h3>
            <div className="grid gap-3">
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-400">Steps</span>
                  <div className="text-white">
                    <span className="font-medium">
                      {data.steps.daily.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-400"> today</span>
                    <br />
                    <span className="font-medium">
                      {data.steps.weekly.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-400"> this week</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-orange-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-400">
                    Activity Minutes
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium text-green-400">
                        {data.activity.daily.vigorous}
                      </span>
                      <span className="text-gray-400"> vigorous</span>
                    </div>
                    <div>
                      <span className="font-medium text-yellow-400">
                        {data.activity.daily.moderate}
                      </span>
                      <span className="text-gray-400"> moderate</span>
                    </div>
                    <div>
                      <span className="font-medium text-blue-400">
                        {data.activity.daily.light}
                      </span>
                      <span className="text-gray-400"> light</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-400">
                        {data.activity.daily.sedentary}
                      </span>
                      <span className="text-gray-400"> sedentary</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Health Metrics */}
          <div className="rounded-lg bg-gray-800/50 p-4">
            <h3 className="mb-3 font-medium text-gray-300">Health</h3>
            <div className="grid gap-3">
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-400">Heart Rate</span>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium text-white">
                        {data.heartRate.current}
                      </span>
                      <span className="text-gray-400"> current</span>
                    </div>
                    <div>
                      <span className="font-medium text-white">
                        {data.heartRate.daily.average}
                      </span>
                      <span className="text-gray-400"> avg</span>
                    </div>
                    <div>
                      <span className="font-medium text-green-400">
                        {data.heartRate.daily.min}
                      </span>
                      <span className="text-gray-400"> min</span>
                    </div>
                    <div>
                      <span className="font-medium text-red-400">
                        {data.heartRate.daily.max}
                      </span>
                      <span className="text-gray-400"> max</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-400">Calories</span>
                  <div className="text-white">
                    <span className="font-medium">
                      {data.calories.daily.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-400"> today</span>
                    <br />
                    <span className="font-medium">
                      {data.calories.weekly.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-400"> this week</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sleep Data */}
          {data.sleep.monthly.length > 0 && data.sleep.monthly[0] && (
            <div className="rounded-lg bg-gray-800/50 p-4 sm:col-span-2">
              <h3 className="mb-3 font-medium text-gray-300">
                Sleep (Last Night)
              </h3>
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-400">Sleep Stages</span>
                  {data.sleep.monthly[0]?.sleepStages && (
                    <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                      <div>
                        <span className="font-medium text-purple-400">
                          {Math.round(
                            data.sleep.monthly[0]?.sleepStages?.deep ?? 0,
                          )}
                        </span>
                        <span className="text-gray-400"> deep</span>
                      </div>
                      <div>
                        <span className="font-medium text-blue-400">
                          {Math.round(
                            data.sleep.monthly[0]?.sleepStages?.light ?? 0,
                          )}
                        </span>
                        <span className="text-gray-400"> light</span>
                      </div>
                      <div>
                        <span className="font-medium text-yellow-400">
                          {Math.round(
                            data.sleep.monthly[0]?.sleepStages?.rem ?? 0,
                          )}
                        </span>
                        <span className="text-gray-400"> REM</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-400">
                          {Math.round(
                            data.sleep.monthly[0]?.sleepStages?.awake ?? 0,
                          )}
                        </span>
                        <span className="text-gray-400"> awake</span>
                      </div>
                    </div>
                  )}
                  <div className="mt-1 text-sm">
                    <span className="font-medium text-white">
                      {Math.round(data.sleep.monthly[0]?.duration ?? 0)}
                    </span>
                    <span className="text-gray-400"> minutes total</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show connect button
  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className="inline-flex items-center gap-2 rounded-lg bg-blue-600/20 px-4 py-2 text-blue-400 shadow-lg backdrop-blur-sm transition-colors hover:bg-blue-600/30 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isConnecting ? (
        <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      )}
      {isConnecting ? "Connecting..." : "Connect Google Fit"}
    </button>
  );
}
