import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";
import { join } from "path";

// package.json에서 버전 정보 읽기
const packageJson = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf-8"));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/static/", // 정적 파일 경로를 /static/으로 설정
  server: {
    // SPA 라우팅을 위한 설정
    fs: {
      allow: ['..']
    }
  },
  define: {
    // 빌드 시 환경변수 설정
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __APP_VERSION__: JSON.stringify(packageJson.version), // package.json 버전을 동적으로 읽어옴
    __ISSUE_REPORT_URL__: JSON.stringify(
      process.env.ISSUE_REPORT_URL || "https://github.com/msaltnet/mama/issues",
    ), // 환경변수로 설정 가능
  },
});
