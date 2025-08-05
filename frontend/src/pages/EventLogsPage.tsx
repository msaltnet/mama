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
        // Generate random time (within last 30 days)
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

        // Generate event detail based on event type
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

    // Sort by time (newest first)
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
                // Use dummy data in DEBUG mode
                const dummyLogs = generateDummyEventLogs(2000);
                setEventLogs(dummyLogs);
            } else {
                // Real API call
                const params = new URLSearchParams();
                if (filters.event_type) params.append("event_type", filters.event_type);
                if (filters.result) params.append("result", filters.result);
                if (filters.admin_username)
                    params.append("admin_username", filters.admin_username);
                if (filters.user_id) params.append("user_id", filters.user_id);
                if (filters.start_date) params.append("start_date", filters.start_date);
                if (filters.end_date) params.append("end_date", filters.end_date);
                // Maximum 2000 items
                params.append("limit", "2000");

                const response = await authenticatedFetch(
                    `/event-logs?${params.toString()}`,
                );
                const data = await response.json();
                setEventLogs(data);
            }
        } catch (error) {
            console.error("Failed to fetch event logs:", error);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    const applyFilters = () => {
        if (DEBUG) {
            // Client-side filtering in DEBUG mode
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
            // Real API call
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
            LOGIN: "Login",
            ADMIN_CREATE: "Admin Create",
            PASSWORD_CHANGE: "Password Change",
            USER_CREATE: "User Create",
            USER_UPDATE: "User Update",
            USER_DELETE: "User Delete",
        };
        return labels[eventType] || eventType;
    };

    const getResultChip = (result: string) => {
        const color = result === "SUCCESS" ? "success" : "error";
        const label = result === "SUCCESS" ? "Success" : "Failure";
        return <Chip label={label} color={color} size="small" />;
    };

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Event Logs
            </Typography>

            {/* DEBUG mode 안내 */}
            {DEBUG && (
                <Alert severity="info" sx={{ mb: 3 }}>
                    DEBUG mode: Using dummy data.
                </Alert>
            )}

            {/* 최대 표시 개수 안내 - 2000개일 때만 표시 */}
            {eventLogs.length >= 2000 && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    Event logs have reached the maximum display count (2,000). Use filters to narrow down the search range to view more logs.
                </Alert>
            )}

            {/* 필터 */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Filters
                    </Typography>
                    <Box component="form" onSubmit={handleFilterSubmit}>
                        <Stack spacing={2} sx={{ mb: 2 }}>
                            {/* First row */}
                            <Stack spacing={2} direction={{ xs: "column", sm: "row" }}>
                                <FormControl sx={{ minWidth: 200 }}>
                                    <InputLabel>Event Type</InputLabel>
                                    <Select
                                        value={filters.event_type}
                                        label="Event Type"
                                        onChange={(e) =>
                                            handleFilterChange("event_type", e.target.value)
                                        }
                                    >
                                        <MenuItem value="">All</MenuItem>
                                        <MenuItem value="LOGIN">Login</MenuItem>
                                        <MenuItem value="ADMIN_CREATE">Admin Create</MenuItem>
                                        <MenuItem value="PASSWORD_CHANGE">Password Change</MenuItem>
                                        <MenuItem value="USER_CREATE">User Create</MenuItem>
                                        <MenuItem value="USER_UPDATE">User Update</MenuItem>
                                        <MenuItem value="USER_DELETE">User Delete</MenuItem>
                                    </Select>
                                </FormControl>

                                <FormControl sx={{ minWidth: 200 }}>
                                    <InputLabel>Result</InputLabel>
                                    <Select
                                        value={filters.result}
                                        label="Result"
                                        onChange={(e) =>
                                            handleFilterChange("result", e.target.value)
                                        }
                                    >
                                        <MenuItem value="">All</MenuItem>
                                        <MenuItem value="SUCCESS">Success</MenuItem>
                                        <MenuItem value="FAILURE">Failure</MenuItem>
                                    </Select>
                                </FormControl>

                                <TextField
                                    label="Admin"
                                    value={filters.admin_username}
                                    onChange={(e) =>
                                        handleFilterChange("admin_username", e.target.value)
                                    }
                                    placeholder="Enter admin name"
                                    sx={{ minWidth: 150 }}
                                />

                                <TextField
                                    label="User ID"
                                    value={filters.user_id}
                                    onChange={(e) =>
                                        handleFilterChange("user_id", e.target.value)
                                    }
                                    placeholder="Enter user ID"
                                    sx={{ minWidth: 150 }}
                                />
                            </Stack>

                            {/* Second row - Date filters */}
                            <Stack spacing={2} direction={{ xs: "column", sm: "row" }}>
                                <TextField
                                    label="Start Date"
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
                                    label="End Date"
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
                            Apply Filters
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
                        <Typography variant="h6">Event Log List</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Total {eventLogs.length} displayed
                            {eventLogs.length >= 2000 && (
                                <span style={{ color: "#f57c00", fontWeight: "bold" }}>
                                    {" "}
                                    (Max display count)
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
                                Loading...
                            </Typography>
                        </Box>
                    ) : (
                        <TableContainer component={Paper} variant="outlined">
                            <Table sx={{ tableLayout: 'fixed' }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ width: '15%', minWidth: '120px' }}>Time</TableCell>
                                        <TableCell sx={{ width: '12%', minWidth: '100px' }}>Admin</TableCell>
                                        <TableCell sx={{ width: '12%', minWidth: '100px' }}>Event Type</TableCell>
                                        <TableCell sx={{ width: '12%', minWidth: '100px' }}>User</TableCell>
                                        <TableCell sx={{ width: '8%', minWidth: '80px' }}>Result</TableCell>
                                        <TableCell sx={{ width: '41%', minWidth: '200px' }}>Details</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {eventLogs.map((log) => (
                                        <TableRow key={log.id} hover>
                                            <TableCell sx={{ width: '15%', minWidth: '120px' }}>
                                                {new Date(log.created_at).toLocaleString("en-US", {
                                                    year: "numeric",
                                                    month: "2-digit",
                                                    day: "2-digit",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                    second: "2-digit",
                                                    hour12: false,
                                                })}
                                            </TableCell>
                                            <TableCell sx={{ width: '12%', minWidth: '100px' }}>{log.admin_username}</TableCell>
                                            <TableCell sx={{ width: '12%', minWidth: '100px' }}>{getEventTypeLabel(log.event_type)}</TableCell>
                                            <TableCell sx={{ width: '12%', minWidth: '100px' }}>{log.user_user_id || "-"}</TableCell>
                                            <TableCell sx={{ width: '8%', minWidth: '80px' }}>{getResultChip(log.result)}</TableCell>
                                            <TableCell sx={{ width: '41%', minWidth: '200px' }}>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        maxWidth: '100%',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        display: 'block',
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
                                        No event logs found.
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
