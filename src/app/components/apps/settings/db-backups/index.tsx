"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Table,
  TextField,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  IconAlertTriangle,
  IconDatabaseExport,
  IconDownload,
  IconRefresh,
  IconRestore,
} from "@tabler/icons-react";
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

type RestoreResult = {
  file_name: string;
  status: "success" | "rolled_back" | "failed";
  message: string;
  safety_backup: string | null;
  finished_at: string;
};

const RESTORE_CONFIRM_TEXT = "RESTORE";

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [startingRestore, setStartingRestore] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastRestore, setLastRestore] = useState<RestoreResult | null>(null);

  const fetchBackups = useCallback(async () => {
    try {
      const res = await api.get("db-backup/list");
      if (res.data?.IsSuccess) {
        setBackups(res.data.info?.backups ?? []);
        setIsRunning(!!res.data.info?.is_running);
        setAutoEnabled(res.data.info?.auto_backup_enabled !== false);
        setIsRestoring(!!res.data.info?.is_restoring);
        setLastRestore(res.data.info?.last_restore ?? null);
        return res.data.info?.last_restore as RestoreResult | null;
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

  // During a restore the user/company tables are dropped, so only the public status endpoint is polled
  // (an authenticated call would 401 and log the admin out).
  useEffect(() => {
    if (!isRestoring) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const res = await api.get("db-backup/restore-status", {
          skipToast: true,
        } as any);
        if (cancelled || res.data?.info?.is_restoring) return;
        clearInterval(timer);
        setIsRestoring(false);
        const result = await fetchBackups();
        if (result?.status === "success") toast.success(result.message);
        else if (result) toast.error(result.message, { duration: 10000 });
      } catch {
        // Server busy or restarting; keep waiting.
      }
    }, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isRestoring, fetchBackups]);

  const closeRestoreDialog = () => {
    if (startingRestore) return;
    setRestoreTarget(null);
    setConfirmText("");
  };

  const handleRestore = async () => {
    if (!restoreTarget || confirmText !== RESTORE_CONFIRM_TEXT) return;
    setStartingRestore(true);
    try {
      const res = await api.post(
        `db-backup/restore/${encodeURIComponent(restoreTarget)}`,
        {
          confirm: RESTORE_CONFIRM_TEXT,
        },
      );
      if (res.data?.IsSuccess) {
        setRestoreTarget(null);
        setConfirmText("");
        setLastRestore(null);
        setIsRestoring(true);
      }
    } catch (err) {
      console.error("Failed to start restore", err);
    } finally {
      setStartingRestore(false);
    }
  };

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
      const res = await api.put("db-backup/settings", {
        auto_backup_enabled: enabled,
      });
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
      const res = await api.get(
        `db-backup/download/${encodeURIComponent(fileName)}`,
        {
          responseType: "blob",
        },
      );
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
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
        gap={2}
        flexWrap="wrap"
      >
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
            disabled={isRunning || isRestoring}
            startIcon={
              isRunning ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <IconDatabaseExport size={18} />
              )
            }
          >
            {isRunning ? "Backup in progress..." : "Backup Now"}
          </Button>
        </Stack>
      </Stack>

      {lastRestore && (
        <Alert
          severity={lastRestore.status === "success" ? "success" : "error"}
          sx={{ mb: 2 }}
          onClose={() => setLastRestore(null)}
        >
          {dayjs(lastRestore.finished_at).format("DD/MM/YYYY HH:mm")} —{" "}
          {lastRestore.message}
          {lastRestore.status === "success" && lastRestore.safety_backup
            ? ` Data from before the restore was saved as ${lastRestore.safety_backup}.`
            : ""}
        </Alert>
      )}

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
                  <Typography color="text.secondary">
                    No backups found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              backups.map((backup) => (
                <TableRow key={backup.file_name} hover>
                  <TableCell>
                    {backup.file_name}
                    {backup.file_name.startsWith("db_backup_pre_restore_") && (
                      <Chip
                        label="Before restore"
                        size="small"
                        color="warning"
                        variant="outlined"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {dayjs(backup.created_at).format("DD/MM/YYYY HH:mm")}
                  </TableCell>
                  <TableCell>{formatSize(backup.size)}</TableCell>
                  <TableCell>
                    {dayjs(backup.expires_at).format("DD/MM/YYYY HH:mm")}
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" gap={1} justifyContent="flex-end">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleDownload(backup.file_name)}
                        disabled={downloading === backup.file_name}
                        startIcon={
                          downloading === backup.file_name ? (
                            <CircularProgress size={14} />
                          ) : (
                            <IconDownload size={16} />
                          )
                        }
                      >
                        Download
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => setRestoreTarget(backup.file_name)}
                        disabled={isRunning || isRestoring}
                        startIcon={<IconRestore size={16} />}
                      >
                        Restore
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={!!restoreTarget}
        onClose={closeRestoreDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconAlertTriangle size={22} color="#d32f2f" />
          Restore Database
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <strong>All tables in the current database will be dropped</strong>{" "}
            and replaced with the data from <strong>{restoreTarget}</strong>.
            This affects every company, and any changes made after this backup
            was created will be lost.
          </Alert>
          <Typography variant="body2" mb={1}>
            Before anything is dropped, a backup of the current database is
            taken automatically (it will appear in this list as &quot;Before
            restore&quot;). The app will be unavailable while the restore runs,
            which can take a few minutes.
          </Typography>
          <Typography variant="body2" mb={1}>
            Type <strong>{RESTORE_CONFIRM_TEXT}</strong> to confirm.
          </Typography>
          <TextField
            fullWidth
            size="small"
            autoFocus
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={RESTORE_CONFIRM_TEXT}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRestoreDialog} disabled={startingRestore}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRestore}
            disabled={confirmText !== RESTORE_CONFIRM_TEXT || startingRestore}
            startIcon={
              startingRestore ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <IconRestore size={18} />
              )
            }
          >
            Restore
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isRestoring} disableEscapeKeyDown maxWidth="xs" fullWidth>
        <DialogContent sx={{ textAlign: "center", py: 4 }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="h6" mb={1}>
            Restoring database...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Taking a safety backup, then importing the selected file. Please
            keep this page open; this can take a few minutes.
          </Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default DbBackups;
