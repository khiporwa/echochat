import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import tsconfigPaths from "vite-tsconfig-paths"; // FIX: Import the tsconfig-paths plugin
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0", 
    port: 8080,
    // CRITICAL FIX: Ensure the proxy targets the WebSocket protocol (ws://)
    // and explicitly sets `ws: true` for Socket.io traffic.
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'ws://localhost:3001', // MUST use ws:// or wss:// for websockets
        ws: true, // Crucial for upgrading the connection
      },
    },
  },
  // FIX: Add the tsconfigPaths plugin. This will automatically handle the '@' alias.
  plugins: [react(), tsconfigPaths(), mode === "development" && componentTagger()].filter(
    Boolean
  ),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));