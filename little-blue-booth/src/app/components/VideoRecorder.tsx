"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useConversation } from "~/lib/context/ConversationContext";
import { useWebRTC } from "~/lib/hooks/useWebRTC";

interface AnalysisResponse {
    success: boolean;
    message: string;
    filename: string;
    fileType: string;
    fileSize: number;
    description: {
        role: string;
        content: string;
        analysis?: string;
        error?: string;
    };
}

export default function VideoRecorder({ sendMessage }: { sendMessage: (message: any) => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [permission, setPermission] = useState(false);
    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [isVisionActive, setIsVisionActive] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const captureInterval = 5000; // Capture every 5 seconds

    const { addMessage } = useConversation();

    // Request camera access on mount
    useEffect(() => {
        const getPermissionOnMount = async () => {
            try {
                if (!streamRef.current) {
                    const streamData = await navigator.mediaDevices.getUserMedia({
                        audio: false,
                        video: true,
                    });
                    streamRef.current = streamData;
                    setPermission(true);
                    if (videoRef.current) {
                        videoRef.current.srcObject = streamData;
                    }
                    // Start analysis immediately after getting permission
                    void handleTakeScreenshot();
                }
            } catch (err) {
                const errorMessage = "Camera access denied or not available.";
                console.error("Error accessing camera:", err);
                setError(errorMessage);
            }
        };

        void getPermissionOnMount();

        // Cleanup function to stop the video stream
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }
        };
    }, []); // Remove addMessage and sendMessage from dependencies

    // Initialize canvas once
    useEffect(() => {
        canvasRef.current = document.createElement('canvas');
    }, []);

    // Function to capture a screenshot and send to analysis API
    const handleTakeScreenshot = async () => {
        if (!permission || !videoRef.current || !canvasRef.current) return;
        setIsAnalyzing(true);
        setError(null);

        try {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            
            // Only set canvas dimensions once when video dimensions are available
            if (canvas.width !== video.videoWidth) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            }

            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Could not get canvas context");

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataURL = canvas.toDataURL("image/png");
            setScreenshot(dataURL);

            const blob = await (await fetch(dataURL)).blob();
            const formData = new FormData();
            formData.append("file", blob, "screenshot.png");

            const response = await fetch("/api/video_analysis", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Analysis request failed");

            const data: AnalysisResponse = await response.json();

            console.log("Analysis data:", data);

            if (data.success && data.description.content) {
                // Send analysis through realtime API
                sendMessage({
                    type: "response.create",
                    response: {
                        modalities: ["text"],
                        instructions: `[Vision Analysis] ${data.description.content}`,
                    },
                });
                console.log("Analysis sent through realtime API");
            }
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : "Error during vision analysis";
            console.error("Vision analysis error:", err);
            setError(errorMessage);
            // Send error through realtime API
            sendMessage({
                type: "response.create",
                response: {
                    modalities: ["text"],
                    instructions: `[Vision Analysis Error] ${errorMessage}`,
                },
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Periodic capture when vision analysis is active
    useEffect(() => {
        if (!permission || !isVisionActive) return;

        const interval = setInterval(() => {
            void handleTakeScreenshot();
        }, captureInterval);

        return () => clearInterval(interval);
    }, [permission, isVisionActive]);

    return (
        <div className="rounded-lg bg-gray-900 p-4 shadow-lg">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="mx-auto w-full max-w-md rounded-md"
            />
        </div>
    );
}
