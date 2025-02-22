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
      <div className="flex flex-col gap-2">
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
        <div className="flex gap-4 rounded-lg bg-gray-800/50 p-3 text-sm">
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
              <span className="text-gray-400">Steps Today</span>
              <span className="font-medium text-white">{data.steps}</span>
            </div>
          </div>
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
              <span className="text-gray-400">Heart Rate</span>
              <span className="font-medium text-white">
                {data.heartRate} bpm
              </span>
            </div>
          </div>
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
