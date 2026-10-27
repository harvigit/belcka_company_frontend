"use client";

import React, { useEffect, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  CircularProgress,
} from "@mui/material";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import api from "@/utils/axios";

interface Props {
  templateId: number | null;
  onClose: () => void;
}

/** Shows the contract as a user will see it, optionally with a real user's details. */
const ContractPreviewDialog = ({ templateId, onClose }: Props) => {
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const companyId = Number(user?.company_id) || 0;
  const [users, setUsers] = useState<{ user_id: number; name: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ user_id: number; name: string } | null>(null);
  const [html, setHtml] = useState("");
  const [missing, setMissing] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!templateId || !companyId) return;
    api
      .get("contracts/users", { params: { company_id: companyId }, skipToast: true } as any)
      .then((res) => setUsers(res.data?.info?.users ?? []))
      .catch(() => setUsers([]));
  }, [templateId, companyId]);

  useEffect(() => {
    if (!templateId) return;
    setLoading(true);
    api
      .get(`contracts/templates/${templateId}/preview`, {
        params: { company_id: companyId, ...(selectedUser ? { user_id: selectedUser.user_id } : {}) },
      })
      .then((res) => {
        setHtml(res.data?.info?.html ?? "");
        setMissing(res.data?.info?.missing_user_fields ?? []);
      })
      .catch((error) => console.error(error))
      .finally(() => setLoading(false));
  }, [templateId, selectedUser, companyId]);

  useEffect(() => {
    if (!templateId) setSelectedUser(null);
  }, [templateId]);

  return (
    <Dialog open={Boolean(templateId)} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Preview as user</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Autocomplete
            options={users}
            value={selectedUser}
            onChange={(_, value) => setSelectedUser(value)}
            getOptionLabel={(o) => o.name}
            isOptionEqualToValue={(a, b) => a.user_id === b.user_id}
            renderInput={(params) => (
              <TextField {...params} size="small" label="Fill in with a user’s details (optional)" />
            )}
          />
          {selectedUser && missing.length > 0 && (
            <Alert severity="warning">Missing for this user: {missing.join(", ")}</Alert>
          )}
          {loading ? (
            <Box display="flex" justifyContent="center" py={4}><CircularProgress size={28} /></Box>
          ) : (
            <Box
              component="iframe"
              title="Contract preview"
              // No scripts: the wording is sanitised on the server, this is a second guard.
              sandbox=""
              srcDoc={html}
              sx={{ width: "100%", height: "65vh", border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "#fff" }}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ContractPreviewDialog;
