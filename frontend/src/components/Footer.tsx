import React from "react";
import { Box, Typography, Link, Container } from "@mui/material";
import { BugReport } from "@mui/icons-material";

const Footer: React.FC = () => {
  // 빌드 시간을 가져오기 위한 환경변수 (Vite에서 제공)
  const buildTime =
    ((globalThis as Record<string, unknown>).__BUILD_TIME__ as string) ||
    new Date().toISOString();
  const version =
    ((globalThis as Record<string, unknown>).__APP_VERSION__ as string) ||
    "0.0.0";
  const issueReportUrl =
    ((globalThis as Record<string, unknown>).__ISSUE_REPORT_URL__ as string) ||
    "https://github.com/your-username/mama/issues";

  return (
    <Box
      component="footer"
      sx={{
        mt: "auto",
        py: 4, // 2에서 4로 변경하여 높이를 두 배로 늘림
        px: 2,
        backgroundColor: (theme) => theme.palette.grey[50],
        borderTop: 1,
        borderColor: "divider",
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2,
            flexDirection: { xs: "column", sm: "row" },
            textAlign: { xs: "center", sm: "left" },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <BugReport fontSize="small" color="action" />
            <Link
              href={issueReportUrl}
              target="_blank"
              rel="noopener noreferrer"
              color="text.secondary"
              sx={{ textDecoration: "none" }}
            >
              Issue Report
            </Link>
          </Box>

          <Typography variant="body2" color="text.secondary">
            v{version} • Built{" "}
            {new Date(buildTime).toLocaleString("en-US", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
