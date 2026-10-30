"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconDownload,
  IconFileCheck,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import {
  ApprovalTab,
  ContractApproval,
  ContractApprovalsResponse,
  downloadContractPdf,
} from "@/app/components/apps/settings/contracts/contracts-api";

const TABS: { value: ApprovalTab; label: string; color: "warning" | "success" | "error" }[] = [
  { value: "awaiting", label: "Awaiting approval", color: "warning" },
  { value: "approved", label: "Approved", color: "success" },
  { value: "rejected", label: "Rejected", color: "error" },
];

type ReviewAction = { type: "approve" | "reject"; contract: ContractApproval };

const errorMessage = (error: any, fallback: string) => error?.response?.data?.message || fallback;

const ContractApprovals = () => {
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const companyId = Number(user?.company_id) || 0;

  const [tab, setTab] = useState<ApprovalTab>("awaiting");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [templateId, setTemplateId] = useState<number | "">("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [data, setData] = useState<ContractApprovalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [action, setAction] = useState<ReviewAction | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => setPage(0), [tab, debouncedSearch, templateId]);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await api.get("contracts/approvals", {
        params: {
          company_id: companyId,
          status: tab,
          search: debouncedSearch || undefined,
          template_id: templateId || undefined,
          page: page + 1,
          limit: rowsPerPage,
        },
      });
      setData(res.data?.info ?? null);
    } catch (error) {
      toast.error(errorMessage(error, "Failed to load contracts."));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [companyId, tab, debouncedSearch, templateId, page, rowsPerPage]);

  useEffect(() => {
    load();
  }, [load]);

  const download = async (c: ContractApproval) => {
    setDownloading(c.id);
    try {
      await downloadContractPdf(c.id, c.template_title);
    } catch (error) {
      toast.error(errorMessage(error, "Failed to download the contract PDF."));
    } finally {
      setDownloading(null);
    }
  };

  const openAction = (type: ReviewAction["type"], contract: ContractApproval) => {
    setNote("");
    setAction({ type, contract });
  };

  const submitAction = async () => {
    if (!action) return;
    if (action.type === "reject" && !note.trim()) {
      toast.error("Please say why the contract is rejected.");
      return;
    }
    setSaving(true);
    try {
      const res = await api.post(
        `contracts/${action.contract.id}/${action.type}`,
        action.type === "reject" ? { reason: note.trim() } : { note: note.trim() || undefined },
      );
      toast.success(res.data?.message ?? (action.type === "approve" ? "Contract approved." : "Contract rejected."));
      setAction(null);
      load();
    } catch (error) {
      toast.error(errorMessage(error, `Failed to ${action.type} the contract.`));
    } finally {
      setSaving(false);
    }
  };

  const items = data?.items ?? [];
  const showReview = tab !== "awaiting";

  return (
    <Stack spacing={2.5} p={{ xs: 2, md: 3 }}>
      <Box>
        <Typography variant="h5" fontWeight={600}>
          Contract Approvals
        </Typography>
        <Typography variant="body2" color="textSecondary" mt={0.5}>
          Review contracts your users have signed. Approve them, or reject them with a reason so the user signs again.
        </Typography>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ borderBottom: 1, borderColor: "divider", minHeight: 44, "& .MuiTab-root": { minHeight: 44, px: 2 } }}
      >
        {TABS.map((t) => (
          <Tab
            key={t.value}
            value={t.value}
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <span>{t.label}</span>
                <Chip size="small" color={t.color} variant={tab === t.value ? "filled" : "outlined"} label={data?.counts?.[t.value] ?? 0} />
              </Stack>
            }
          />
        ))}
      </Tabs>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <TextField
          size="small"
          placeholder="Search user"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: { xs: "100%", sm: 280 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconSearch size={16} />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          select
          size="small"
          label="Contract"
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value === "" ? "" : Number(e.target.value))}
          SelectProps={{ displayEmpty: true }}
          InputLabelProps={{ shrink: true }}
          sx={{ width: { xs: "100%", sm: 260 } }}
        >
          <MenuItem value="">All contracts</MenuItem>
          {(data?.templates ?? []).map((t) => (
            <MenuItem key={t.id} value={t.id}>
              {t.title}
            </MenuItem>
          ))}
        </TextField>
        {templateId !== "" && (
          <Tooltip title="Clear filter">
            <Button
              color="error"
              variant="outlined"
              onClick={() => setTemplateId("")}
              sx={{ alignSelf: { xs: "flex-start", sm: "center" }, height: 40, minWidth: 64, px: 1.5 }}
              aria-label="Clear contract filter"
            >
              <IconX size={18} />
            </Button>
          </Tooltip>
        )}
      </Stack>

      <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 760, "& td, & th": { py: 1.25 } }}>
            <TableHead sx={{ bgcolor: "action.hover" }}>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Contract</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Signed</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Expires</TableCell>
                {showReview && <TableCell sx={{ fontWeight: 600 }}>Reviewed</TableCell>}
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : !items.length ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, borderBottom: 0 }}>
                    <Stack alignItems="center" spacing={1} color="text.secondary">
                      <IconFileCheck size={36} stroke={1.5} />
                      <Typography fontWeight={600} color="textPrimary">
                        {tab === "awaiting" ? "Nothing waiting for approval" : `No ${tab} contracts`}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {debouncedSearch || templateId
                          ? "Try a different search or contract."
                          : tab === "awaiting"
                            ? "Contracts appear here as soon as a user signs them."
                            : "Reviewed contracts will be listed here."}
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((c) => {
                  const open = expanded === c.id;
                  return (
                    <React.Fragment key={c.id}>
                      <TableRow hover sx={{ "& > td": { borderBottom: open ? 0 : undefined } }}>
                        <TableCell padding="checkbox">
                          <IconButton
                            size="small"
                            aria-label={open ? "Hide details" : "Show details"}
                            onClick={() => setExpanded(open ? null : c.id)}
                          >
                            {open ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                          </IconButton>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1.25} alignItems="center">
                            <Avatar
                              src={c.user_thumb_image || c.user_image || "/images/users/user.png"}
                              alt={c.user_name ?? ""}
                              sx={{ width: 32, height: 32 }}
                            />
                            <Typography variant="body2" fontWeight={600}>
                              {c.user_name ?? `User ${c.user_id}`}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          {c.template_title ?? "Contract"}
                          <Typography variant="caption" color="textSecondary" display="block">
                            v{c.version_no}
                          </Typography>
                        </TableCell>
                        <TableCell>{c.signed_at ?? "—"}</TableCell>
                        <TableCell>{c.expires_at ?? "No expiry"}</TableCell>
                        {showReview && (
                          <TableCell sx={{ maxWidth: 260 }}>
                            <Typography variant="body2">{c.reviewed_by_name ?? "—"}</Typography>
                            <Typography variant="caption" color="textSecondary" display="block">
                              {c.reviewed_at}
                            </Typography>
                            {c.review_note && (
                              <Typography
                                variant="caption"
                                color={tab === "rejected" ? "error" : "textSecondary"}
                                display="block"
                                sx={{ wordBreak: "break-word" }}
                              >
                                {c.review_note}
                              </Typography>
                            )}
                          </TableCell>
                        )}
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                            <Tooltip title="Download PDF">
                              <span>
                                <IconButton
                                  color="primary"
                                  disabled={!c.has_pdf || downloading === c.id}
                                  onClick={() => download(c)}
                                  aria-label="Download PDF"
                                >
                                  <IconDownload size={18} />
                                </IconButton>
                              </span>
                            </Tooltip>
                            {tab === "awaiting" && (
                              <Tooltip title={c.can_review ? "" : "You can't review your own contract."}>
                                <span>
                                  <Stack direction="row" spacing={0.5}>
                                    <Button
                                      size="small"
                                      color="success"
                                      variant="contained"
                                      startIcon={<IconCheck size={16} />}
                                      disabled={!c.can_review}
                                      onClick={() => openAction("approve", c)}
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      size="small"
                                      color="error"
                                      variant="outlined"
                                      startIcon={<IconX size={16} />}
                                      disabled={!c.can_review}
                                      onClick={() => openAction("reject", c)}
                                    >
                                      Reject
                                    </Button>
                                  </Stack>
                                </span>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={7} sx={{ py: 0 }}>
                          <Collapse in={open} unmountOnExit>
                            <Box py={2} pl={{ xs: 0, sm: 6 }}>
                              <Stack direction={{ xs: "column", md: "row" }} spacing={4}>
                                <Box flex={1}>
                                  <Typography variant="subtitle2" mb={1}>
                                    Form answers
                                  </Typography>
                                  {c.form_answers.length ? (
                                    <Stack spacing={0.5}>
                                      {c.form_answers.map((a) => (
                                        <Typography key={a.key} variant="body2" sx={{ wordBreak: "break-word" }}>
                                          <b>{a.label}:</b> {a.display}
                                        </Typography>
                                      ))}
                                    </Stack>
                                  ) : (
                                    <Typography variant="body2" color="textSecondary">
                                      No form fields on this contract.
                                    </Typography>
                                  )}
                                  {c.day_rate != null && (
                                    <Typography variant="body2" mt={1}>
                                      <b>Day rate:</b> {Number(c.day_rate).toFixed(2)}
                                    </Typography>
                                  )}
                                </Box>
                                <Box flex={1}>
                                  <Typography variant="subtitle2" mb={1}>
                                    Signing record
                                  </Typography>
                                  {c.signing_record ? (
                                    <Stack spacing={0.5}>
                                      <Typography variant="body2">
                                        <b>Signed:</b> {c.signing_record.signed_at}
                                      </Typography>
                                      <Typography variant="body2">
                                        <b>IP:</b> {c.signing_record.ip ?? "—"}
                                      </Typography>
                                      <Typography variant="body2">
                                        <b>Device:</b> {c.signing_record.device ?? "—"}
                                      </Typography>
                                      <Typography variant="caption" color="textSecondary" sx={{ wordBreak: "break-all" }}>
                                        SHA-256: {c.signing_record.document_sha256}
                                      </Typography>
                                    </Stack>
                                  ) : (
                                    <Typography variant="body2" color="textSecondary">
                                      —
                                    </Typography>
                                  )}
                                </Box>
                              </Stack>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          sx={{ borderTop: 1, borderColor: "divider" }}
          component="div"
          count={data?.total ?? 0}
          page={page}
          onPageChange={(_, value) => setPage(value)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(Number(e.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[25, 50, 100]}
        />
      </Box>

      <Dialog open={Boolean(action)} onClose={() => !saving && setAction(null)} fullWidth maxWidth="sm">
        <DialogTitle>{action?.type === "approve" ? "Approve contract" : "Reject contract"}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" mb={2}>
            <b>{action?.contract.user_name ?? "User"}</b> signed <b>{action?.contract.template_title}</b> (v
            {action?.contract.version_no}) on {action?.contract.signed_at}.
          </Typography>
          {action?.type === "reject" && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              The signed copy will be marked as rejected and the user will be asked to sign the contract again. They
              will see your reason.
            </Alert>
          )}
          <TextField
            fullWidth
            multiline
            minRows={3}
            autoFocus
            label={action?.type === "reject" ? "Reason for rejecting" : "Note (optional)"}
            required={action?.type === "reject"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            inputProps={{ maxLength: 1000 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAction(null)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={action?.type === "approve" ? "success" : "error"}
            onClick={submitAction}
            disabled={saving || (action?.type === "reject" && !note.trim())}
          >
            {saving ? <CircularProgress size={18} color="inherit" /> : action?.type === "approve" ? "Approve" : "Reject"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default ContractApprovals;
