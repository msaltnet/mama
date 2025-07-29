import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/static/", // 정적 파일 경로를 /static/으로 설정
  define: {
    // 빌드 시 환경변수 설정
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __APP_VERSION__: JSON.stringify("1.0.0"), // package.json 버전과 동일하게 설정
    __ISSUE_REPORT_URL__: JSON.stringify(process.env.ISSUE_REPORT_URL || "https://github.com/msaltnet/mama/issues"), // 환경변수로 설정 가능
  },
});
