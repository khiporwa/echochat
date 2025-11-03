import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from 'fs'; // NEW: Import file system module

// Define absolute paths to your generated certificates
const rootDir = __dirname;
const keyPath = path.join(rootDir, 'localhost+1-key.pem');
const certPath = path.join(rootDir, 'localhost+1.pem');

// Function to safely read file content
const readCertFile = (filePath: string) => {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath) : undefined;
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    // START NEW: HTTPS Configuration
    https: {
      // Use the safe file reading function
      key: readCertFile(keyPath),
      cert: readCertFile(certPath),
    },
    // END NEW: HTTPS Configuration
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));