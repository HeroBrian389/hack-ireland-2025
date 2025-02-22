"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Summary {
  sessionId: string;
  endedAt: string;
  disclaimers: string[];
  markerTrends: Record<string, any>;
  recommendedSteps: Array<{
    title: string;
    description?: string;
    externalLinks?: string[];
  }>;
}

export default function EndSessionPage() {
  const { sessionId } = useParams() as { sessionId: string };
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // On mount, POST to /api/sessions/[sessionId]/end
  // so that we finalize the session and get summary
  useEffect(() => {
    const finalizeSession = async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/end`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to end session.");
        }
        setSummary(data.summary);
      } catch (err) {
        console.error("End session error:", err);
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    finalizeSession();
  }, [sessionId]);

  const handleSendEmail = () => {
    // For demonstration
    alert("Pretending to email the summary. Integrate a real email flow as needed.");
  };

  const handlePrintOrQR = () => {
    // You might generate a QR code to link to session data,
    // or simply invoke window.print()
    window.print();
  };

  if (error) {
    return (
      <div className="p-4 text-red-500">
        <h1 className="text-xl font-bold">Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!summary) {
    return <p className="p-4">Ending session, please wait...</p>;
  }

  return (
    <main className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Session Final Summary</h1>
      <div className="mb-2">
        <strong>Session ID:</strong> {summary.sessionId}
      </div>
      <div className="mb-4">
        <strong>Ended At:</strong> {new Date(summary.endedAt).toLocaleString()}
      </div>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Health Marker Trends</h2>
        {Object.keys(summary.markerTrends).length === 0 && (
          <p>No health marker trends found.</p>
        )}
        {Object.entries(summary.markerTrends).map(([markerType, data]) => (
          <div key={markerType} className="mb-2">
            <strong>{markerType} Trend:</strong>{" "}
            <pre className="text-sm bg-gray-100 rounded p-2 inline-block">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        ))}
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Recommended Steps</h2>
        {summary.recommendedSteps.length === 0 && <p>No recommendations found.</p>}
        <ol className="list-decimal ml-6 space-y-3">
          {summary.recommendedSteps.map((step, index) => (
            <li key={index}>
              <strong>{step.title}</strong>
              {step.description && <p>{step.description}</p>}
              {step.externalLinks && step.externalLinks.length > 0 && (
                <ul className="list-disc ml-5">
                  {step.externalLinks.map((link, i) => (
                    <li key={i}>
                      <a href={link} className="text-blue-600 underline">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Disclaimers</h2>
        <ul className="list-disc ml-6 space-y-1">
          {summary.disclaimers.map((text, i) => (
            <li key={i}>{text}</li>
          ))}
        </ul>
      </section>

      <div className="flex gap-4">
        <button
          onClick={handleSendEmail}
          className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
        >
          Email Summary
        </button>
        <button
          onClick={handlePrintOrQR}
          className="px-4 py-2 rounded bg-green-500 text-white hover:bg-green-600"
        >
          Print / QR
        </button>
      </div>
    </main>
  );
}
