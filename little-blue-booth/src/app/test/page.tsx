import { TestReasoningAPI, TestQueue, PollingExample } from "~/app/_components";

export default function TestPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">API Testing Page</h1>
      
      <div className="space-y-8">
        <PollingExample />
        <TestReasoningAPI />
      </div>
    </div>
  );
} 