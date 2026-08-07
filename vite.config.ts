import { defineConfig } from "vite"; // redeploy trigger v2
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "./", // KEEP this for Vercel
  // Vercel/Supabase variables use NEXT_PUBLIC_, while local Vite setups use VITE_.
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),

  server: {
    port: 8080,
  },

  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
      react: path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
        },
      },
    },
  },
}));
