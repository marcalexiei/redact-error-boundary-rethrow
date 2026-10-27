import process from "node:process";

import { redact } from "@tanstack/redact/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const useRedact = process.env.REDACT === "1";

export default defineConfig({
  define: { __RUNTIME__: JSON.stringify(useRedact ? "Redact" : "React") },
  plugins: [react(), ...(useRedact ? [redact()] : [])],
});
