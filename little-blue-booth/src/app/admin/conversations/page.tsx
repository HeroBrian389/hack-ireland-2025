"use client";

import { api } from "~/trpc/react";
import { useState } from "react";

export default function AdminConversationsPage() {
  const { data, isLoading, isError, error } = api.admin.getAllConversations.useQuery();
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  if (isLoading) return <div>Loading conversations...</div>;
  if (isError) return <div className="text-red-500">Error: {error.message}</div>;

  const toggleSession = (sessionId: string) => {
    setExpandedSession(expandedSession === sessionId ? null : sessionId);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-6">All Conversations</h2>
      <div className="space-y-6">
        {data?.map((conversation) => (
          <div key={conversation.id} className="bg-white/5 rounded-lg p-4 shadow-lg">
            <div className="mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-medium">Conversation {conversation.id.slice(0, 8)}</h3>
                  <p className="text-sm text-gray-400">
                    Created: {new Date(conversation.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => toggleSession(conversation.session.id)}
                  className="px-3 py-1 text-sm bg-blue-500/20 hover:bg-blue-500/30 rounded"
                >
                  {expandedSession === conversation.session.id ? "Hide Details" : "Show Details"}
                </button>
              </div>

              <div className="mt-4 border-l-2 border-gray-700 pl-4">
                <h4 className="font-medium mb-2">Chat Messages</h4>
                <div className="space-y-2">
                  {conversation.chatMessages.map((msg) => (
                    <div key={msg.id} className="text-sm">
                      <span className={`font-medium ${
                        msg.sender === "user" ? "text-green-400" :
                        msg.sender === "system" ? "text-yellow-400" : "text-blue-400"
                      }`}>
                        [{msg.sender}]
                      </span>{" "}
                      {msg.messageText}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {expandedSession === conversation.session.id && (
              <div className="mt-6 space-y-6">
                {/* Kiosk Information */}
                <div className="bg-white/5 p-4 rounded">
                  <h4 className="font-medium mb-2">Kiosk Information</h4>
                  <p>Location: {conversation.session.kiosk.location ?? "N/A"}</p>
                  <p>Status: {conversation.session.kiosk.status}</p>
                </div>

                {/* Health Markers */}
                {conversation.session.healthMarkers.length > 0 && (
                  <div className="bg-white/5 p-4 rounded">
                    <h4 className="font-medium mb-2">Health Markers</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {conversation.session.healthMarkers.map((marker) => (
                        <div key={marker.id} className="p-2 bg-white/5 rounded">
                          <p className="font-medium">{marker.markerType}</p>
                          <p className="text-sm">Data: {marker.data}</p>
                          <p className="text-xs text-gray-400">
                            Captured: {new Date(marker.capturedAt).toLocaleString()}
                          </p>
                          {marker.device && (
                            <p className="text-xs">Device: {marker.device.name}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations with type-safe JSON parsing */}
                {conversation.session.recommendations.length > 0 && (
                  <div className="bg-white/5 p-4 rounded">
                    <h4 className="font-medium mb-2">Recommendations</h4>
                    <div className="space-y-2">
                      {conversation.session.recommendations.map((rec) => (
                        <div key={rec.id} className="p-2 bg-white/5 rounded">
                          <p className="font-medium">{rec.title}</p>
                          {rec.description && <p className="text-sm">{rec.description}</p>}
                          {rec.externalLinks && (() => {
                            try {
                              const links = JSON.parse(rec.externalLinks) as string[];
                              return (
                                <div className="text-xs text-blue-400">
                                  {links.map((link, i) => (
                                    <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="block hover:underline">
                                      {link}
                                    </a>
                                  ))}
                                </div>
                              );
                            } catch {
                              return null;
                            }
                          })()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Referrals */}
                {conversation.session.referrals.length > 0 && (
                  <div className="bg-white/5 p-4 rounded">
                    <h4 className="font-medium mb-2">Referrals</h4>
                    <div className="space-y-2">
                      {conversation.session.referrals.map((referral) => (
                        <div key={referral.id} className="p-2 bg-white/5 rounded">
                          <p>Referred To: {referral.referredTo ?? "N/A"}</p>
                          <p className="text-sm">Status: {referral.status ?? "N/A"}</p>
                          {referral.scheduledTime && (
                            <p className="text-sm">
                              Scheduled: {new Date(referral.scheduledTime).toLocaleString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* External Queries with type-safe JSON parsing */}
                {conversation.session.externalQueries.length > 0 && (
                  <div className="bg-white/5 p-4 rounded">
                    <h4 className="font-medium mb-2">External Queries</h4>
                    <div className="space-y-4">
                      {conversation.session.externalQueries.map((query) => (
                        <div key={query.id} className="p-2 bg-white/5 rounded">
                          <p className="font-medium">Query: {query.queryText}</p>
                          <p className="text-sm">Source: {query.sourceType}</p>
                          {query.externalResults.length > 0 && (
                            <div className="mt-2 pl-4 border-l border-gray-600">
                              <p className="text-sm font-medium">Results:</p>
                              {query.externalResults.map((result) => (
                                <div key={result.id} className="text-sm mt-1">
                                  {(() => {
                                    try {
                                      const content = JSON.parse(result.resultContent) as { summary?: string };
                                      return content.summary ?? result.resultContent;
                                    } catch {
                                      return result.resultContent;
                                    }
                                  })()}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vision Analyses with type-safe JSON parsing */}
                {conversation.session.medias.length > 0 && (
                  <div className="bg-white/5 p-4 rounded">
                    <h4 className="font-medium mb-2">Media</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {conversation.session.medias.map((media) => (
                        <div key={media.id} className="p-2 bg-white/5 rounded">
                          <p>Type: {media.mediaType}</p>
                          <p className="text-sm break-all">Location: {media.storageLocation}</p>
                          {media.visionAnalyses.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm font-medium">Analyses:</p>
                              {media.visionAnalyses.map((analysis) => (
                                <div key={analysis.id} className="text-sm mt-1">
                                  <p>{analysis.analysisType}</p>
                                  {analysis.analysisResults && (() => {
                                    try {
                                      const results = JSON.parse(analysis.analysisResults) as { summary?: string };
                                      return results.summary && (
                                        <p className="text-xs">{results.summary}</p>
                                      );
                                    } catch {
                                      return null;
                                    }
                                  })()}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meta Reasonings with type-safe JSON parsing */}
                {conversation.session.metaReasonings.length > 0 && (
                  <div className="bg-white/5 p-4 rounded">
                    <h4 className="font-medium mb-2">Meta Reasonings</h4>
                    <div className="space-y-2">
                      {conversation.session.metaReasonings.map((reasoning) => (
                        <div key={reasoning.id} className="p-2 bg-white/5 rounded">
                          <p className="font-medium">{reasoning.agentType}</p>
                          {reasoning.analysisContent && (() => {
                            try {
                              const content = JSON.parse(reasoning.analysisContent) as { summary?: string };
                              return content.summary && (
                                <p className="text-sm">{content.summary}</p>
                              );
                            } catch {
                              return null;
                            }
                          })()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audit Logs with type-safe JSON parsing */}
                {conversation.session.auditLogs.length > 0 && (
                  <div className="bg-white/5 p-4 rounded">
                    <h4 className="font-medium mb-2">Audit Logs</h4>
                    <div className="space-y-2">
                      {conversation.session.auditLogs.map((log) => (
                        <div key={log.id} className="p-2 bg-white/5 rounded">
                          <p className="text-sm">
                            <span className={`font-medium ${
                              log.eventType === "error" ? "text-red-400" :
                              log.eventType === "warning" ? "text-yellow-400" : "text-green-400"
                            }`}>
                              [{log.eventType}]
                            </span>{" "}
                            {log.description}
                          </p>
                          {log.details && (() => {
                            try {
                              const details = JSON.parse(log.details) as { summary?: string };
                              return details.summary && (
                                <p className="text-xs mt-1">{details.summary}</p>
                              );
                            } catch {
                              return null;
                            }
                          })()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
