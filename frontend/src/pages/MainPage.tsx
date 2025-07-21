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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
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
    allowed_models: "",
    extra_info: "",
  });
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);

  // 조류 이름 배열 추가
  const BIRD_NAMES = [
    "sparrow",
    "eagle",
    "owl",
    "parrot",
    "falcon",
    "heron",
    "crane",
    "duck",
    "swan",
    "magpie",
    "woodpecker",
    "kingfisher",
    "pigeon",
    "dove",
    "wren",
    "robin",
    "finch",
    "tit",
    "jay",
    "lark",
  ];
  function getRandomBirdKey() {
    const bird = BIRD_NAMES[Math.floor(Math.random() * BIRD_NAMES.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${bird}-${num}`;
  }

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
            throw new Error(data.detail || "Failed to fetch user information.");
          }
          return data;
        } catch {
          throw new Error("API did not return JSON: " + text.slice(0, 100));
        }
      })
      .then((data) => {
        setUsers(data);
        setError("");
      })
      .catch((err: unknown) => {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(String(err));
        }
      })
      .finally(() => setLoading(false));
  }, [token, username]);

  const handleDialogOpen = () => {
    setForm({
      user_id: "",
      organization: "",
      allowed_models: "",
      extra_info: "",
    });
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
    if (!form.user_id || !form.allowed_models) {
      setFormError("User ID and Allowed Models are required.");
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
            key_value: getRandomBirdKey(), // 조류 이름 기반 랜덤 키
            extra_info: form.extra_info,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            allowed_models: form.allowed_models.split(",").map((s) => s.trim()),
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
        throw new Error(data.detail || "Failed to create user");
      }
      setUsers([...users, data]);
      setDialogOpen(false);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError(String(err));
      }
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
    <Box
      sx={{
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Paper elevation={3} sx={{ p: 4, minWidth: 1100, width: "100%" }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Typography variant="h5" gutterBottom sx={{ flexGrow: 1 }}>
            User List
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleDialogOpen}
            sx={{ ml: 2 }}
          >
            Create User
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
                  <TableCell>User ID</TableCell>
                  <TableCell>Organization</TableCell>
                  <TableCell>Key Value</TableCell>
                  <TableCell>Extra Info</TableCell>
                  <TableCell>Models</TableCell>
                  <TableCell>Services</TableCell>
                  <TableCell>Created At</TableCell>
                  <TableCell>Updated At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No user information available.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell>{user.user_id}</TableCell>
                      <TableCell>{user.organization || "-"}</TableCell>
                      <TableCell>{user.key_value}</TableCell>
                      <TableCell>{user.extra_info || "-"}</TableCell>
                      <TableCell>
                        {user.allowed_models && user.allowed_models.length > 0
                          ? user.allowed_models.join(", ")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {user.allowed_services &&
                        user.allowed_services.length > 0
                          ? user.allowed_services.join(", ")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {user.created_at ? user.created_at.split("T")[0] : "-"}
                      </TableCell>
                      <TableCell>
                        {user.updated_at ? user.updated_at.split("T")[0] : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <Dialog
          open={dialogOpen}
          onClose={handleDialogClose}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Create User</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="User ID"
                name="user_id"
                value={form.user_id}
                onChange={handleFormChange}
                required
                fullWidth
              />
              <TextField
                label="Organization"
                name="organization"
                value={form.organization}
                onChange={handleFormChange}
                fullWidth
              />
              <TextField
                label="Allowed Models"
                name="allowed_models"
                value={form.allowed_models}
                onChange={handleFormChange}
                required
                fullWidth
                helperText="Enter model names separated by commas (e.g. gpt-3.5-turbo, gpt-4)"
              />
              <TextField
                label="Extra Info"
                name="extra_info"
                value={form.extra_info}
                onChange={handleFormChange}
                fullWidth
              />
              {formError && <Alert severity="error">{formError}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose} disabled={creating}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              variant="contained"
              disabled={creating}
            >
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
};

export default MainPage;
