// hooks/useRealTimeTranscription.js
import { useState, useCallback, useRef, useEffect } from "react";
import { WS_URL } from "../api";

export const useRealTimeTranscription = (patientId) => {
  // Core transcription state
  const [liveTranscription, setLiveTranscription] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Audio processing refs
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const workletNodeRef = useRef(null);
  const audioStreamRef = useRef(null);
  const isConnectingRef = useRef(false);

  // Connect to backend WebSocket
  const connectWebSocket = useCallback(() => {
    if (!patientId || isConnectingRef.current) return false;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return true;
    }

    const wsUrl = `${WS_URL}/ws/recognize/${patientId}`;
    console.log(`🔌 Hook connecting to: ${wsUrl}`);

    isConnectingRef.current = true;
    setConnectionStatus("connecting");

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("✅ Hook WebSocket connected");
        isConnectingRef.current = false;
        setConnectionStatus("connected");
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("📨 Hook received:", data.type, data.text || "");

          if (data.type === "partial") {
            setLiveTranscription(data.text || "");
            console.log("🎤 Hook partial:", data.text);
          } else if (data.type === "final") {
            setFinalTranscript(data.text || "");
            console.log("✅ Hook final:", data.text);
            // Clear partial after showing final
            setTimeout(() => setLiveTranscription(""), 2000);
          }
        } catch (error) {
          console.error("❌ Hook WebSocket message error:", error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("❌ Hook WebSocket error:", error);
        setConnectionStatus("error");
        isConnectingRef.current = false;
      };

      wsRef.current.onclose = () => {
        console.log("🔌 Hook WebSocket disconnected");
        setConnectionStatus("disconnected");
        setIsTranscribing(false);
        isConnectingRef.current = false;
      };

      return true;
    } catch (error) {
      console.error("❌ Hook failed to connect:", error);
      setConnectionStatus("error");
      isConnectingRef.current = false;
      return false;
    }
  }, [patientId]);

  // Initialize audio capture
  const initializeAudio = useCallback(async () => {
    try {
      console.log("🎤 Hook initializing audio capture");

      // Clean up existing context
      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Request microphone - exact specs for Vosk
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1, // Mono
          sampleRate: 16000, // 16kHz for Vosk
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      audioStreamRef.current = stream;
      const audioContext = new AudioContext({ sampleRate: 16000 });

      // Resume if suspended
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      try {
        // Load AudioWorklet processor
        await audioContext.audioWorklet.addModule("/audio-processor.js");

        const source = audioContext.createMediaStreamSource(stream);
        const workletNode = new AudioWorkletNode(
          audioContext,
          "audio-processor"
        );

        // Handle audio data from worklet
        workletNode.port.onmessage = (event) => {
          if (wsRef.current?.readyState === WebSocket.OPEN && isTranscribing) {
            const { type, data } = event.data;

            if (type === "pcm16" && data && data.buffer) {
              // Send PCM16 data directly to backend
              wsRef.current.send(data.buffer);
              console.log(
                `🔊 Hook sent ${data.buffer.byteLength} bytes to backend`
              );
            }
          }
        };

        source.connect(workletNode);
        workletNode.connect(audioContext.destination);

        audioContextRef.current = audioContext;
        workletNodeRef.current = workletNode;

        console.log("✅ Hook audio capture initialized successfully");
        return true;
      } catch (workletError) {
        console.warn(
          "⚠️ Hook AudioWorklet failed, using fallback:",
          workletError
        );
        // Fallback to ScriptProcessorNode
        return initializeFallback(audioContext, stream);
      }
    } catch (error) {
      console.error("❌ Hook audio initialization failed:", error);
      alert(`Microphone access failed: ${error.message}`);
      return false;
    }
  }, [isTranscribing]);

  // Fallback audio processing
  const initializeFallback = useCallback(
    async (audioContext, stream) => {
      try {
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (event) => {
          if (wsRef.current?.readyState === WebSocket.OPEN && isTranscribing) {
            const inputData = event.inputBuffer.getChannelData(0);

            // Convert to PCM16
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              let sample = Math.max(-1, Math.min(1, inputData[i]));
              pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
            }

            wsRef.current.send(pcmData.buffer);
            console.log(
              `🔊 Hook sent ${pcmData.buffer.byteLength} bytes (fallback)`
            );
          }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        audioContextRef.current = audioContext;
        workletNodeRef.current = processor;

        console.log("✅ Hook fallback audio initialized");
        return true;
      } catch (error) {
        console.error("❌ Hook fallback failed:", error);
        return false;
      }
    },
    [isTranscribing]
  );

  // Start recording
  const startRecording = useCallback(async () => {
    console.log(`🎤 Hook starting recording for ${patientId}`);

    if (!connectWebSocket()) {
      console.error("❌ Hook failed to connect WebSocket");
      return false;
    }

    // Wait for connection
    await new Promise((resolve) => {
      const checkConnection = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          resolve();
        } else {
          setTimeout(checkConnection, 100);
        }
      };
      checkConnection();
    });

    setIsTranscribing(true);
    setLiveTranscription("");
    setFinalTranscript("");

    const audioReady = await initializeAudio();
    if (!audioReady) {
      setIsTranscribing(false);
      return false;
    }

    console.log("✅ Hook recording started");
    return true;
  }, [patientId, connectWebSocket, initializeAudio]);

  // Stop recording
  const stopRecording = useCallback(() => {
    console.log("🛑 Hook stopping recording");
    setIsTranscribing(false);

    // Cleanup audio
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    console.log("✅ Hook recording stopped");
  }, []);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (isTranscribing) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isTranscribing, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (workletNodeRef.current) workletNodeRef.current.disconnect();
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) audioContextRef.current.close();
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return {
    liveTranscription,
    finalTranscript,
    isTranscribing,
    connectionStatus,
    startRecording,
    stopRecording,
    toggleRecording,
    isConnected: connectionStatus === "connected",
  };
};
