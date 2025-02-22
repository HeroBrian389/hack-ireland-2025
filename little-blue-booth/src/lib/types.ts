

// Add interfaces for job data
export interface JobData {
  processed?: boolean;
  data?: string;
}
export interface WorkerJob {
  id: string;
  data: JobData;
}


export interface UserAssistantMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface SystemMessage {
  role: "system";
  content: string;
  timestamp: string;
}

export type Message = UserAssistantMessage | SystemMessage;
