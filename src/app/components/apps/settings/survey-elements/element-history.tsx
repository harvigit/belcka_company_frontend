"use client";

import React, { useEffect, useState } from "react";
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { IconX } from "@tabler/icons-react";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import api from "@/utils/axios";

type ElementVersion = {
  id: number;
  version_number: number;
  summary: string;
  created_at: string;
  user_name: string;
  is_latest?: boolean;
};

const errorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || fallback;

const ElementHistoryDialog = ({
  elementId,
  elementName,
  open,
  onClose,
  onRestored,
}: {
  elementId: number | null;
  elementName: string;
  open: boolean;
  onClose: () => void;
  onRestored: () => void;
}) => {
  const [rows, setRows] = useState<ElementVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<ElementVersion | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!elementId) return;
    setLoading(true);
    try {
      const res = await api.get(`survey-elements/versions?element_id=${elementId}`);
      setRows(Array.isArray(res.data?.info) ? res.data.info : []);
    } catch (error) {
      console.error(error);
      toast.error(errorMessage(error, "Failed to load version history"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !elementId) return;
    void load();
  }, [open, elementId]);

  const restore = async () => {
    if (!elementId || !restoreTarget) return;
    setSaving(true);
    try {
      const res = await api.post("survey-elements/restore", {
        element_id: elementId,
        version_id: restoreTarget.id,
      });
      if (res.data?.IsSuccess) {
        toast.success(res.data.message || "Version restored");
        setRestoreTarget(null);
        await load();
        onRestored();
      } else {
        toast.error(res.data?.message || "Failed to restore version");
      }
    } catch (error) {
      console.error(error);
      toast.error(errorMessage(error, "Failed to restore version"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle sx={{ pr: 6 }}>
          Version history
          <Typography variant="body2" color="text.secondary" fontWeight={400}>
            {elementName || "Element"}
          </Typography>
          <IconButton
            aria-label="Close"
            onClick={onClose}
            sx={{ position: "absolute", right: 12, top: 12 }}
          >
            <IconX size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            New surveys use the latest published version. Restoring keeps this history and adds a new version.
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {["Version", "Date", "User", "Summary", ""].map((label) => (
                    <TableCell key={label || "action"} sx={{ bgcolor: "#f8fafc", py: 1.25 }}>
                      <Typography variant="body2">{label}</Typography>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="text.secondary" py={3} textAlign="center">
                        Loading history...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="text.secondary" py={3} textAlign="center">
                        No published versions yet. Publish this element to start its history.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" fontWeight={600}>
                            v{row.version_number}
                          </Typography>
                          {row.is_latest && (
                            <Chip size="small" label="Latest" color="success" />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {row.created_at ? dayjs(row.created_at).format("DD MMM YYYY, HH:mm") : "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{row.user_name || "Unknown"}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{row.summary || "—"}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        {row.is_latest ? (
                          <Typography variant="caption" color="text.secondary">
                            In use
                          </Typography>
                        ) : (
                          <Button size="small" variant="outlined" onClick={() => setRestoreTarget(row)}>
                            Restore
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(restoreTarget)} onClose={() => setRestoreTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Restore version {restoreTarget ? `v${restoreTarget.version_number}` : ""}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            This publishes that setup as a new version. Older versions stay in the history, and any unsaved edits are replaced.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setRestoreTarget(null)}>
            Cancel
          </Button>
          <Button variant="contained" disabled={saving} onClick={() => void restore()}>
            {saving ? "Restoring..." : "Restore"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ElementHistoryDialog;
