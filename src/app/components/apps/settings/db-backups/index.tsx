"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { IconDatabaseExport, IconDownload, IconRefresh } from "@tabler/icons-react";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import IOSSwitch from "@/app/components/common/IOSSwitch";

type BackupFile = {
  file_name: string;
  size: number;
  created_at: string;
  expires_at: string;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

// Daily database backups (kept for 7 days on the server). Admin only.
const DbBackups = () => {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [savingAuto, setSavingAuto] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchBackups = useCallback(async () => {
    try {
      const res = await api.get("db-backup/list");
      if (res.data?.IsSuccess) {
        setBackups(res.data.info?.backups ?? []);
        setIsRunning(!!res.data.info?.is_running);
        setAutoEnabled(res.data.info?.auto_backup_enabled !== false);
      }
    } catch (err) {
      console.error("Failed to fetch backups", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  // While a backup is in progress, refresh the list until it finishes.
  useEffect(() => {
    if (!isRunning) return;
    pollRef.current = setTimeout(fetchBackups, 5000);
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [isRunning, backups, fetchBackups]);

  const handleCreate = async () => {
    try {
      const res = await api.post("db-backup/create");
      if (res.data?.IsSuccess) {
        toast.success(res.data.message);
        setIsRunning(true);
      }
    } catch (err) {
      console.error("Failed to start backup", err);
    }
  };

  const handleToggleAuto = async (enabled: boolean) => {
    setSavingAuto(true);
    try {
      const res = await api.put("db-backup/settings", { auto_backup_enabled: enabled });
      if (res.data?.IsSuccess) {
        setAutoEnabled(enabled);
        toast.success(res.data.message);
      }
    } catch (err) {
      console.error("Failed to update auto backup setting", err);
    } finally {
      setSavingAuto(false);
    }
  };

  const handleDownload = async (fileName: string) => {
    setDownloading(fileName);
    try {
      const res = await api.get(`db-backup/download/${encodeURIComponent(fileName)}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download backup", err);
      toast.error("Failed to download backup");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Box p={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} gap={2} flexWrap="wrap">
        <Box>
          <Typography variant="h5">Database Backups</Typography>
          <Typography variant="body2" color="text.secondary">
            {autoEnabled
              ? "A backup is created automatically every day at end of day."
              : "Auto backup is turned off. Use Backup Now to create one manually."}{" "}
            Each backup is kept for 7 days and then deleted.
          </Typography>
        </Box>
        <Stack direction="row" gap={1} alignItems="center">
          <FormControlLabel
            sx={{ mr: 1, gap: 1 }}
            control={
              <IOSSwitch
                checked={autoEnabled}
                disabled={loading || savingAuto}
                onChange={(e) => handleToggleAuto(e.target.checked)}
              />
            }
            label="Auto Backup"
          />
          <Tooltip title="Refresh">
            <IconButton onClick={fetchBackups}>
              <IconRefresh size={20} />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={isRunning}
            startIcon={isRunning ? <CircularProgress size={16} color="inherit" /> : <IconDatabaseExport size={18} />}
          >
            {isRunning ? "Backup in progress..." : "Backup Now"}
          </Button>
        </Stack>
      </Stack>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>File Name</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Auto Delete On</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : backups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="text.secondary">No backups found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              backups.map((backup) => (
                <TableRow key={backup.file_name} hover>
                  <TableCell>{backup.file_name}</TableCell>
                  <TableCell>{dayjs(backup.created_at).format("DD/MM/YYYY HH:mm")}</TableCell>
                  <TableCell>{formatSize(backup.size)}</TableCell>
                  <TableCell>{dayjs(backup.expires_at).format("DD/MM/YYYY HH:mm")}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleDownload(backup.file_name)}
                      disabled={downloading === backup.file_name}
                      startIcon={
                        downloading === backup.file_name ? <CircularProgress size={14} /> : <IconDownload size={16} />
                      }
                    >
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default DbBackups;
