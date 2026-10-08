import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "wouter"],
          ui: [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-accordion",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-popover",
            "@radix-ui/react-scroll-area",
            "@radix-ui/react-select",
            "@radix-ui/react-avatar",
            "@radix-ui/react-separator",
            "class-variance-authority",
            "clsx",
            "tailwind-merge",
            "cmdk",
            "vaul",
            "embla-carousel-react",
          ],
          map: ["leaflet", "react-leaflet"],
          motion: ["framer-motion"],
          forms: ["react-hook-form", "zod", "@hookform/resolvers"],
          icons: ["lucide-react"],
          charts: ["recharts"],
          query: ["@tanstack/react-query"],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['@capacitor/app'],
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
