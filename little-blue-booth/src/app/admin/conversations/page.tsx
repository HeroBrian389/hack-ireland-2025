"use client";

import { api } from "~/trpc/react";

export default function AdminConversationsPage() {
  const { data, isLoading, isError, error } = api.admin.getAllConversations.useQuery();

  if (isLoading) return <div>Loading conversations...</div>;
  if (isError) return <div className="text-red-500">Error: {error.message}</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">All Conversations</h2>
      <ul className="space-y-3">
        {data?.map((conversation) => (
          <li key={conversation.id} className="p-3 border rounded-md bg-white">
            <div>
              <strong>Conversation ID:</strong> {conversation.id}
            </div>
            <div>
              <strong>Session ID:</strong> {conversation.sessionId}
            </div>
            <div>
              <strong>Created:</strong>{" "}
              {new Date(conversation.createdAt).toLocaleString()}
            </div>
            <ul className="mt-2 pl-4 border-l-2 border-gray-200">
              {conversation.chatMessages.map((msg) => (
                <li key={msg.id} className="text-sm mb-1">
                  [{msg.sender}] {msg.messageText}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
