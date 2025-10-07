// hooks/useWebSocket.js

import { useEffect, useRef, useState, useCallback } from "react";

export const useWebSocket = (url, options = {}) => {
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const [lastMessage, setLastMessage] = useState(null);
  const [messageHistory, setMessageHistory] = useState([]);
  const ws = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    try {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log("WebSocket Connected");
        setConnectionStatus("Connected");
        if (options.onOpen) options.onOpen();
      };

      ws.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        setLastMessage(message);
        setMessageHistory((prev) => [...prev, message]);
        if (options.onMessage) options.onMessage(message);
      };

      ws.current.onclose = (event) => {
        console.log("WebSocket Disconnected:", event.code, event.reason);
        setConnectionStatus("Disconnected");
        if (options.onClose) options.onClose(event);

        // Auto-reconnect after 3 seconds
        if (options.autoReconnect !== false) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      ws.current.onerror = (error) => {
        console.error("WebSocket Error:", error);
        setConnectionStatus("Error");
        if (options.onError) options.onError(error);
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      setConnectionStatus("Error");
    }
  }, [url, options]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    setConnectionStatus("Disconnected");
  }, []);

  const sendMessage = useCallback((message) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
      return true;
    }
    console.warn("WebSocket is not connected");
    return false;
  }, []);

  useEffect(() => {
    if (url) connect();
    return () => disconnect();
  }, [url, connect, disconnect]);

  return {
    connectionStatus,
    lastMessage,
    messageHistory,
    sendMessage,
    connect,
    disconnect,
  };
};
