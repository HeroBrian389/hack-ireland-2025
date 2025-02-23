"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { JobState } from "bullmq";
import { useState, useEffect } from "react";

interface WorkerData {
  id: string;
  data: {
    processed: boolean;
    data?: Array<{
      id: string;
      sessionId: string;
      markerType: string;
      data: string;
      capturedAt?: string;
      deviceId?: string | null;
    }>;
  };
}

interface JobStatus {
  jobId: string;
  status: JobState | "not_found";
  data: {
    processed: boolean;
    data?: Array<{
      id: string;
      sessionId: string;
      markerType: string;
      data: string;
      capturedAt?: string;
      deviceId?: string | null;
    }>;
  } | null;
}

interface MetricData {
  value?: number | string;
  systolic?: number;
  diastolic?: number;
}

interface AggregatedMetrics {
  name: string | null;
  dob: string | null;
  bmi: number | null;
  height: number | null;
  weight: number | null;
  heartRate: number | null;
  bloodPressure: {
    systolic: number | null;
    diastolic: number | null;
  } | null;
  bloodOxygen: number | null;
  lastUpdated: Date | null;
}

interface WorkerDataDisplayProps {
  workerData: WorkerData[] | undefined;
  jobStatuses: JobStatus[] | undefined;
  isPollingLoading: boolean;
}

export const WorkerDataDisplay: React.FC<WorkerDataDisplayProps> = ({
  workerData,
  jobStatuses,
  isPollingLoading,
}) => {
  const [metrics, setMetrics] = useState<AggregatedMetrics>({
    name: null,
    dob: null,
    bmi: null,
    height: null,
    weight: null,
    heartRate: null,
    bloodPressure: { systolic: null, diastolic: null },
    bloodOxygen: null,
    lastUpdated: null,
  });

  useEffect(() => {
    // Update metrics whenever new worker data comes in
    if (workerData) {
      const healthMetricsJobs = workerData.filter(worker => 
        worker.id.startsWith('extractHealthMetrics-') && worker.data.processed
      );

      healthMetricsJobs.forEach(job => {
        if (job.data.data && Array.isArray(job.data.data)) {
          job.data.data.forEach(metric => {
            try {
              const parsedData = JSON.parse(metric.data) as MetricData;
              setMetrics(prev => {
                const newMetrics = { ...prev };
                
                switch (metric.markerType) {
                  case 'name':
                    if (typeof parsedData.value === 'string') newMetrics.name = parsedData.value;
                    break;
                  case 'dob':
                    if (typeof parsedData.value === 'string') newMetrics.dob = parsedData.value;
                    break;
                  case 'bmi':
                    if (typeof parsedData.value === 'number') newMetrics.bmi = parsedData.value;
                    break;
                  case 'height':
                    if (typeof parsedData.value === 'number') newMetrics.height = parsedData.value;
                    break;
                  case 'weight':
                    if (typeof parsedData.value === 'number') newMetrics.weight = parsedData.value;
                    break;
                  case 'heartRate':
                    if (typeof parsedData.value === 'number') newMetrics.heartRate = parsedData.value;
                    break;
                  case 'bloodPressure':
                    if (typeof parsedData.systolic === 'number' && typeof parsedData.diastolic === 'number') {
                      newMetrics.bloodPressure = {
                        systolic: parsedData.systolic,
                        diastolic: parsedData.diastolic,
                      };
                    }
                    break;
                  case 'bloodOxygen':
                    if (typeof parsedData.value === 'number') newMetrics.bloodOxygen = parsedData.value;
                    break;
                }
                newMetrics.lastUpdated = new Date();
                return newMetrics;
              });
            } catch (error) {
              console.error('Failed to parse metric data:', error);
            }
          });
        }
      });
    }
  }, [workerData]);

  return (
    <motion.div 
      className="flex flex-col gap-4 rounded-lg border border-blue-500/20 bg-[#020817] p-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${isPollingLoading ? 'bg-blue-400 animate-pulse' : 'bg-gray-400'}`} />
        <h3 className="text-sm font-semibold text-blue-400">Health Metrics</h3>
        {metrics.lastUpdated && (
          <span className="text-xs text-gray-400">
            Last updated: {metrics.lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {metrics.name && (
          <div className="rounded border border-blue-500/10 bg-blue-500/5 p-3">
            <span className="text-xs text-gray-400">Name</span>
            <div className="text-lg font-semibold text-blue-300">{metrics.name}</div>
          </div>
        )}
        
        {metrics.dob && (
          <div className="rounded border border-blue-500/10 bg-blue-500/5 p-3">
            <span className="text-xs text-gray-400">Date of Birth</span>
            <div className="text-lg font-semibold text-blue-300">{metrics.dob}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {metrics.bmi !== null && (
          <div className="rounded border border-blue-500/10 bg-blue-500/5 p-3">
            <span className="text-xs text-gray-400">BMI</span>
            <div className="text-lg font-semibold text-blue-300">{metrics.bmi.toFixed(1)}</div>
          </div>
        )}
        
        {metrics.height !== null && (
          <div className="rounded border border-blue-500/10 bg-blue-500/5 p-3">
            <span className="text-xs text-gray-400">Height</span>
            <div className="text-lg font-semibold text-blue-300">{metrics.height} cm</div>
          </div>
        )}
        
        {metrics.weight !== null && (
          <div className="rounded border border-blue-500/10 bg-blue-500/5 p-3">
            <span className="text-xs text-gray-400">Weight</span>
            <div className="text-lg font-semibold text-blue-300">{metrics.weight} kg</div>
          </div>
        )}
        
        {metrics.heartRate !== null && (
          <div className="rounded border border-blue-500/10 bg-blue-500/5 p-3">
            <span className="text-xs text-gray-400">Heart Rate</span>
            <div className="text-lg font-semibold text-blue-300">{metrics.heartRate} bpm</div>
          </div>
        )}
        
        {metrics.bloodPressure?.systolic !== null && metrics.bloodPressure?.diastolic !== null && (
          <div className="rounded border border-blue-500/10 bg-blue-500/5 p-3">
            <span className="text-xs text-gray-400">Blood Pressure</span>
            <div className="text-lg font-semibold text-blue-300">
              {metrics.bloodPressure?.systolic}/{metrics.bloodPressure?.diastolic} mmHg
            </div>
          </div>
        )}
        
        {metrics.bloodOxygen !== null && (
          <div className="rounded border border-blue-500/10 bg-blue-500/5 p-3">
            <span className="text-xs text-gray-400">Blood Oxygen</span>
            <div className="text-lg font-semibold text-blue-300">{metrics.bloodOxygen}%</div>
          </div>
        )}
      </div>

      {Object.values(metrics).every(value => 
        value === null || 
        (typeof value === 'object' && value !== null && Object.values(value as Record<string, unknown>).every(v => v === null))
      ) && (
        <p className="text-xs text-gray-500">No health metrics available</p>
      )}
    </motion.div>
  );
}; 