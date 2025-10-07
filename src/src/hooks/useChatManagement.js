import { useState, useCallback, useEffect, useRef } from "react";
import { WS_URL } from "../api";

export function useChatManagement(currentUsername) {
  const [messages, setMessages] = useState([]);
  const [summary, setSummary] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("disconnected");

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const connectWebSocket = useCallback(
    (username) => {
      if (!username) return;

      cleanup();

      const wsUrl = `${WS_URL}/ws/chat_history/${username}`;
      console.log(`🔌 Connecting to chat WebSocket: ${wsUrl}`);

      setConnectionStatus("connecting");

      const websocket = new WebSocket(wsUrl);
      wsRef.current = websocket;

      websocket.onopen = () => {
        console.log("✅ Chat WebSocket connected");
        setConnectionStatus("connected");
        reconnectAttemptsRef.current = 0;
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("📨 WebSocket message:", data.type);

          switch (data.type) {
            case "initial_history":
              console.log(
                `📜 Loading ${data.messages?.length || 0} initial messages`
              );
              const formattedMessages = (data.messages || []).map((msg) => ({
                ...msg,
                display_time:
                  msg.display_time ||
                  (msg.timestamp?.includes("T")
                    ? new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : msg.timestamp),
              }));
              setMessages(formattedMessages);
              setSummary(data.summary || "");
              break;

            case "new_message":
              console.log(
                `➕ New message: ${data.message?.content?.substring(0, 30)}...`
              );
              const newMessage = {
                ...data.message,
                display_time: new Date(
                  data.message.timestamp
                ).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              };

              setMessages((prev) => {
                // Prevent duplicates
                const exists = prev.some(
                  (msg) =>
                    msg.content === newMessage.content &&
                    msg.role === newMessage.role &&
                    Math.abs(
                      new Date(msg.timestamp).getTime() -
                        new Date(newMessage.timestamp).getTime()
                    ) < 2000
                );

                return exists ? prev : [...prev, newMessage];
              });
              break;

            case "history_refresh":
              console.log(
                `🔄 Refreshing ${data.messages?.length || 0} messages`
              );
              const refreshedMessages = (data.messages || []).map((msg) => ({
                ...msg,
                display_time:
                  msg.display_time ||
                  (msg.timestamp?.includes("T")
                    ? new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : msg.timestamp),
              }));
              setMessages(refreshedMessages);
              setSummary(data.summary || "");
              break;

            case "ping":
              websocket.send(JSON.stringify({ type: "pong" }));
              break;

            case "pong":
              // Connection alive
              break;

            default:
              console.log("Unknown WebSocket message type:", data.type);
          }
        } catch (error) {
          console.error("❌ Error parsing WebSocket message:", error);
        }
      };

      websocket.onclose = (event) => {
        console.log(`❌ Chat WebSocket closed: ${event.code}`);
        wsRef.current = null;
        setConnectionStatus("disconnected");

        // Auto-reconnect with exponential backoff
        if (
          event.code !== 1000 &&
          reconnectAttemptsRef.current < maxReconnectAttempts
        ) {
          const delay = 1000 * Math.pow(2, reconnectAttemptsRef.current);
          console.log(
            `🔄 Reconnecting in ${delay}ms (attempt ${
              reconnectAttemptsRef.current + 1
            })`
          );

          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket(username);
          }, delay);
        }
      };

      websocket.onerror = (error) => {
        console.error("❌ Chat WebSocket error:", error);
        setConnectionStatus("error");
      };
    },
    [cleanup]
  );

  // Connect when username changes
  useEffect(() => {
    if (currentUsername) {
      connectWebSocket(currentUsername);
    } else {
      cleanup();
      setMessages([]);
      setSummary("");
      setConnectionStatus("disconnected");
    }

    return cleanup;
  }, [currentUsername, connectWebSocket, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    messages,
    setMessages,
    summary,
    connectionStatus,
    // No loadChatHistory - real-time updates via WebSocket!
  };
}
