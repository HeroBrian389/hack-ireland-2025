"use client"

import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { useState } from "react";

interface Insight {
  id: string;
  content: string;
  timestamp: string;
}

interface InsightsListProps {
  insights: Insight[];
}

export function InsightsList({ insights }: InsightsListProps) {
  const [hoveredInsight, setHoveredInsight] = useState<Insight | null>(null);

  if (!insights.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute right-4 top-24 z-40 w-72 rounded-lg bg-white/10 p-4 backdrop-blur-lg"
    >
      <h3 className="mb-4 text-lg font-semibold text-white">AI Insights</h3>
      <AnimatePresence mode="popLayout">
        <div className="space-y-2">
          {insights.map((insight) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="group relative cursor-pointer rounded-md bg-white/5 p-3 transition-colors hover:bg-white/10"
              onMouseEnter={() => setHoveredInsight(insight)}
              onMouseLeave={() => setHoveredInsight(null)}
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-white">
                  {new Date(insight.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="mt-1 text-xs text-blue-200">
                {insight.content}
              </p>

              {/* Hover Effect */}
              <AnimatePresence>
                {hoveredInsight === insight && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, x: -20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95, x: -20 }}
                    className="absolute right-full top-0 z-50 mr-4 w-64 overflow-hidden rounded-lg bg-white/10 p-4 backdrop-blur-lg"
                  >
                    <p className="text-sm text-blue-200">
                      {insight.content}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
    </motion.div>
  );
} 