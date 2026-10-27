"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  CircularProgress,
} from "@mui/material";
import { IconEdit, IconEye, IconPlus, IconTrash, IconUsers } from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import IOSSwitch from "@/app/components/common/IOSSwitch";
import ContractPreviewDialog from "./ContractPreviewDialog";
import PublishDialog, { PublishAssignment } from "./PublishDialog";
import {
  ContractSigner,
  ContractTemplateRow,
} from "./contracts-api";

const card = {
  bgcolor: "background.paper",
  border: 1,
  borderColor: "divider",
  borderRadius: 2,
};

interface Overview {
  signed_valid: number;
  waiting_to_sign: number;
  details_missing: number;
  expiring_30_days: number;
}

const ContractsSettings = () => {
  const router = useRouter();
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const companyId = Number(user?.company_id) || 0;

  const [overview, setOverview] = useState<Overview | null>(null);
  const [templates, setTemplates] = useState<ContractTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContractTemplateRow | null>(null);
  const [signers, setSigners] = useState<ContractSigner[]>([]);
  const [signersLoading, setSignersLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Who signed the template, so the manager sees whose signed copies disappear.
  useEffect(() => {
    if (!deleteTarget) return;
    setSigners([]);
    setSignersLoading(true);
    api
      .get(`contracts/templates/${deleteTarget.id}/signers`)
      .then((res) => setSigners(res.data?.info ?? []))
      .catch((error) => console.error(error))
      .finally(() => setSignersLoading(false));
  }, [deleteTarget]);
  const [assignTarget, setAssignTarget] = useState<ContractTemplateRow | null>(null);
  const [assigning, setAssigning] = useState(false);

  const loadAll = useCallback(async () => {
    if (!companyId) return;
    const params = { company_id: companyId };
    try {
      const [o, t] = await Promise.all([
        api.get("contracts/overview", { params }),
        api.get("contracts/templates", { params }),
      ]);
      setOverview(o.data?.info ?? null);
      setTemplates(t.data?.info ?? []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  /** The contract's own switch: users must sign before they can start work. */
  const toggleRequired = async (t: ContractTemplateRow, isRequired: boolean) => {
    setTemplates((rows) => rows.map((row) => (row.id === t.id ? { ...row, is_required: isRequired } : row)));
    try {
      const res = await api.post(`contracts/templates/${t.id}/update`, { is_required: isRequired });
      toast.success(
        isRequired
          ? "Users must now sign this contract before they can start work."
          : "Users are asked to sign, but can start work without it.",
      );
      void res;
      loadAll();
    } catch (error) {
      console.error(error);
      loadAll();
    }
  };

  const assignUsers = async (assignment: PublishAssignment) => {
    if (!assignTarget) return;
    setAssigning(true);
    try {
      const res = await api.post(`contracts/templates/${assignTarget.id}/assign`, assignment);
      toast.success(res.data?.message || "Users assigned");
      setAssignTarget(null);
      loadAll();
      // Requests are opened in the background; refresh the numbers once it's done.
      setTimeout(loadAll, 3000);
    } catch (error) {
      console.error(error);
    } finally {
      setAssigning(false);
    }
  };

  const deleteTemplate = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api.post(`contracts/templates/${deleteTarget.id}/delete`);
      toast.success(res.data?.message || "Deleted");
      setDeleteTarget(null);
      loadAll();
    } catch (error) {
      console.error(error);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Box p={3}>
        <Box display="flex" justifyContent="center" py={4}><CircularProgress size={28} /></Box>
      </Box>
    );
  }

  const tiles = [
    { label: "Signed and valid", value: overview?.signed_valid, color: "success.dark" },
    { label: "Waiting to sign", value: overview?.waiting_to_sign, color: "warning.dark" },
    { label: "Blocked: details missing", value: overview?.details_missing, color: "error.main" },
    { label: "Expiring in 30 days", value: overview?.expiring_30_days, color: "text.primary" },
  ];

  return (
    <Stack spacing={2} p={2}>
      {/* Tiles */}
      <Grid container spacing={2}>
        {tiles.map((tile) => (
          <Grid key={tile.label} size={{ xs: 6, md: 3 }}>
            <Box sx={{ ...card, p: 2 }}>
              <Typography variant="body2" color="textSecondary">
                {tile.label}
              </Typography>
              <Typography variant="h3" color={tile.color}>
                {tile.value ?? 0}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Templates */}
      <Box sx={card}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ md: "center" }}
          sx={{ p: 2.5, borderBottom: 1, borderColor: "divider" }}
        >
          <Box>
            <Typography variant="h6">Contract templates</Typography>
            <Typography variant="body2" color="textSecondary">
              Wording is written once. Belcka fills in each user’s name, company and day rate.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<IconPlus size={16} />}
            onClick={() => router.push("/apps/contracts/templates/new")}
          >
            New template
          </Button>
        </Stack>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Template</TableCell>
                <TableCell>Groups</TableCell>
                <TableCell>Version</TableCell>
                <TableCell>Signed</TableCell>
                <TableCell>Last published</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Required to start work</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {templates.map((t) => {
                const total = t.signed_count + t.pending_count;
                const percent = total ? Math.round((t.signed_count / total) * 100) : 0;
                return (
                  <TableRow key={t.id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{t.title}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {t.status === "DRAFT" ? "Not published yet" : `${t.field_count} auto-fill fields`}
                        {t.has_unpublished_changes ? " · unpublished changes" : ""}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {t.groups.length ? (
                          t.groups.map((g) => (
                            <Chip key={g.id} size="small" color="primary" variant="outlined" label={g.name} />
                          ))
                        ) : (
                          <Typography variant="caption" color="warning.main">
                            No groups · nobody is asked to sign
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {t.latest_version ? (
                        <>
                          v{t.latest_version.version_no}{" "}
                          <Typography component="span" variant="caption" color="textSecondary">
                            · {t.latest_version.change_type === "MAJOR" ? "Major" : "Minor"}
                          </Typography>
                        </>
                      ) : (
                        "Draft"
                      )}
                    </TableCell>
                    <TableCell sx={{ minWidth: 140 }}>
                      {t.latest_version ? (
                        <>
                          <Typography variant="body2">
                            {t.signed_count} of {total}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={percent}
                            color={percent >= 90 ? "success" : "warning"}
                            sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
                          />
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {t.latest_version ? (
                        <Typography variant="body2" color="textSecondary">
                          {t.latest_version.published_at}
                          <br />
                          by {t.latest_version.published_by_name}
                        </Typography>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {!t.is_active ? (
                        <Chip size="small" label="Inactive" />
                      ) : t.status === "PUBLISHED" ? (
                        <Chip size="small" color="success" label="Published" />
                      ) : (
                        <Chip size="small" variant="outlined" label="Draft" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <IOSSwitch
                          checked={t.is_required}
                          onChange={(e) => toggleRequired(t, e.target.checked)}
                          inputProps={{ "aria-label": `Required to start work: ${t.title}` }}
                        />
                        <Box>
                          <Typography variant="body2">{t.is_required ? "Required" : "Optional"}</Typography>
                          <Typography variant="caption" color="textSecondary" component="div">
                            {[
                              t.expiry_months ? `Expires after ${t.expiry_months} months` : "No expiry",
                              t.is_required && t.required_from ? `from ${t.required_from}` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton color="primary" onClick={() => router.push(`/apps/contracts/templates/${t.id}`)}>
                          <IconEdit size={18} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Assign users">
                        <IconButton color="primary" onClick={() => setAssignTarget(t)}>
                          <IconUsers size={18} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Preview">
                        <IconButton onClick={() => setPreviewId(t.id)}>
                          <IconEye size={18} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton color="error" onClick={() => setDeleteTarget(t)}>
                          <IconTrash size={18} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!templates.length && (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Typography color="textSecondary" py={2} textAlign="center">
                      No contract templates yet. Create one to start collecting signatures.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Typography variant="body2" color="textSecondary" sx={{ px: 2.5, py: 1.5, borderTop: 1, borderColor: "divider" }}>
          {templates.length} template{templates.length === 1 ? "" : "s"} · A group can use several templates. Users sign each one assigned to them.
        </Typography>
      </Box>

      <ContractPreviewDialog templateId={previewId} onClose={() => setPreviewId(null)} />

      <PublishDialog
        open={Boolean(assignTarget)}
        assignOnly
        templateId={assignTarget?.id ?? null}
        title={assignTarget?.title ?? ""}
        nextVersion={0}
        isFirstVersion={false}
        isRequired={assignTarget?.is_required ?? true}
        companyId={companyId}
        groups={assignTarget?.groups ?? []}
        publishing={assigning}
        onClose={() => setAssignTarget(null)}
        onPublish={(_type, _note, assignment) => assignUsers(assignment)}
      />

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Delete “{deleteTarget?.title}”?</DialogTitle>
        <DialogContent dividers>
          {signersLoading ? (
            <Box display="flex" justifyContent="center" py={3}>
              <CircularProgress size={24} />
            </Box>
          ) : signers.length ? (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                {signers.length === 1 ? "1 user has" : `${signers.length} users have`} signed this contract. After
                deleting, it won’t show in their contracts in the app any more.
              </Alert>
              <Typography variant="subtitle2" mb={1}>
                Signed by
              </Typography>
              <Box sx={{ maxHeight: 280, overflowY: "auto", border: 1, borderColor: "divider", borderRadius: 2 }}>
                {signers.map((s) => (
                  <Stack
                    key={s.user_id}
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: "divider", "&:last-child": { borderBottom: 0 } }}
                  >
                    <Avatar sx={{ width: 30, height: 30, fontSize: 12 }}>
                      {(s.name ?? "?").split(" ").map((p) => p[0]).join("").slice(0, 2)}
                    </Avatar>
                    <Box minWidth={0}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {s.name ?? `User ${s.user_id}`}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Signed v{s.version_no} · {s.signed_at}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Box>
              <Typography variant="body2" color="textSecondary" mt={2}>
                Open signing requests are cancelled too.
              </Typography>
            </>
          ) : (
            <Typography>Nobody has signed this contract yet. Open signing requests are cancelled.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button color="error" variant="contained" disabled={signersLoading || deleting} onClick={deleteTemplate}>
            {deleting ? "Deleting..." : signers.length ? "Delete anyway" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default ContractsSettings;
