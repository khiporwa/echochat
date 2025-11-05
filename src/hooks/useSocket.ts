import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/contexts/AuthContext";

// RAILWAY DEPLOYMENT: Use the production URL from environment variables,
// otherwise default to the local server for development.
const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const useSocket = () => {
  const { user } = useAuth();
  // Using a ref to hold the socket instance ensures it's stable across re-renders
  const socketRef = useRef<Socket | null>(null);
  // State to track the connection status
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Only connect if we have a user and there's no existing socket
    if (user && !socketRef.current) {
      // The path must match the proxy key in vite.config.ts
      const newSocket = io(SOCKET_URL, { 
        path: "/socket.io/",
        // FIX: Pass the userId in the connection query
        query: {
          userId: user.id,
        },
        transports: ["websocket"], // Explicitly use websockets
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      newSocket.on("connect", () => {
        console.log("Socket connected:", newSocket.id);
        setIsConnected(true);
      });

      newSocket.on("disconnect", () => {
        console.log("Socket disconnected");
        setIsConnected(false);
      });

      socketRef.current = newSocket;
    }
    
    // Disconnect if the user logs out
    if (!user && socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    // Cleanup on component unmount or when user changes
    return () => {
      socketRef.current?.disconnect();
    };
  }, [user]); // Re-run the effect when the user object changes

  return { socket: socketRef.current, isConnected };
};