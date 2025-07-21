import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  IconButton
} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import { DEBUG } from "../config";

interface User {
  user_id: string;
  organization?: string;
  key_value: string;
  extra_info?: string;
  created_at?: string;
  updated_at?: string;
  allowed_models: string[];
  allowed_services: string[];
}

const MainPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("access_token");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    user_id: "",
    organization: "",
    key_value: "",
    extra_info: "",
  });
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!username) return;
    if (DEBUG) {
      // 더미 데이터
      setUsers([
        {
          user_id: "testuser1",
          organization: "dev-org",
          key_value: "key-123",
          extra_info: "테스트 계정",
          created_at: "2024-01-01T12:00:00",
          updated_at: "2024-01-02T12:00:00",
          allowed_models: ["gpt-3.5-turbo", "gpt-4"],
          allowed_services: ["chat", "file-upload"],
        },
        {
          user_id: "testuser2",
          organization: "dev-org",
          key_value: "key-456",
          extra_info: undefined,
          created_at: "2024-01-03T12:00:00",
          updated_at: "2024-01-04T12:00:00",
          allowed_models: ["gpt-3.5-turbo"],
          allowed_services: ["chat"],
        },
      ]);
      setError("");
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch("/users", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          if (!res.ok) {
            throw new Error(data.detail || "사용자 정보를 불러오지 못했습니다.");
          }
          return data;
        } catch {
          throw new Error("API에서 JSON이 아닌 응답이 왔습니다: " + text.slice(0, 100));
        }
      })
      .then((data) => {
        setUsers(data);
        setError("");
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [token, username, DEBUG]);

  const handleDialogOpen = () => {
    setForm({ user_id: "", organization: "", key_value: "", extra_info: "" });
    setFormError("");
    setDialogOpen(true);
  };
  const handleDialogClose = () => {
    setDialogOpen(false);
  };
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const handleCreateUser = async () => {
    if (!form.user_id || !form.key_value) {
      setFormError("사용자ID와 Key Value는 필수입니다.");
      return;
    }
    setCreating(true);
    setFormError("");
    try {
      if (DEBUG) {
        setUsers([
          ...users,
          {
            user_id: form.user_id,
            organization: form.organization,
            key_value: form.key_value,
            extra_info: form.extra_info,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            allowed_models: [],
            allowed_services: [],
          },
        ]);
        setDialogOpen(false);
        setCreating(false);
        return;
      }
      const token = localStorage.getItem("access_token");
      const response = await fetch("/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "사용자 생성 실패");
      }
      setUsers([...users, data]);
      setDialogOpen(false);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (!username) {
    return (
      <Box
        sx={{
          minHeight: "80vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Paper elevation={3} sx={{ p: 4, minWidth: 320, textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary">
            Login is required.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Paper elevation={3} sx={{ p: 4, minWidth: 1100, width: "100%" }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Typography variant="h5" gutterBottom sx={{ flexGrow: 1 }}>
            사용자 정보 리스트
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleDialogOpen}
            sx={{ ml: 2 }}
          >
            사용자 생성
          </Button>
        </Box>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>사용자ID</TableCell>
                  <TableCell>조직</TableCell>
                  <TableCell>Key Value</TableCell>
                  <TableCell>추가정보</TableCell>
                  <TableCell>모델</TableCell>
                  <TableCell>서비스</TableCell>
                  <TableCell>생성일</TableCell>
                  <TableCell>수정일</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      사용자 정보가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell>{user.user_id}</TableCell>
                      <TableCell>{user.organization || "-"}</TableCell>
                      <TableCell>{user.key_value}</TableCell>
                      <TableCell>{user.extra_info || "-"}</TableCell>
                      <TableCell>{user.allowed_models && user.allowed_models.length > 0 ? user.allowed_models.join(", ") : "-"}</TableCell>
                      <TableCell>{user.allowed_services && user.allowed_services.length > 0 ? user.allowed_services.join(", ") : "-"}</TableCell>
                      <TableCell>{user.created_at ? user.created_at.split("T")[0] : "-"}</TableCell>
                      <TableCell>{user.updated_at ? user.updated_at.split("T")[0] : "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="xs" fullWidth>
          <DialogTitle>사용자 생성</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="사용자ID"
                name="user_id"
                value={form.user_id}
                onChange={handleFormChange}
                required
                fullWidth
              />
              <TextField
                label="조직"
                name="organization"
                value={form.organization}
                onChange={handleFormChange}
                fullWidth
              />
              <TextField
                label="Key Value"
                name="key_value"
                value={form.key_value}
                onChange={handleFormChange}
                required
                fullWidth
              />
              <TextField
                label="추가정보"
                name="extra_info"
                value={form.extra_info}
                onChange={handleFormChange}
                fullWidth
              />
              {formError && <Alert severity="error">{formError}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose} disabled={creating}>취소</Button>
            <Button onClick={handleCreateUser} variant="contained" disabled={creating}>
              {creating ? "생성 중..." : "생성"}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
};

export default MainPage;
