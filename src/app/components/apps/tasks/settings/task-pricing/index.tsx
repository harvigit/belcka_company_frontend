"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputAdornment,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Paper,
} from "@mui/material";
import { IconSearch } from "@tabler/icons-react";
import IOSSwitch from "@/app/components/common/IOSSwitch";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import toast from "react-hot-toast";

interface TaskPricingMatrixProps {
  onSaveSuccess?: () => void;
}

const TaskPricingMatrix: React.FC<TaskPricingMatrixProps> = ({ onSaveSuccess }) => {
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [matrix, setMatrix] = useState<Record<string, { is_active: boolean; price: string }>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProjectFilter, setSelectedProjectFilter] = useState("");

  const fetchData = async () => {
    if (!user?.company_id) return;
    setLoading(true);
    try {
      const [resResources, resTasks, resPrices] = await Promise.all([
        api.get("/pricework/get-resources").catch((err) => {
          console.error("Error fetching pricework resources", err);
          return { data: { projects: [] } };
        }),
        api.get(`/tasks/get?company_id=${user.company_id}&limit=500`).catch((err) => {
          console.error("Error fetching tasks", err);
          return { data: { info: [] } };
        }),
        api.get("/pricework/settings/prices?limit=2000").catch((err) => {
          console.error("Error fetching project task prices", err);
          return { data: { info: [] } };
        }),
      ]);

      const projectList = resResources.data?.projects || [];
      setProjects(projectList);

      const taskList = resTasks.data?.info || [];
      setTasks(taskList);

      const priceList = resPrices.data?.info || [];
      const newMatrix: Record<string, { is_active: boolean; price: string }> = {};

      priceList.forEach((item: any) => {
        if (item.task_id && item.project_id) {
          const key = `${item.task_id}_${item.project_id}`;
          newMatrix[key] = {
            is_active: true,
            price: item.price != null ? String(item.price) : "0.00",
          };
        }
      });

      setMatrix(newMatrix);
    } catch (err) {
      console.error("Failed to load task pricing matrix:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.company_id]);

  const handleToggle = (taskId: number, projectId: number, basePrice: string) => {
    const key = `${taskId}_${projectId}`;
    setMatrix((prev) => {
      const current = prev[key];
      const nextIsActive = !current?.is_active;
      return {
        ...prev,
        [key]: {
          is_active: nextIsActive,
          price: current?.price || basePrice || "0.00",
        },
      };
    });
  };

  const handlePriceChange = (taskId: number, projectId: number, val: string) => {
    if (/^\d*(?:\.\d{0,2})?$/.test(val)) {
      const key = `${taskId}_${projectId}`;
      setMatrix((prev) => {
        const current = prev[key];
        return {
          ...prev,
          [key]: {
            is_active: current?.is_active ?? true,
            price: val,
          },
        };
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const items: Array<{ project_id: number; task_id: number; price: number; is_active: boolean }> = [];
      Object.entries(matrix).forEach(([key, val]) => {
        const [taskIdStr, projectIdStr] = key.split("_");
        const taskId = Number(taskIdStr);
        const projectId = Number(projectIdStr);
        if (taskId && projectId) {
          items.push({
            task_id: taskId,
            project_id: projectId,
            price: Number(val.price) || 0,
            is_active: val.is_active,
          });
        }
      });

      const res = await api.post("/pricework/settings/prices/batch", { items });
      if (res.data?.IsSuccess) {
        toast.success(res.data?.message || "Settings saved!");
        onSaveSuccess?.();
      } else {
        toast.error(res.data?.message || "Failed to save settings");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const filteredTasks = useMemo(() => {
    if (!searchTerm.trim()) return tasks;
    const term = searchTerm.toLowerCase();
    return tasks.filter((t) => {
      const userStr = String(t.user_name || t.user?.name || "").toLowerCase();
      const tradeStr = String(t.trade_name || "").toLowerCase();
      const catStr = String(t.category_name || "").toLowerCase();
      const subCatStr = String(t.sub_category_name || "").toLowerCase();
      return (
        userStr.includes(term) ||
        tradeStr.includes(term) ||
        catStr.includes(term) ||
        subCatStr.includes(term)
      );
    });
  }, [tasks, searchTerm]);

  const displayedProjects = useMemo(() => {
    if (!selectedProjectFilter) return projects;
    return projects.filter((p) => String(p.id) === String(selectedProjectFilter));
  }, [projects, selectedProjectFilter]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Top Filter and Save Bar */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <TextField
            size="small"
            placeholder="Search user, trade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch size={18} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: 200,
              bgcolor: "#fff",
              "& .MuiOutlinedInput-root": {
                borderRadius: "8px",
              },
            }}
          />

          <FormControl size="small" sx={{ minWidth: 160, bgcolor: "#fff" }}>
            <Select
              displayEmpty
              value={selectedProjectFilter}
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              sx={{ borderRadius: "8px" }}
            >
              <MenuItem value="">All Projects</MenuItem>
              {projects.map((p) => (
                <MenuItem key={p.id} value={String(p.id)}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          sx={{
            bgcolor: "#1976d2",
            color: "#fff",
            textTransform: "none",
            borderRadius: "8px",
            px: 3,
            py: 0.8,
            fontWeight: 600,
            fontSize: "0.9rem",
            boxShadow: "0 2px 6px rgba(25, 118, 210, 0.3)",
            "&:hover": { bgcolor: "#1565c0" },
          }}
        >
          {saving ? <CircularProgress size={20} color="inherit" /> : "Save Changes"}
        </Button>
      </Box>

      {/* Matrix Table Container */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          flex: 1,
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          overflow: "auto",
          maxHeight: "calc(90vh - 160px)",
        }}
      >
        <Table stickyHeader size="small" sx={{ borderCollapse: "separate", borderSpacing: 0 }}>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  position: "sticky",
                  left: 0,
                  zIndex: 3,
                  bgcolor: "#f8fafc",
                  fontWeight: 700,
                  borderRight: "1px solid #e2e8f0",
                  minWidth: 110,
                  color: "#1e293b",
                }}
              >
                User
              </TableCell>
              <TableCell
                sx={{
                  position: "sticky",
                  left: 110,
                  zIndex: 3,
                  bgcolor: "#f8fafc",
                  fontWeight: 700,
                  borderRight: "1px solid #e2e8f0",
                  minWidth: 110,
                  color: "#1e293b",
                }}
              >
                Trade
              </TableCell>
              <TableCell
                sx={{
                  position: "sticky",
                  left: 220,
                  zIndex: 3,
                  bgcolor: "#f8fafc",
                  fontWeight: 700,
                  borderRight: "1px solid #e2e8f0",
                  minWidth: 130,
                  color: "#1e293b",
                }}
              >
                Category
              </TableCell>
              <TableCell
                sx={{
                  position: "sticky",
                  left: 350,
                  zIndex: 3,
                  bgcolor: "#f8fafc",
                  fontWeight: 700,
                  borderRight: "1px solid #e2e8f0",
                  minWidth: 140,
                  color: "#1e293b",
                }}
              >
                Subcatego
              </TableCell>
              <TableCell
                sx={{
                  position: "sticky",
                  left: 490,
                  zIndex: 3,
                  bgcolor: "#f8fafc",
                  fontWeight: 700,
                  borderRight: "2px solid #cbd5e1",
                  minWidth: 100,
                  color: "#1e293b",
                }}
              >
                Base price
              </TableCell>

              {/* Dynamic Project Column Headers */}
              {displayedProjects.map((project) => (
                <TableCell
                  key={project.id}
                  align="center"
                  sx={{
                    bgcolor: "#f8fafc",
                    fontWeight: 700,
                    minWidth: 160,
                    color: "#1e293b",
                    borderRight: "1px solid #e2e8f0",
                  }}
                >
                  {project.name}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5 + displayedProjects.length} align="center" sx={{ py: 4, color: "#64748b" }}>
                  No tasks found.
                </TableCell>
              </TableRow>
            ) : (
              filteredTasks.map((task) => {
                const basePriceFormatted = task.base_cost != null ? String(task.base_cost) : "0.00";
                const displayUserName = task.user_name || task.user?.name || "User A";

                return (
                  <TableRow key={task.id} hover sx={{ "&:hover td": { bgcolor: "#f1f5f9" } }}>
                    {/* Fixed Columns */}
                    <TableCell
                      sx={{
                        position: "sticky",
                        left: 0,
                        zIndex: 1,
                        bgcolor: "#fff",
                        borderRight: "1px solid #e2e8f0",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                      }}
                    >
                      {displayUserName}
                    </TableCell>

                    <TableCell
                      sx={{
                        position: "sticky",
                        left: 110,
                        zIndex: 1,
                        bgcolor: "#fff",
                        borderRight: "1px solid #e2e8f0",
                        fontSize: "0.85rem",
                      }}
                    >
                      {task.trade_name || "-"}
                    </TableCell>

                    <TableCell
                      sx={{
                        position: "sticky",
                        left: 220,
                        zIndex: 1,
                        bgcolor: "#fff",
                        borderRight: "1px solid #e2e8f0",
                        fontSize: "0.85rem",
                      }}
                    >
                      {task.category_name || "-"}
                    </TableCell>

                    <TableCell
                      sx={{
                        position: "sticky",
                        left: 350,
                        zIndex: 1,
                        bgcolor: "#fff",
                        borderRight: "1px solid #e2e8f0",
                        fontSize: "0.85rem",
                      }}
                    >
                      {task.sub_category_name || "-"}
                    </TableCell>

                    <TableCell
                      sx={{
                        position: "sticky",
                        left: 490,
                        zIndex: 1,
                        bgcolor: "#fff",
                        borderRight: "2px solid #cbd5e1",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                      }}
                    >
                      ${basePriceFormatted}
                    </TableCell>

                    {/* Dynamic Project Cells */}
                    {displayedProjects.map((project) => {
                      const key = `${task.id}_${project.id}`;
                      const cellState = matrix[key];
                      const isActive = cellState?.is_active ?? false;
                      const priceVal = cellState?.price ?? basePriceFormatted;

                      return (
                        <TableCell
                          key={project.id}
                          align="center"
                          sx={{ borderRight: "1px solid #e2e8f0", px: 1.5, py: 1 }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                            <IOSSwitch
                              checked={isActive}
                              onChange={() => handleToggle(task.id, project.id, basePriceFormatted)}
                            />

                            <TextField
                              size="small"
                              value={isActive ? priceVal : basePriceFormatted}
                              onChange={(e) => handlePriceChange(task.id, project.id, e.target.value)}
                              disabled={!isActive}
                              placeholder="0.00"
                              InputProps={{
                                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                              }}
                              sx={{
                                width: 90,
                                "& .MuiInputBase-input": {
                                  fontSize: "0.825rem",
                                  py: 0.5,
                                  px: 0.5,
                                  fontWeight: isActive ? 600 : 400,
                                  color: isActive ? "#0f172a" : "#94a3b8",
                                },
                                "& .MuiOutlinedInput-root": {
                                  borderRadius: "6px",
                                  bgcolor: isActive ? "#fff" : "#f8fafc",
                                },
                              }}
                            />
                          </Box>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default TaskPricingMatrix;
