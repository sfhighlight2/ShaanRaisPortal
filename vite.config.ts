import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import compression from "vite-plugin-compression";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    // Pre-compress all JS/CSS assets at build time.
    // Hosts serving static files (Nginx, Caddy, custom servers) can serve
    // the .gz / .br files directly — zero runtime CPU cost.
    // Netlify and Vercel apply their own compression, so this is bonus coverage.
    compression({ algorithm: "gzip", ext: ".gz" }),
    compression({ algorithm: "brotliCompress", ext: ".br" }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Warn at 250 KB (gzip threshold for a good UX budget)
    chunkSizeWarningLimit: 250,
    rollupOptions: {
      output: {
        manualChunks: {
          // ── Core React runtime (changes almost never — cache forever) ─────
          "vendor-react": ["react", "react-dom", "react-router-dom"],

          // ── Supabase client (large, auth token refresh, cache forever) ────
          "vendor-supabase": ["@supabase/supabase-js"],

          // ── Data-fetching layer ───────────────────────────────────────────
          "vendor-query": ["@tanstack/react-query"],

          // ── Animation (only used on 3 pages — don't pay for it on others) ─
          "vendor-motion": ["framer-motion"],

          // ── Charts (only admin overview page) ────────────────────────────
          "vendor-charts": ["recharts"],

          // ── Drag-and-drop (only Templates admin page) ────────────────────
          "vendor-dnd": [
            "@dnd-kit/core",
            "@dnd-kit/sortable",
            "@dnd-kit/utilities",
          ],

          // ── Form libs (react-hook-form + zod, used across many pages) ─────
          "vendor-forms": ["react-hook-form", "@hookform/resolvers", "zod"],

          // ── Date handling (date-fns is surprisingly large) ────────────────
          "vendor-date": ["date-fns", "react-day-picker"],

          // ── Radix UI heavy primitives ─────────────────────────────────────
          "vendor-radix-overlay": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-alert-dialog",
            "@radix-ui/react-context-menu",
          ],
          "vendor-radix-forms": [
            "@radix-ui/react-select",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-switch",
            "@radix-ui/react-radio-group",
            "@radix-ui/react-slider",
            "@radix-ui/react-label",
          ],
          "vendor-radix-layout": [
            "@radix-ui/react-tabs",
            "@radix-ui/react-accordion",
            "@radix-ui/react-collapsible",
            "@radix-ui/react-separator",
            "@radix-ui/react-scroll-area",
            "@radix-ui/react-navigation-menu",
          ],
          "vendor-radix-misc": [
            "@radix-ui/react-tooltip",
            "@radix-ui/react-toast",
            "@radix-ui/react-slot",
            "@radix-ui/react-avatar",
            "@radix-ui/react-progress",
            "@radix-ui/react-toggle",
            "@radix-ui/react-toggle-group",
            "@radix-ui/react-hover-card",
            "@radix-ui/react-menubar",
            "@radix-ui/react-aspect-ratio",
          ],

          // ── Misc utilities ────────────────────────────────────────────────
          "vendor-utils": [
            "class-variance-authority",
            "clsx",
            "tailwind-merge",
            "tailwindcss-animate",
            "lucide-react",
            "cmdk",
            "sonner",
            "next-themes",
          ],
        },
      },
    },
  },
}));
