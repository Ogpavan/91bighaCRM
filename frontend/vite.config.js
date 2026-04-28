import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), "");
    var packageVersion = process.env.npm_package_version || "0.0.0";
    var versionParts = packageVersion
        .split(".")
        .map(function (part) { return Number(part.replace(/\D/g, "")) || 0; });
    var appBuildVersion = "".concat(versionParts[0] % 10, ".").concat((versionParts[1] || 0) % 10, ".").concat((versionParts[2] || 0) % 10);
    return {
        plugins: [react()],
        define: {
            __APP_VERSION__: JSON.stringify(appBuildVersion)
        },
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
