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
  Chip,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { DEBUG } from "../config";
import { authenticatedFetch, fetchJson } from "../utils/api";

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

interface AvailableModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
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

  // 사용 가능한 모델 관련 상태
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

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

  // 사용 가능한 모델 정보를 불러오는 함수
  const fetchAvailableModels = async () => {
    if (DEBUG) {
      // DEBUG 모드에서는 더미 데이터 사용
      setAvailableModels([
        { id: "gpt-3.5-turbo", object: "model", created: 123456, owned_by: "openai" },
        { id: "gpt-4", object: "model", created: 123457, owned_by: "openai" },
        { id: "tinyllama1", object: "model", created: 123458, owned_by: "ollama" },
        { id: "tinyllama2", object: "model", created: 123459, owned_by: "ollama" },
        { id: "tinyllama3", object: "model", created: 123460, owned_by: "ollama" },
      ]);
      return;
    }

    setLoadingModels(true);
    try {
      const data = await fetchJson<{ models: AvailableModel[] }>("/models");
      setAvailableModels(data.models || []);
    } catch (err) {
      console.error("Failed to fetch models:", err);
      setAvailableModels([]);
    } finally {
      setLoadingModels(false);
    }
  };

  // 모델 선택 상태 변경 핸들러
  const handleModelSelectionChange = (modelId: string) => {
    setSelectedModels(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      } else {
        return [...prev, modelId];
      }
    });
  };

  // 선택된 모델들을 문자열로 변환
  useEffect(() => {
    setForm(prev => ({
      ...prev,
      allowed_models: selectedModels.join(", ")
    }));
  }, [selectedModels]);

  useEffect(() => {
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
          allowed_models: ["gpt-3.5-turbo", "gpt-4", "gpt-4-invalid"],
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
      // DEBUG 모드에서는 더미 모델 데이터도 함께 설정
      setAvailableModels([
        { id: "gpt-3.5-turbo", object: "model", created: 123456, owned_by: "openai" },
        { id: "gpt-4", object: "model", created: 123457, owned_by: "openai" },
        { id: "tinyllama1", object: "model", created: 123458, owned_by: "ollama" },
        { id: "tinyllama2", object: "model", created: 123459, owned_by: "ollama" },
        { id: "tinyllama3", object: "model", created: 123460, owned_by: "ollama" },
      ]);
      return;
    }
    setLoading(true);

    // 사용자 목록과 모델 목록을 동시에 가져오기
    const fetchData = async () => {
      try {
        // 사용자 목록과 모델 목록을 병렬로 가져옴
        const [usersData, modelsData] = await Promise.all([
          fetchJson<User[]>("/users"),
          fetchJson<{ models: AvailableModel[] }>("/models").catch(() => ({ models: [] }))
        ]);

        setUsers(usersData);
        setAvailableModels(modelsData.models || []);
        setError("");
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(String(err));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, username]);

  // 사용자 목록을 불러온 후 사용 가능한 모델 정보도 함께 불러옴 (이 부분 제거)
  // useEffect(() => {
  //   if (users.length > 0 && !DEBUG) {
  //     fetchAvailableModels();
  //   }
  // }, [users]);

  // 모델이 사용 가능한지 확인하는 함수
  const isModelAvailable = (modelId: string) => {
    return availableModels.some(model => model.id === modelId);
  };

  // 모델 칩을 렌더링하는 함수
  const renderModelChips = (models: string[]) => {
    if (!models || models.length === 0) {
      return "-";
    }

    return (
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
        {models.map((model) => (
          <Chip
            key={model}
            label={model}
            size="small"
            color={isModelAvailable(model) ? "primary" : "error"}
            variant={isModelAvailable(model) ? "filled" : "filled"}
            sx={{
              fontSize: "0.75rem",
              height: "20px",
            }}
          />
        ))}
      </Box>
    );
  };

  const handleDialogOpen = () => {
    setForm({
      user_id: "",
      organization: "",
      allowed_models: "",
      extra_info: "",
    });
    setSelectedModels([]);
    setFormError("");
    setDialogOpen(true);
    // 다이얼로그가 열릴 때 사용 가능한 모델 정보를 불러옴
    fetchAvailableModels();
  };
  const handleDialogClose = () => {
    setDialogOpen(false);
  };
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const handleCreateUser = async () => {
    if (!form.user_id || selectedModels.length === 0) {
      setFormError("User ID and at least one model selection are required.");
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
            allowed_models: selectedModels,
            allowed_services: [],
          },
        ]);
        setDialogOpen(false);
        setCreating(false);
        return;
      }

      const data = await fetchJson<User>("/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          allowed_models: selectedModels.join(", ")
        }),
      });

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

  return (
    <Box
      sx={{
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2, // 좌우 패딩 추가
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4, // 패딩 추가
          minWidth: 1100,
          width: "100%",
          maxWidth: 1400, // 최대 폭 설정
          mx: "auto", // 중앙 정렬
        }}
      >
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
                        {renderModelChips(user.allowed_models)}
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
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Create User</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
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

              <Divider />

              <Box>
                <Typography variant="h6" gutterBottom>
                  Available Models
                </Typography>
                {loadingModels ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : availableModels.length === 0 ? (
                  <Alert severity="warning">
                    No available models found. Please check your LiteLLM configuration.
                  </Alert>
                ) : (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {availableModels.map((model) => (
                      <Chip
                        key={model.id}
                        label={model.id}
                        size="small"
                        color={selectedModels.includes(model.id) ? "primary" : "default"}
                        variant={selectedModels.includes(model.id) ? "filled" : "outlined"}
                        onClick={() => handleModelSelectionChange(model.id)}
                        sx={{ cursor: "pointer" }}
                      />
                    ))}
                  </Box>
                )}

                {selectedModels.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Selected Models:
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {selectedModels.map((modelId) => (
                        <Chip
                          key={modelId}
                          label={modelId}
                          color="primary"
                          size="small"
                          onDelete={() => handleModelSelectionChange(modelId)}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>

              <TextField
                label="Extra Info"
                name="extra_info"
                value={form.extra_info}
                onChange={handleFormChange}
                fullWidth
                multiline
                rows={2}
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
              disabled={creating || selectedModels.length === 0}
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
