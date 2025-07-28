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
  TableSortLabel,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { DEBUG } from "../config";
import { fetchJson } from "../utils/api";

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

type Order = 'asc' | 'desc';

interface SortConfig {
  key: keyof User;
  direction: Order;
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
  const [userIds, setUserIds] = useState<string[]>([]);

  // 사용 가능한 모델 관련 상태
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

  // 정렬 관련 상태
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'user_id',
    direction: 'asc'
  });

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
        {
          id: "gpt-3.5-turbo",
          object: "model",
          created: 123456,
          owned_by: "openai",
        },
        { id: "gpt-4", object: "model", created: 123457, owned_by: "openai" },
        {
          id: "tinyllama1",
          object: "model",
          created: 123458,
          owned_by: "ollama",
        },
        {
          id: "tinyllama2",
          object: "model",
          created: 123459,
          owned_by: "ollama",
        },
        {
          id: "tinyllama3",
          object: "model",
          created: 123460,
          owned_by: "ollama",
        },
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
    setSelectedModels((prev) => {
      // all-team-models가 선택된 경우
      if (modelId === "all-team-models") {
        if (prev.includes("all-team-models")) {
          // all-team-models가 이미 선택되어 있으면 해제
          return prev.filter((id) => id !== "all-team-models");
        } else {
          // all-team-models를 선택하면 다른 모든 모델 해제
          return ["all-team-models"];
        }
      } else {
        // 일반 모델 선택/해제
        if (prev.includes("all-team-models")) {
          // all-team-models가 선택되어 있으면 해제하고 현재 모델만 선택
          return [modelId];
        } else {
          // 일반적인 모델 선택/해제 로직
          if (prev.includes(modelId)) {
            return prev.filter((id) => id !== modelId);
          } else {
            return [...prev, modelId];
          }
        }
      }
    });
  };

  // 선택된 모델들을 문자열로 변환
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      allowed_models: selectedModels.join(", "),
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
        {
          user_id: "testuser3",
          organization: "admin-org",
          key_value: "key-789",
          extra_info: "모든 모델 접근 권한",
          created_at: "2024-01-05T12:00:00",
          updated_at: "2024-01-05T12:00:00",
          allowed_models: ["all-team-models"],
          allowed_services: ["chat", "file-upload", "embeddings"],
        },
      ]);
      setError("");
      setLoading(false);
      // DEBUG 모드에서는 더미 모델 데이터도 함께 설정
      setAvailableModels([
        {
          id: "gpt-3.5-turbo",
          object: "model",
          created: 123456,
          owned_by: "openai",
        },
        { id: "gpt-4", object: "model", created: 123457, owned_by: "openai" },
        {
          id: "tinyllama1",
          object: "model",
          created: 123458,
          owned_by: "ollama",
        },
        {
          id: "tinyllama2",
          object: "model",
          created: 123459,
          owned_by: "ollama",
        },
        {
          id: "tinyllama3",
          object: "model",
          created: 123460,
          owned_by: "ollama",
        },
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
          fetchJson<{ models: AvailableModel[] }>("/models").catch(() => ({
            models: [],
          })),
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
    return availableModels.some((model) => model.id === modelId);
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
            color={
              model === "all-team-models"
                ? "secondary"
                : isModelAvailable(model)
                  ? "primary"
                  : "error"
            }
            variant={
              model === "all-team-models"
                ? "filled"
                : isModelAvailable(model)
                  ? "filled"
                  : "filled"
            }
            sx={{
              fontSize: "0.75rem",
              height: "20px",
              fontWeight: model === "all-team-models" ? "bold" : "normal",
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
    setUserIds([]);
    setDialogOpen(true);
    // 다이얼로그가 열릴 때 사용 가능한 모델 정보를 불러옴
    fetchAvailableModels();
  };
  const handleDialogClose = () => {
    setDialogOpen(false);
  };
  const parseUserIds = (inputValue: string): string[] => {
    if (!inputValue.trim()) return [];
    return inputValue
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });

    // User ID 입력 필드가 변경될 때 사용자 ID 목록 업데이트
    if (e.target.name === "user_id") {
      setUserIds(parseUserIds(e.target.value));
    }
  };

  // 정렬 처리 함수
  const handleSort = (key: keyof User) => {
    setSortConfig((prevConfig) => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // 정렬된 사용자 목록 생성
  const sortedUsers = React.useMemo(() => {
    const sorted = [...users].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      // null/undefined 처리
      if (!aValue && !bValue) return 0;
      if (!aValue) return 1;
      if (!bValue) return -1;

      // 배열 타입 처리 (allowed_models, allowed_services)
      if (Array.isArray(aValue) && Array.isArray(bValue)) {
        const aStr = aValue.join(', ');
        const bStr = bValue.join(', ');
        return sortConfig.direction === 'asc'
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      }

      // 문자열 타입 처리
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // 기본 비교
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [users, sortConfig]);
  const createMockUsers = (): User[] => {
    return userIds.map((userId) => ({
      user_id: userId,
      organization: form.organization,
      key_value: getRandomBirdKey(),
      extra_info: form.extra_info,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      allowed_models: selectedModels,
      allowed_services: [],
    }));
  };

  const createUserRequests = () => {
    return userIds.map((userId) => ({
      user_id: userId,
      organization: form.organization,
      extra_info: form.extra_info,
    }));
  };

  const handleCreateUser = async () => {
    if (userIds.length === 0 || selectedModels.length === 0) {
      setFormError("User ID(s) and at least one model selection are required.");
      return;
    }

    setCreating(true);
    setFormError("");

    try {
      if (DEBUG) {
        const newUsers = createMockUsers();
        setUsers([...users, ...newUsers]);
        setDialogOpen(false);
        return;
      }

      const createdUsers = await fetchJson<User[]>("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users: createUserRequests() }),
      });

      setUsers([...users, ...createdUsers]);
      setDialogOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
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
                  <TableCell>
                    <TableSortLabel
                      active={sortConfig.key === 'user_id'}
                      direction={sortConfig.key === 'user_id' ? sortConfig.direction : 'asc'}
                      onClick={() => handleSort('user_id')}
                    >
                      User ID
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortConfig.key === 'organization'}
                      direction={sortConfig.key === 'organization' ? sortConfig.direction : 'asc'}
                      onClick={() => handleSort('organization')}
                    >
                      Organization
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortConfig.key === 'key_value'}
                      direction={sortConfig.key === 'key_value' ? sortConfig.direction : 'asc'}
                      onClick={() => handleSort('key_value')}
                    >
                      Key Value
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortConfig.key === 'extra_info'}
                      direction={sortConfig.key === 'extra_info' ? sortConfig.direction : 'asc'}
                      onClick={() => handleSort('extra_info')}
                    >
                      Extra Info
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortConfig.key === 'allowed_models'}
                      direction={sortConfig.key === 'allowed_models' ? sortConfig.direction : 'asc'}
                      onClick={() => handleSort('allowed_models')}
                    >
                      Models
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortConfig.key === 'allowed_services'}
                      direction={sortConfig.key === 'allowed_services' ? sortConfig.direction : 'asc'}
                      onClick={() => handleSort('allowed_services')}
                    >
                      Services
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortConfig.key === 'created_at'}
                      direction={sortConfig.key === 'created_at' ? sortConfig.direction : 'asc'}
                      onClick={() => handleSort('created_at')}
                    >
                      Created At
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortConfig.key === 'updated_at'}
                      direction={sortConfig.key === 'updated_at' ? sortConfig.direction : 'asc'}
                      onClick={() => handleSort('updated_at')}
                    >
                      Updated At
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No user information available.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedUsers.map((user) => (
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
                helperText="여러 사용자를 생성하려면 콤마(,)로 구분하여 입력하세요. 예: user1, user2, user3"
                placeholder="user1, user2, user3"
              />
              {userIds.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    생성될 사용자 목록 ({userIds.length}명):
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {userIds.map((userId, index) => (
                      <Chip
                        key={index}
                        label={userId}
                        color="primary"
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>
              )}
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
                  <Box
                    sx={{ display: "flex", justifyContent: "center", py: 2 }}
                  >
                    <CircularProgress size={24} />
                  </Box>
                ) : availableModels.length === 0 ? (
                  <Alert severity="warning">
                    No available models found. Please check your LiteLLM
                    configuration.
                  </Alert>
                ) : (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {/* all-team-models 옵션 */}
                    <Chip
                      label="all-team-models"
                      size="small"
                      color={
                        selectedModels.includes("all-team-models")
                          ? "secondary"
                          : "default"
                      }
                      variant={
                        selectedModels.includes("all-team-models")
                          ? "filled"
                          : "outlined"
                      }
                      onClick={() => handleModelSelectionChange("all-team-models")}
                      sx={{
                        cursor: "pointer",
                        fontWeight: "bold",
                        borderWidth: 2
                      }}
                    />

                    {/* 구분선 */}
                    <Divider orientation="vertical" flexItem />

                    {/* 일반 모델들 */}
                    {availableModels.map((model) => (
                      <Chip
                        key={model.id}
                        label={model.id}
                        size="small"
                        color={
                          selectedModels.includes(model.id)
                            ? "primary"
                            : "default"
                        }
                        variant={
                          selectedModels.includes(model.id)
                            ? "filled"
                            : "outlined"
                        }
                        onClick={() => handleModelSelectionChange(model.id)}
                        sx={{ cursor: "pointer" }}
                      />
                    ))}
                  </Box>
                )}

                {selectedModels.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Selected Models:
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {selectedModels.map((modelId) => (
                        <Chip
                          key={modelId}
                          label={modelId}
                          color={modelId === "all-team-models" ? "secondary" : "primary"}
                          size="small"
                          onDelete={() => handleModelSelectionChange(modelId)}
                          sx={modelId === "all-team-models" ? { fontWeight: "bold" } : {}}
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
              {creating
                ? "Creating..."
                : `Create ${userIds.length > 1 ? `${userIds.length} Users` : "User"}`}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
};

export default MainPage;
