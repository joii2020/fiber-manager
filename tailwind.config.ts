import type { Config } from "tailwindcss";

export default {
  content: ["./entrypoints/**/*.{html,ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        panel: "#111827",
        workspace: "#f8fafc",
        line: "#d8dee9",
        ink: "#0f172a",
        muted: "#64748b",
        ckb: "#00c891"
      }
    }
  },
  plugins: []
} satisfies Config;
