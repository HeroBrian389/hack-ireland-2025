"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { BoothLogo } from "~/app/components/BoothLogo";
import { ConsultationSummary } from "~/app/components/ConsultationSummary";

export default function EndPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const summaryData = searchParams.get("summary");
    if (summaryData) {
      try {
        const decodedSummary = decodeURIComponent(summaryData);
        setSummary(decodedSummary);
      } catch (err) {
        setError("Failed to load consultation summary");
        console.error("Error decoding summary:", err);
      }
    } else {
      setError("No consultation summary available");
    }
  }, [searchParams]);

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-gradient-to-b from-[#020817] to-[#050c1f]">
      {/* Header */}
      <motion.div 
        className="mt-8 flex items-center gap-3"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <BoothLogo />
        <span className="text-xl font-semibold text-blue-500">
          Little Blue Booth
        </span>
      </motion.div>

      {/* Content */}
      <motion.div
        className="mt-12 w-full max-w-4xl px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <h1 className="mb-8 text-center text-3xl font-bold text-white">
          Consultation Summary
        </h1>

        {error ? (
          <div className="rounded-lg bg-red-500/10 p-4 text-center text-red-400">
            {error}
          </div>
        ) : (
          <ConsultationSummary summary={summary} />
        )}

        {/* Start New Consultation Button */}
        <motion.div
          className="mt-12 flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <button
            onClick={() => router.push("/")}
            className="group relative inline-flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 p-0.5 text-lg font-semibold text-white hover:text-white focus:outline-none focus:ring-4 focus:ring-blue-800"
          >
            <span className="relative rounded-md bg-[#020817] px-8 py-3.5 transition-all duration-300 ease-in-out group-hover:bg-opacity-0">
              Start New Consultation
            </span>
          </button>
        </motion.div>
      </motion.div>
    </main>
  );
} 