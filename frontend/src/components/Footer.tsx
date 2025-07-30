import React from "react";
import { Box, Typography, Link, Container } from "@mui/material";
import { BugReport } from "@mui/icons-material";

const Footer: React.FC = () => {
  // Vite define에서 설정한 전역 상수들 (빌드 시점에 치환됨)
  const buildTime =
    typeof __BUILD_TIME__ !== "undefined"
      ? __BUILD_TIME__
      : new Date().toISOString();
  const version =
    typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0";
  const issueReportUrl =
    typeof __ISSUE_REPORT_URL__ !== "undefined"
      ? __ISSUE_REPORT_URL__
      : "https://github.com/your-username/mama/issues";

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
