import React, { useState, useEffect, useCallback } from "react";
import { authenticatedFetch } from "../utils/api";
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Box,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Card,
  CardContent,
  Stack,
  Alert,
} from "@mui/material";

import { DEBUG } from "../config";

interface EventLog {
  id: number;
  admin_id: number;
  admin_username: string;
  user_id: number | null;
  user_user_id: string | null;
  event_type: string;
  event_detail: string | null;
  result: string;
  created_at: string;
}

// 더미 데이터 생성 함수
const generateDummyEventLogs = (count: number = 2000): EventLog[] => {
  const eventTypes = [
    "LOGIN",
    "ADMIN_CREATE",
    "PASSWORD_CHANGE",
    "USER_CREATE",
    "USER_UPDATE",
    "USER_DELETE",
  ];
  const results = ["SUCCESS", "FAILURE"];
  const adminUsernames = ["mama", "admin1", "admin2", "super_admin"];
  const userIds = ["user001", "user002", "user003", "user004", "user005", null];

  const dummyLogs: EventLog[] = [];
  const baseTime = new Date();

  for (let i = 0; i < count; i++) {
    // 랜덤 시간 생성 (최근 30일 내)
    const randomDays = Math.floor(Math.random() * 30);
    const randomHours = Math.floor(Math.random() * 24);
    const randomMinutes = Math.floor(Math.random() * 60);
    const createdAt = new Date(
      baseTime.getTime() -
        randomDays * 24 * 60 * 60 * 1000 -
        randomHours * 60 * 60 * 1000 -
        randomMinutes * 60 * 1000,
    );

    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const result = results[Math.floor(Math.random() * results.length)];
    const adminUsername =
      adminUsernames[Math.floor(Math.random() * adminUsernames.length)];
    const userId = userIds[Math.floor(Math.random() * userIds.length)];

    // 이벤트 타입에 따른 상세 정보 생성
    const eventDetail = generateEventDetail(
      eventType,
      adminUsername,
      userId,
      result,
    );

    dummyLogs.push({
      id: i + 1,
      admin_id: Math.floor(Math.random() * 5) + 1,
      admin_username: adminUsername,
      user_id: userId ? Math.floor(Math.random() * 100) + 1 : null,
      user_user_id: userId,
      event_type: eventType,
      event_detail: eventDetail,
      result: result,
      created_at: createdAt.toISOString(),
    });
  }

  // 시간순 정렬 (최신순)
  dummyLogs.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  return dummyLogs;
};

const generateEventDetail = (
  eventType: string,
  adminUsername: string,
  userId: string | null,
  result: string,
): string => {
  if (eventType === "LOGIN") {
    if (result === "SUCCESS") {
      return `Successful login for admin: ${adminUsername}`;
    } else {
      return `Failed login attempt for username: ${adminUsername}`;
    }
  } else if (eventType === "ADMIN_CREATE") {
    if (result === "SUCCESS") {
      return `Admin account created: ${adminUsername}`;
    } else {
      return `Failed to create admin - username already exists: ${adminUsername}`;
    }
  } else if (eventType === "PASSWORD_CHANGE") {
    if (result === "SUCCESS") {
      return "Password changed successfully";
    } else {
      return "Failed password change - incorrect current password";
    }
  } else if (eventType === "USER_CREATE") {
    if (result === "SUCCESS") {
      return userId
        ? `Users created successfully: [${userId}]`
        : "Users created successfully: [user001, user002]";
    } else {
      return userId
        ? `Failed to create users - duplicates found: [${userId}]`
        : "Failed to create users - duplicates found: [user001]";
    }
  } else if (eventType === "USER_UPDATE") {
    if (result === "SUCCESS") {
      return userId
        ? `User updated successfully: ${userId}`
        : "User updated successfully: user001";
    } else {
      return userId
        ? `Failed to update user - user not found: ${userId}`
        : "Failed to update user - user not found: user001";
    }
  } else if (eventType === "USER_DELETE") {
    if (result === "SUCCESS") {
      return userId
        ? `Users deleted successfully: [${userId}]`
        : "Users deleted successfully: [user001, user002]";
    } else {
      return userId
        ? `Failed to delete users - users not found: [${userId}]`
        : "Failed to delete users - users not found: [user001]";
    }
  } else {
    return `${eventType} event occurred`;
  }
};

const EventLogsPage: React.FC = () => {
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    event_type: "",
    result: "",
    admin_username: "",
    user_id: "",
    start_date: "",
    end_date: "",
  });

  const fetchEventLogs = useCallback(async () => {
    setLoading(true);
    try {
      if (DEBUG) {
        // DEBUG 모드일 때 더미 데이터 사용
        const dummyLogs = generateDummyEventLogs(2000);
        setEventLogs(dummyLogs);
      } else {
        // 실제 API 호출
        const params = new URLSearchParams();
        if (filters.event_type) params.append("event_type", filters.event_type);
        if (filters.result) params.append("result", filters.result);
        if (filters.admin_username)
          params.append("admin_username", filters.admin_username);
        if (filters.user_id) params.append("user_id", filters.user_id);
        if (filters.start_date) params.append("start_date", filters.start_date);
        if (filters.end_date) params.append("end_date", filters.end_date);
        // 최대 2000개 조회
        params.append("limit", "2000");

        const response = await authenticatedFetch(
          `/event-logs?${params.toString()}`,
        );
        const data = await response.json();
        setEventLogs(data);
      }
    } catch (error) {
      console.error("이벤트 로그 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const applyFilters = () => {
    if (DEBUG) {
      // DEBUG 모드일 때 클라이언트 사이드 필터링
      const dummyLogs = generateDummyEventLogs(2000);
      let filteredLogs = dummyLogs;

      if (filters.event_type) {
        filteredLogs = filteredLogs.filter(
          (log) => log.event_type === filters.event_type,
        );
      }
      if (filters.result) {
        filteredLogs = filteredLogs.filter(
          (log) => log.result === filters.result,
        );
      }
      if (filters.admin_username) {
        filteredLogs = filteredLogs.filter(
          (log) => log.admin_username === filters.admin_username,
        );
      }
      if (filters.user_id) {
        filteredLogs = filteredLogs.filter(
          (log) => log.user_id?.toString() === filters.user_id,
        );
      }
      if (filters.start_date) {
        const startDate = new Date(filters.start_date);
        filteredLogs = filteredLogs.filter(
          (log) => new Date(log.created_at) >= startDate,
        );
      }
      if (filters.end_date) {
        const endDate = new Date(filters.end_date);
        filteredLogs = filteredLogs.filter(
          (log) => new Date(log.created_at) <= endDate,
        );
      }

      setEventLogs(filteredLogs);
    } else {
      // 실제 API 호출
      fetchEventLogs();
    }
  };

  useEffect(() => {
    fetchEventLogs();
  }, [fetchEventLogs]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const getEventTypeLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      LOGIN: "로그인",
      ADMIN_CREATE: "관리자 생성",
      PASSWORD_CHANGE: "비밀번호 변경",
      USER_CREATE: "사용자 생성",
      USER_UPDATE: "사용자 수정",
      USER_DELETE: "사용자 삭제",
    };
    return labels[eventType] || eventType;
  };

  const getResultChip = (result: string) => {
    const color = result === "SUCCESS" ? "success" : "error";
    const label = result === "SUCCESS" ? "성공" : "실패";
    return <Chip label={label} color={color} size="small" />;
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        이벤트 로그
      </Typography>

      {/* DEBUG 모드 안내 */}
      {DEBUG && (
        <Alert severity="info" sx={{ mb: 3 }}>
          DEBUG 모드: 더미 데이터를 사용하고 있습니다.
        </Alert>
      )}

      {/* 최대 표시 개수 안내 - 2000개일 때만 표시 */}
      {eventLogs.length >= 2000 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          이벤트 로그가 최대 표시 개수(2,000개)에 도달했습니다. 더 많은 로그를
          확인하려면 필터를 사용하여 검색 범위를 좁혀주세요.
        </Alert>
      )}

      {/* 필터 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            필터
          </Typography>
          <Box component="form" onSubmit={handleFilterSubmit}>
            <Stack spacing={2} sx={{ mb: 2 }}>
              {/* 첫 번째 행 */}
              <Stack spacing={2} direction={{ xs: "column", sm: "row" }}>
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>이벤트 타입</InputLabel>
                  <Select
                    value={filters.event_type}
                    label="이벤트 타입"
                    onChange={(e) =>
                      handleFilterChange("event_type", e.target.value)
                    }
                  >
                    <MenuItem value="">전체</MenuItem>
                    <MenuItem value="LOGIN">로그인</MenuItem>
                    <MenuItem value="ADMIN_CREATE">관리자 생성</MenuItem>
                    <MenuItem value="PASSWORD_CHANGE">비밀번호 변경</MenuItem>
                    <MenuItem value="USER_CREATE">사용자 생성</MenuItem>
                    <MenuItem value="USER_UPDATE">사용자 수정</MenuItem>
                    <MenuItem value="USER_DELETE">사용자 삭제</MenuItem>
                  </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>결과</InputLabel>
                  <Select
                    value={filters.result}
                    label="결과"
                    onChange={(e) =>
                      handleFilterChange("result", e.target.value)
                    }
                  >
                    <MenuItem value="">전체</MenuItem>
                    <MenuItem value="SUCCESS">성공</MenuItem>
                    <MenuItem value="FAILURE">실패</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="관리자"
                  value={filters.admin_username}
                  onChange={(e) =>
                    handleFilterChange("admin_username", e.target.value)
                  }
                  placeholder="관리자 이름 입력"
                  sx={{ minWidth: 150 }}
                />

                <TextField
                  label="사용자 ID"
                  value={filters.user_id}
                  onChange={(e) =>
                    handleFilterChange("user_id", e.target.value)
                  }
                  placeholder="사용자 ID 입력"
                  sx={{ minWidth: 150 }}
                />
              </Stack>

              {/* 두 번째 행 - 날짜 필터 */}
              <Stack spacing={2} direction={{ xs: "column", sm: "row" }}>
                <TextField
                  label="시작 날짜"
                  type="datetime-local"
                  value={filters.start_date}
                  onChange={(e) =>
                    handleFilterChange("start_date", e.target.value)
                  }
                  InputLabelProps={{
                    shrink: true,
                  }}
                  sx={{ minWidth: 200 }}
                />

                <TextField
                  label="끝 날짜"
                  type="datetime-local"
                  value={filters.end_date}
                  onChange={(e) =>
                    handleFilterChange("end_date", e.target.value)
                  }
                  InputLabelProps={{
                    shrink: true,
                  }}
                  sx={{ minWidth: 200 }}
                />
              </Stack>
            </Stack>

            <Button type="submit" variant="contained" color="primary">
              필터 적용
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 이벤트 로그 테이블 */}
      <Card>
        <CardContent>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h6">이벤트 로그 목록</Typography>
            <Typography variant="body2" color="text.secondary">
              총 {eventLogs.length}개 표시
              {eventLogs.length >= 2000 && (
                <span style={{ color: "#f57c00", fontWeight: "bold" }}>
                  {" "}
                  (최대 표시 개수)
                </span>
              )}
            </Typography>
          </Box>

          {loading ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              py={4}
            >
              <CircularProgress />
              <Typography variant="body1" sx={{ ml: 2 }}>
                로딩 중...
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>시간</TableCell>
                    <TableCell>관리자</TableCell>
                    <TableCell>이벤트 타입</TableCell>
                    <TableCell>사용자</TableCell>
                    <TableCell>결과</TableCell>
                    <TableCell>상세 정보</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {eventLogs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>
                        {new Date(log.created_at).toLocaleString("ko-KR")}
                      </TableCell>
                      <TableCell>{log.admin_username}</TableCell>
                      <TableCell>{getEventTypeLabel(log.event_type)}</TableCell>
                      <TableCell>{log.user_user_id || "-"}</TableCell>
                      <TableCell>{getResultChip(log.result)}</TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 300,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={log.event_detail || ""}
                        >
                          {log.event_detail || "-"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {eventLogs.length === 0 && (
                <Box
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  py={4}
                >
                  <Typography variant="body1" color="text.secondary">
                    이벤트 로그가 없습니다.
                  </Typography>
                </Box>
              )}
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default EventLogsPage;
