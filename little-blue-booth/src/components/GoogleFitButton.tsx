import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useGoogleFit } from "~/hooks/useGoogleFit";
import type { GoogleFitData } from "~/services/googleFitService";

interface GoogleFitResponse {
  authUrl: string;
}

export function GoogleFitButton() {
  const [isConnecting, setIsConnecting] = useState(false);
  const searchParams = useSearchParams();
  const { isConnected, isLoading, data, error } = useGoogleFit();

  // Check for success or error params in URL
  const success = searchParams.get("success") === "true";
  const urlError = searchParams.get("error");

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
  if (urlError) {
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
