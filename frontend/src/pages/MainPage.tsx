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
  InputAdornment,
  Checkbox,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import SettingsIcon from "@mui/icons-material/Settings";
import DeleteIcon from "@mui/icons-material/Delete";
import { DEBUG } from "../config";
import { fetchJson, deleteUsers } from "../utils/api";
import { generateMockUsers, generateMockUsersFromIds } from "../utils/mockData";
import type { User } from "../types/user";

interface AvailableModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

type Order = "asc" | "desc";

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
    key: "user_id",
    direction: "asc",
  });

  // 검색 관련 상태
  const [searchTerm, setSearchTerm] = useState("");

  // 수정 다이얼로그 관련 상태
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    organization: "",
    extra_info: "",
  });
  const [editSelectedModels, setEditSelectedModels] = useState<string[]>([]);
  const [editFormError, setEditFormError] = useState("");
  const [updating, setUpdating] = useState(false);

  // 일괄 수정 다이얼로그 관련 상태
  const [batchEditDialogOpen, setBatchEditDialogOpen] = useState(false);
  const [batchEditSelectedUsers, setBatchEditSelectedUsers] = useState<User[]>(
    [],
  );
  const [batchEditSelectedModels, setBatchEditSelectedModels] = useState<
    string[]
  >([]);
  const [batchUpdating, setBatchUpdating] = useState(false);

  // 삭제 다이얼로그 관련 상태
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 체크박스 선택 관련 상태
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

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

  const handleEditModelSelectionChange = (modelId: string) => {
    setEditSelectedModels((prev) => {
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
    setLoading(true);

    // 사용자 목록과 모델 목록을 동시에 가져오기
    const fetchData = async () => {
      try {
        if (DEBUG) {
          // DEBUG 모드에서는 mock 데이터 사용
          const mockUsers = generateMockUsers();
          setUsers(mockUsers);
          setAvailableModels([
            {
              id: "gpt-4",
              object: "model",
              created: 1640995200,
              owned_by: "openai",
            },
            {
              id: "gpt-3.5-turbo",
              object: "model",
              created: 1640995200,
              owned_by: "openai",
            },
            {
              id: "claude-3-opus",
              object: "model",
              created: 1640995200,
              owned_by: "anthropic",
            },
            {
              id: "claude-3-sonnet",
              object: "model",
              created: 1640995200,
              owned_by: "anthropic",
            },
            {
              id: "claude-3-haiku",
              object: "model",
              created: 1640995200,
              owned_by: "anthropic",
            },
            {
              id: "gemini-pro",
              object: "model",
              created: 1640995200,
              owned_by: "google",
            },
            {
              id: "llama-2-70b",
              object: "model",
              created: 1640995200,
              owned_by: "meta",
            },
            {
              id: "llama-2-13b",
              object: "model",
              created: 1640995200,
              owned_by: "meta",
            },
            {
              id: "llama-2-7b",
              object: "model",
              created: 1640995200,
              owned_by: "meta",
            },
            {
              id: "mistral-7b",
              object: "model",
              created: 1640995200,
              owned_by: "mistral",
            },
          ]);
          setError("");
        } else {
          // 실제 API 호출
          const [usersData, modelsData] = await Promise.all([
            fetchJson<User[]>("/users"),
            fetchJson<{ models: AvailableModel[] }>("/models").catch(() => ({
              models: [],
            })),
          ]);

          setUsers(usersData);
          setAvailableModels(modelsData.models || []);
          setError("");
        }
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
    setSelectedUserIds([]); // 선택된 사용자들 초기화
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

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  // 정렬 처리 함수
  const handleSort = (key: keyof User) => {
    setSortConfig((prevConfig) => ({
      key,
      direction:
        prevConfig.key === key && prevConfig.direction === "asc"
          ? "desc"
          : "asc",
    }));
  };

  // 검색 및 정렬된 사용자 목록 생성
  const filteredAndSortedUsers = React.useMemo(() => {
    // 검색 필터링
    const filtered = users.filter((user) => {
      if (!searchTerm.trim()) return true;

      const searchLower = searchTerm.toLowerCase();
      const userId = user.user_id?.toLowerCase() || "";
      const organization = user.organization?.toLowerCase() || "";

      return userId.includes(searchLower) || organization.includes(searchLower);
    });

    // 정렬
    const sorted = filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      // null/undefined 처리
      if (!aValue && !bValue) return 0;
      if (!aValue) return 1;
      if (!bValue) return -1;

      // 배열 타입 처리 (allowed_models, allowed_services)
      if (Array.isArray(aValue) && Array.isArray(bValue)) {
        const aStr = aValue.join(", ");
        const bStr = bValue.join(", ");
        return sortConfig.direction === "asc"
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      }

      // 문자열 타입 처리
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortConfig.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // 기본 비교
      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [users, searchTerm, sortConfig]);
  const createMockUsers = (): User[] => {
    return generateMockUsersFromIds(
      userIds,
      form.organization,
      form.extra_info,
      selectedModels,
    );
  };

  const createUserRequests = () => {
    return userIds.map((userId) => ({
      user_id: userId,
      organization: form.organization,
      extra_info: form.extra_info,
      allowed_models: selectedModels,
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

  // 사용자 수정 다이얼로그 열기
  const handleEditDialogOpen = (user: User) => {
    setEditingUser(user);
    setEditForm({
      organization: user.organization || "",
      extra_info: user.extra_info || "",
    });
    setEditSelectedModels([...user.allowed_models]);
    setEditFormError("");
    setEditDialogOpen(true);
    setSelectedUserIds([]); // 선택된 사용자들 초기화
  };

  // 사용자 수정 다이얼로그 닫기
  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setEditingUser(null);
    setEditForm({
      organization: "",
      extra_info: "",
    });
    setEditSelectedModels([]);
    setEditFormError("");
  };

  // 사용자 정보 업데이트
  const handleUpdateUser = async () => {
    if (!editingUser || editSelectedModels.length === 0) {
      setEditFormError("At least one model selection is required.");
      return;
    }

    setUpdating(true);
    setEditFormError("");

    try {
      if (DEBUG) {
        // DEBUG 모드에서는 로컬 상태만 업데이트
        setUsers(
          users.map((user) =>
            user.user_id === editingUser.user_id
              ? {
                  ...user,
                  organization: editForm.organization,
                  extra_info: editForm.extra_info,
                  allowed_models: editSelectedModels,
                  updated_at: new Date().toISOString(),
                }
              : user,
          ),
        );
        setEditDialogOpen(false);
        return;
      }

      const updatedUser = await fetchJson<User>(
        `/users/${editingUser.user_id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organization: editForm.organization,
            extra_info: editForm.extra_info,
            allowed_models: editSelectedModels,
          }),
        },
      );

      setUsers(
        users.map((user) =>
          user.user_id === editingUser.user_id ? updatedUser : user,
        ),
      );
      setEditDialogOpen(false);
    } catch (err: unknown) {
      setEditFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setUpdating(false);
    }
  };

  // 체크박스 선택 핸들러
  const handleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // 전체 선택/해제 핸들러
  const handleSelectAll = () => {
    if (selectedUserIds.length === filteredAndSortedUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredAndSortedUsers.map((user) => user.user_id));
    }
  };

  // 일괄 수정 다이얼로그 열기
  const handleBatchEditDialogOpen = () => {
    const selectedUsers = users.filter((user) =>
      selectedUserIds.includes(user.user_id),
    );
    setBatchEditSelectedUsers(selectedUsers);
    setBatchEditSelectedModels([]);
    setBatchEditDialogOpen(true);
  };

  // 일괄 수정 다이얼로그 닫기
  const handleBatchEditDialogClose = () => {
    setBatchEditDialogOpen(false);
    setBatchEditSelectedUsers([]);
    setBatchEditSelectedModels([]);
    setSelectedUserIds([]); // 선택된 사용자들도 초기화
  };

  // 일괄 수정 모델 선택 상태 변경 핸들러
  const handleBatchEditModelSelectionChange = (modelId: string) => {
    setBatchEditSelectedModels((prev) => {
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

  // 일괄 수정 사용자 정보 업데이트
  const handleBatchUpdateUsers = async () => {
    if (
      batchEditSelectedUsers.length === 0 ||
      batchEditSelectedModels.length === 0
    ) {
      return;
    }

    setBatchUpdating(true);

    try {
      if (DEBUG) {
        // DEBUG 모드에서는 로컬 상태만 업데이트
        setUsers(
          users.map((user) => {
            if (
              batchEditSelectedUsers.some(
                (selectedUser) => selectedUser.user_id === user.user_id,
              )
            ) {
              return {
                ...user,
                allowed_models: batchEditSelectedModels,
                updated_at: new Date().toISOString(),
              };
            }
            return user;
          }),
        );
        setBatchEditDialogOpen(false);
        setSelectedUserIds([]); // 선택된 사용자들 초기화
        return;
      }

      const updatedUsers = await fetchJson<User[]>("/users/batch", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_ids: batchEditSelectedUsers.map((user) => user.user_id),
          allowed_models: batchEditSelectedModels,
        }),
      });

      setUsers(
        users.map((user) => {
          const updatedUser = updatedUsers.find(
            (u) => u.user_id === user.user_id,
          );
          return updatedUser || user;
        }),
      );
      setBatchEditDialogOpen(false);
      setSelectedUserIds([]); // 선택된 사용자들 초기화
    } catch (err: unknown) {
      console.error("Batch update failed:", err);
    } finally {
      setBatchUpdating(false);
    }
  };

  // 삭제 다이얼로그 열기
  const handleDeleteDialogOpen = () => {
    setDeleteDialogOpen(true);
  };

  // 삭제 다이얼로그 닫기
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
  };

  // 사용자 삭제 실행
  const handleDeleteUsers = async () => {
    if (selectedUserIds.length === 0) {
      return;
    }

    setDeleting(true);

    try {
      if (DEBUG) {
        // DEBUG 모드에서는 로컬 상태만 업데이트
        setUsers(
          users.filter((user) => !selectedUserIds.includes(user.user_id)),
        );
        setDeleteDialogOpen(false);
        setSelectedUserIds([]); // 선택된 사용자들 초기화
        return;
      }

      await deleteUsers(selectedUserIds);

      // 삭제된 사용자들을 로컬 상태에서 제거
      setUsers(users.filter((user) => !selectedUserIds.includes(user.user_id)));
      setDeleteDialogOpen(false);
      setSelectedUserIds([]); // 선택된 사용자들 초기화
    } catch (err: unknown) {
      console.error("Delete failed:", err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2, // 좌우 패딩 추가,
        mb: 4,
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
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={handleBatchEditDialogOpen}
            disabled={selectedUserIds.length === 0}
            sx={{ ml: 2 }}
          >
            Batch Edit ({selectedUserIds.length})
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteDialogOpen}
            disabled={selectedUserIds.length === 0}
            sx={{ ml: 2 }}
          >
            Delete ({selectedUserIds.length})
          </Button>
        </Box>

        {/* 검색 필드 */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="사용자 ID 또는 조직명으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ maxWidth: 400 }}
          />
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
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={
                        selectedUserIds.length ===
                          filteredAndSortedUsers.length &&
                        filteredAndSortedUsers.length > 0
                      }
                      indeterminate={
                        selectedUserIds.length > 0 &&
                        selectedUserIds.length < filteredAndSortedUsers.length
                      }
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortConfig.key === "user_id"}
                      direction={
                        sortConfig.key === "user_id"
                          ? sortConfig.direction
                          : "asc"
                      }
                      onClick={() => handleSort("user_id")}
                    >
                      User ID
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortConfig.key === "organization"}
                      direction={
                        sortConfig.key === "organization"
                          ? sortConfig.direction
                          : "asc"
                      }
                      onClick={() => handleSort("organization")}
                    >
                      Organization
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortConfig.key === "key_value"}
                      direction={
                        sortConfig.key === "key_value"
                          ? sortConfig.direction
                          : "asc"
                      }
                      onClick={() => handleSort("key_value")}
                    >
                      Key Value
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortConfig.key === "extra_info"}
                      direction={
                        sortConfig.key === "extra_info"
                          ? sortConfig.direction
                          : "asc"
                      }
                      onClick={() => handleSort("extra_info")}
                    >
                      Extra Info
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortConfig.key === "allowed_models"}
                      direction={
                        sortConfig.key === "allowed_models"
                          ? sortConfig.direction
                          : "asc"
                      }
                      onClick={() => handleSort("allowed_models")}
                    >
                      Models
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortConfig.key === "allowed_services"}
                      direction={
                        sortConfig.key === "allowed_services"
                          ? sortConfig.direction
                          : "asc"
                      }
                      onClick={() => handleSort("allowed_services")}
                    >
                      Services
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortConfig.key === "created_at"}
                      direction={
                        sortConfig.key === "created_at"
                          ? sortConfig.direction
                          : "asc"
                      }
                      onClick={() => handleSort("created_at")}
                    >
                      Created At
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortConfig.key === "updated_at"}
                      direction={
                        sortConfig.key === "updated_at"
                          ? sortConfig.direction
                          : "asc"
                      }
                      onClick={() => handleSort("updated_at")}
                    >
                      Updated At
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAndSortedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      {searchTerm.trim()
                        ? "검색 결과가 없습니다."
                        : "No user information available."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedUsers.map((user) => (
                    <TableRow
                      key={user.user_id}
                      sx={{
                        cursor: "pointer",
                        "&:hover": {
                          backgroundColor: "action.hover",
                        },
                      }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedUserIds.includes(user.user_id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleUserSelection(user.user_id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell onClick={() => handleEditDialogOpen(user)}>
                        {user.user_id}
                      </TableCell>
                      <TableCell onClick={() => handleEditDialogOpen(user)}>
                        {user.organization || "-"}
                      </TableCell>
                      <TableCell onClick={() => handleEditDialogOpen(user)}>
                        {user.key_value}
                      </TableCell>
                      <TableCell onClick={() => handleEditDialogOpen(user)}>
                        {user.extra_info || "-"}
                      </TableCell>
                      <TableCell onClick={() => handleEditDialogOpen(user)}>
                        {renderModelChips(user.allowed_models)}
                      </TableCell>
                      <TableCell onClick={() => handleEditDialogOpen(user)}>
                        {user.allowed_services &&
                        user.allowed_services.length > 0
                          ? user.allowed_services.join(", ")
                          : "-"}
                      </TableCell>
                      <TableCell onClick={() => handleEditDialogOpen(user)}>
                        {user.created_at ? user.created_at.split("T")[0] : "-"}
                      </TableCell>
                      <TableCell onClick={() => handleEditDialogOpen(user)}>
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
          <DialogTitle sx={{ p: 2 }}>Create User</DialogTitle>
          <DialogContent sx={{ pt: 3, pb: 3 }}>
            <Stack spacing={3}>
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

              <Divider sx={{ my: 1 }} />

              <Box sx={{ py: 1 }}>
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
                  <Box
                    sx={{ display: "flex", flexWrap: "wrap", gap: 1, py: 1 }}
                  >
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
                      onClick={() =>
                        handleModelSelectionChange("all-team-models")
                      }
                      sx={{
                        cursor: "pointer",
                        fontWeight: "bold",
                        borderWidth: 2,
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
                  <Box sx={{ mt: 2, py: 1 }}>
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Selected Models:
                    </Typography>
                    <Box
                      sx={{ display: "flex", flexWrap: "wrap", gap: 1, py: 1 }}
                    >
                      {selectedModels.map((modelId) => (
                        <Chip
                          key={modelId}
                          label={modelId}
                          color={
                            modelId === "all-team-models"
                              ? "secondary"
                              : "primary"
                          }
                          size="small"
                          onDelete={() => handleModelSelectionChange(modelId)}
                          sx={
                            modelId === "all-team-models"
                              ? { fontWeight: "bold" }
                              : {}
                          }
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
                sx={{ mt: 1 }}
              />
              {formError && <Alert severity="error">{formError}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
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

        {/* 사용자 수정 다이얼로그 */}
        <Dialog
          open={editDialogOpen}
          onClose={handleEditDialogClose}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ pb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <EditIcon />
              Edit User: {editingUser?.user_id}
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: 3, pb: 3 }}>
            <Stack spacing={3}>
              <Divider sx={{ my: 1 }} />

              <TextField
                label="User ID"
                value={editingUser?.user_id || ""}
                fullWidth
                disabled
                helperText="User ID cannot be modified"
              />

              <TextField
                label="Organization"
                name="organization"
                value={editForm.organization}
                onChange={handleEditFormChange}
                fullWidth
              />

              <Divider sx={{ my: 1 }} />

              <Box sx={{ py: 1 }}>
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
                  <Box
                    sx={{ display: "flex", flexWrap: "wrap", gap: 1, py: 1 }}
                  >
                    {/* all-team-models 옵션 */}
                    <Chip
                      label="all-team-models"
                      size="small"
                      color={
                        editSelectedModels.includes("all-team-models")
                          ? "secondary"
                          : "default"
                      }
                      variant={
                        editSelectedModels.includes("all-team-models")
                          ? "filled"
                          : "outlined"
                      }
                      onClick={() =>
                        handleEditModelSelectionChange("all-team-models")
                      }
                      sx={{
                        cursor: "pointer",
                        fontWeight: "bold",
                        borderWidth: 2,
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
                          editSelectedModels.includes(model.id)
                            ? "primary"
                            : "default"
                        }
                        variant={
                          editSelectedModels.includes(model.id)
                            ? "filled"
                            : "outlined"
                        }
                        onClick={() => handleEditModelSelectionChange(model.id)}
                        sx={{ cursor: "pointer" }}
                      />
                    ))}
                  </Box>
                )}

                {editSelectedModels.length > 0 && (
                  <Box sx={{ mt: 2, py: 1 }}>
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Selected Models:
                    </Typography>
                    <Box
                      sx={{ display: "flex", flexWrap: "wrap", gap: 1, py: 1 }}
                    >
                      {editSelectedModels.map((modelId) => (
                        <Chip
                          key={modelId}
                          label={modelId}
                          color={
                            modelId === "all-team-models"
                              ? "secondary"
                              : "primary"
                          }
                          size="small"
                          onDelete={() =>
                            handleEditModelSelectionChange(modelId)
                          }
                          sx={
                            modelId === "all-team-models"
                              ? { fontWeight: "bold" }
                              : {}
                          }
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>

              <TextField
                label="Extra Info"
                name="extra_info"
                value={editForm.extra_info}
                onChange={handleEditFormChange}
                fullWidth
                multiline
                rows={2}
                sx={{ mt: 1 }}
              />
              {editFormError && <Alert severity="error">{editFormError}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleEditDialogClose} disabled={updating}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateUser}
              variant="contained"
              disabled={updating || editSelectedModels.length === 0}
            >
              {updating ? "Updating..." : "Update User"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* 일괄 수정 다이얼로그 */}
        <Dialog
          open={batchEditDialogOpen}
          onClose={handleBatchEditDialogClose}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ p: 2 }}>
            Batch Edit Users ({batchEditSelectedUsers.length} selected)
          </DialogTitle>
          <DialogContent sx={{ pt: 3, pb: 3 }}>
            <Stack spacing={3}>
              <Box>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  Selected Users:
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                    maxHeight: 100,
                    overflow: "auto",
                  }}
                >
                  {batchEditSelectedUsers.map((user) => (
                    <Chip
                      key={user.user_id}
                      label={user.user_id}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
              <Divider />
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontStyle: "italic" }}
              >
                Note: This will replace the existing model information for all
                selected users.
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="h6" gutterBottom>
                Available Models
              </Typography>
              {loadingModels ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : availableModels.length === 0 ? (
                <Alert severity="warning">
                  No available models found. Please check your LiteLLM
                  configuration.
                </Alert>
              ) : (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, py: 1 }}>
                  {/* all-team-models 옵션 */}
                  <Chip
                    label="all-team-models"
                    size="small"
                    color={
                      batchEditSelectedModels.includes("all-team-models")
                        ? "secondary"
                        : "default"
                    }
                    variant={
                      batchEditSelectedModels.includes("all-team-models")
                        ? "filled"
                        : "outlined"
                    }
                    onClick={() =>
                      handleBatchEditModelSelectionChange("all-team-models")
                    }
                    sx={{
                      cursor: "pointer",
                      fontWeight: "bold",
                      borderWidth: 2,
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
                        batchEditSelectedModels.includes(model.id)
                          ? "primary"
                          : "default"
                      }
                      variant={
                        batchEditSelectedModels.includes(model.id)
                          ? "filled"
                          : "outlined"
                      }
                      onClick={() =>
                        handleBatchEditModelSelectionChange(model.id)
                      }
                      sx={{ cursor: "pointer" }}
                    />
                  ))}
                </Box>
              )}

              {batchEditSelectedModels.length > 0 && (
                <Box sx={{ mt: 2, py: 1 }}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Selected Models:
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexWrap: "wrap", gap: 1, py: 1 }}
                  >
                    {batchEditSelectedModels.map((modelId) => (
                      <Chip
                        key={modelId}
                        label={modelId}
                        color={
                          modelId === "all-team-models"
                            ? "secondary"
                            : "primary"
                        }
                        size="small"
                        onDelete={() =>
                          handleBatchEditModelSelectionChange(modelId)
                        }
                        sx={
                          modelId === "all-team-models"
                            ? { fontWeight: "bold" }
                            : {}
                        }
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={handleBatchEditDialogClose}
              disabled={batchUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBatchUpdateUsers}
              variant="contained"
              disabled={
                batchUpdating ||
                batchEditSelectedUsers.length === 0 ||
                batchEditSelectedModels.length === 0
              }
            >
              {batchUpdating ? "Updating..." : "Update Selected Users"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* 삭제 확인 다이얼로그 */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleDeleteDialogClose}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>사용자 삭제 확인</DialogTitle>
          <DialogContent>
            <Typography>
              선택된 {selectedUserIds.length}명의 사용자를 삭제하시겠습니까?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              이 작업은 되돌릴 수 없습니다.
            </Typography>
            {selectedUserIds.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  삭제될 사용자:
                </Typography>
                <Box sx={{ maxHeight: 200, overflow: "auto" }}>
                  {users
                    .filter((user) => selectedUserIds.includes(user.user_id))
                    .map((user) => (
                      <Typography
                        key={user.user_id}
                        variant="body2"
                        sx={{ py: 0.5 }}
                      >
                        • {user.user_id} ({user.organization || "N/A"})
                      </Typography>
                    ))}
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteDialogClose} disabled={deleting}>
              취소
            </Button>
            <Button
              onClick={handleDeleteUsers}
              variant="contained"
              color="error"
              disabled={deleting}
            >
              {deleting ? "삭제 중..." : "삭제"}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
};

export default MainPage;
