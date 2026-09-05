import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  define: {
    __BUNDLED_DEV__: false,
    __SERVER_FORWARD_CONSOLE__: false,
  },
});