import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), "");
    return {
        plugins: [react()],
        server: {
            host: "0.0.0.0",
            port: 3001,
            proxy: {
                "/api": {
                    target: env.VITE_API_PROXY_TARGET || "http://localhost:3000",
                    changeOrigin: true
                }
            }
        },
        resolve: {
            alias: {
                "@": new URL("./src", import.meta.url).pathname,
            },
        },
    };
});
