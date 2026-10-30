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
  Divider,
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
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import Image from "next/image";
import {
  ApprovalTab,
  ContractApproval,
  ContractApprovalsResponse,
  downloadContractPdf,
} from "@/app/components/apps/settings/contracts/contracts-api";

const TABS: {
  value: ApprovalTab;
  label: string;
  color: "warning" | "success" | "error";
}[] = [
  { value: "awaiting", label: "Awaiting approval", color: "warning" },
  { value: "approved", label: "Approved", color: "success" },
  { value: "rejected", label: "Rejected", color: "error" },
];

type ReviewAction = {
  type: "approve" | "reject";
  contracts: ContractApproval[];
};

const errorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || fallback;

const ContractApprovals = () => {
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const companyId = Number(user?.company_id) || 0;

  const [tab, setTab] = useState<ApprovalTab>("awaiting");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [templateId, setTemplateId] = useState<number | "">("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [data, setData] = useState<ContractApprovalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [action, setAction] = useState<ReviewAction | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => setPage(0), [tab, debouncedSearch, templateId]);

  useEffect(
    () => setSelected([]),
    [tab, debouncedSearch, templateId, page, rowsPerPage],
  );

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

  const openAction = (
    type: ReviewAction["type"],
    contracts: ContractApproval[],
  ) => {
    setNote("");
    setAction({ type, contracts });
  };

  const submitAction = async () => {
    if (!action) return;
    if (action.type === "reject" && !note.trim()) {
      toast.error("Please say why the contract is rejected.");
      return;
    }
    setSaving(true);
    try {
      if (action.contracts.length === 1) {
        const res = await api.post(
          `contracts/${action.contracts[0].id}/${action.type}`,
          action.type === "reject"
            ? { reason: note.trim() }
            : { note: note.trim() || undefined },
        );
        toast.success(
          res.data?.message ??
            (action.type === "approve"
              ? "Contract approved."
              : "Contract rejected."),
        );
      } else {
        const res = await api.post("contracts/approvals/bulk", {
          action: action.type,
          contract_ids: action.contracts.map((c) => c.id),
          note: note.trim() || undefined,
        });
        const failed: number = res.data?.info?.failed?.length ?? 0;
        (failed ? toast.error : toast.success)(
          res.data?.message ?? "Contracts reviewed.",
        );
      }
      setAction(null);
      setSelected([]);
      load();
    } catch (error) {
      toast.error(
        errorMessage(error, `Failed to ${action.type} the contracts.`),
      );
    } finally {
      setSaving(false);
    }
  };

  const items = data?.items ?? [];
  const showReview = tab !== "awaiting";
  const selectable = tab === "awaiting";
  const reviewable = items.filter((c) => c.can_review);
  const selectedItems = reviewable.filter((c) => selected.includes(c.id));
  const allSelected =
    reviewable.length > 0 && selectedItems.length === reviewable.length;
  const columns = 6 + (selectable ? 1 : 0) + (showReview ? 1 : 0);
  const toggle = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const toggleAll = () =>
    setSelected(allSelected ? [] : reviewable.map((c) => c.id));
  const bulkCount = selectedItems.length;
  const isBulk = (action?.contracts.length ?? 0) > 1;

  // TablePaginationFooter expects a TanStack table; paging here is server-side, so adapt our state to it.
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / rowsPerPage));
  const paginationTable = {
    options: { manualPagination: true },
    getState: () => ({
      pagination: { pageIndex: page, pageSize: rowsPerPage },
    }),
    getRowModel: () => ({ rows: items }),
    getPageCount: () => pageCount,
    getCanPreviousPage: () => page > 0,
    getCanNextPage: () => page + 1 < pageCount,
    setPageIndex: (index: number) =>
      setPage(Math.min(Math.max(index, 0), pageCount - 1)),
    previousPage: () => setPage((p) => Math.max(p - 1, 0)),
    nextPage: () => setPage((p) => Math.min(p + 1, pageCount - 1)),
    setPageSize: (size: number) => {
      setRowsPerPage(size);
      setPage(0);
    },
  };

  return (
    <Stack
      spacing={2.5}
      p={{ xs: 2, md: 3 }}
      pb={{
        xs: selectable && bulkCount > 0 ? 12 : 2,
        md: selectable && bulkCount > 0 ? 12 : 3,
      }}
    >
      <Box>
        <Typography variant="h5" fontWeight={600}>
          Contract Approvals
        </Typography>
        <Typography variant="body2" color="textSecondary" mt={0.5}>
          Review contracts your users have signed. Approve them, or reject them
          with a reason so the user signs again.
        </Typography>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          minHeight: 44,
          "& .MuiTab-root": { minHeight: 44, px: 2 },
        }}
      >
        {TABS.map((t) => (
          <Tab
            key={t.value}
            value={t.value}
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <span>{t.label}</span>
                <Chip
                  size="small"
                  color={t.color}
                  variant={tab === t.value ? "filled" : "outlined"}
                  label={data?.counts?.[t.value] ?? 0}
                />
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
          onChange={(e) =>
            setTemplateId(e.target.value === "" ? "" : Number(e.target.value))
          }
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
              sx={{
                alignSelf: { xs: "flex-start", sm: "center" },
                height: 40,
                minWidth: 64,
                px: 1.5,
              }}
              aria-label="Clear contract filter"
            >
              <IconX size={18} />
            </Button>
          </Tooltip>
        )}
      </Stack>

      <Box>
        <Divider />
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table
            stickyHeader
            sx={{
              minWidth: 900,
              tableLayout: "auto",
              "& thead th": {
                py: 1.5,
                px: "10px",
                fontWeight: 500,
                whiteSpace: "nowrap",
                fontSize: "0.875rem",
              },
              "& tbody td": { padding: "10px" },
            }}
          >
            <TableHead>
              <TableRow>
                {selectable && (
                  <TableCell padding="checkbox">
                    <CustomCheckbox
                      className="header-checkbox"
                      checked={allSelected}
                      indeterminate={bulkCount > 0 && !allSelected}
                      disabled={loading || !reviewable.length}
                      onChange={toggleAll}
                      inputProps={{ "aria-label": "Select all contracts" }}
                    />
                  </TableCell>
                )}
                <TableCell padding="checkbox" />
                <TableCell>User</TableCell>
                <TableCell>Contract</TableCell>
                <TableCell>Signed</TableCell>
                <TableCell>Expires</TableCell>
                {showReview && <TableCell>Reviewed</TableCell>}
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <SkeletonLoader
                  columns={Array.from({ length: columns }, (_, i) => ({
                    name: String(i),
                  }))}
                  rowCount={6}
                />
              ) : !items.length ? (
                <TableRow>
                  <TableCell colSpan={columns} sx={{ borderBottom: 0 }}>
                    <Stack
                      alignItems="center"
                      justifyContent="center"
                      spacing={1}
                      sx={{ minHeight: "calc(50vh - 100px)" }}
                    >
                      <Image
                        src="/images/no-data.png"
                        alt="No data"
                        width={200}
                        height={200}
                        style={{ maxWidth: "100%", height: "auto" }}
                      />
                      <Typography
                        className="f-14"
                        fontWeight={600}
                        color="textPrimary"
                      >
                        {tab === "awaiting"
                          ? "Nothing waiting for approval"
                          : `No ${tab} contracts`}
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
                      <TableRow
                        hover
                        selected={selected.includes(c.id)}
                        sx={{
                          transition: "background-color 0.2s ease",
                          "& > td": { borderBottom: open ? 0 : undefined },
                        }}
                      >
                        {selectable && (
                          <TableCell padding="checkbox">
                            <CustomCheckbox
                              checked={selected.includes(c.id)}
                              disabled={!c.can_review}
                              onChange={() => toggle(c.id)}
                              inputProps={{
                                "aria-label": `Select ${c.user_name ?? "contract"}`,
                              }}
                            />
                          </TableCell>
                        )}
                        <TableCell padding="checkbox">
                          <IconButton
                            size="small"
                            aria-label={open ? "Hide details" : "Show details"}
                            onClick={() => setExpanded(open ? null : c.id)}
                          >
                            {open ? (
                              <IconChevronUp size={16} />
                            ) : (
                              <IconChevronDown size={16} />
                            )}
                          </IconButton>
                        </TableCell>
                        <TableCell>
                          <Stack
                            direction="row"
                            spacing={1.25}
                            alignItems="center"
                          >
                            <Avatar
                              src={
                                c.user_thumb_image ||
                                c.user_image ||
                                "/images/users/user.png"
                              }
                              alt={c.user_name ?? ""}
                              sx={{ width: 36, height: 36 }}
                            />
                            <Typography className="f-14" color="textPrimary">
                              {c.user_name ?? `User ${c.user_id}`}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography className="f-14" color="textPrimary">
                            {c.template_title ?? "Contract"}
                          </Typography>
                          <Typography color="textSecondary" variant="subtitle1">
                            Version {c.version_no}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          <Typography className="f-14">
                            {c.signed_at ?? "—"}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          <Typography className="f-14">
                            {c.expires_at ?? "No expiry"}
                          </Typography>
                        </TableCell>
                        {showReview && (
                          <TableCell sx={{ maxWidth: 260 }}>
                            <Typography className="f-14" color="textPrimary">
                              {c.reviewed_by_name ?? "—"}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="textSecondary"
                              display="block"
                            >
                              {c.reviewed_at}
                            </Typography>
                            {c.review_note && (
                              <Typography
                                variant="caption"
                                color={
                                  tab === "rejected" ? "error" : "textSecondary"
                                }
                                display="block"
                                sx={{ wordBreak: "break-word" }}
                              >
                                {c.review_note}
                              </Typography>
                            )}
                          </TableCell>
                        )}
                        <TableCell align="right">
                          <Stack
                            direction="row"
                            spacing={0.5}
                            justifyContent="flex-end"
                            alignItems="center"
                          >
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
                              <Tooltip
                                title={
                                  c.can_review
                                    ? ""
                                    : "You can't review your own contract."
                                }
                              >
                                <span>
                                  <Stack direction="row" spacing={0.5}>
                                    <Button
                                      size="small"
                                      color="success"
                                      variant="contained"
                                      startIcon={<IconCheck size={16} />}
                                      disabled={!c.can_review}
                                      onClick={() => openAction("approve", [c])}
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      size="small"
                                      color="error"
                                      variant="outlined"
                                      startIcon={<IconX size={16} />}
                                      disabled={!c.can_review}
                                      onClick={() => openAction("reject", [c])}
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
                        <TableCell
                          colSpan={columns}
                          sx={{ py: "0 !important" }}
                        >
                          <Collapse in={open} unmountOnExit>
                            <Box py={2} pl={{ xs: 0, sm: 6 }}>
                              <Stack
                                direction={{ xs: "column", md: "row" }}
                                spacing={4}
                              >
                                <Box flex={1}>
                                  <Typography variant="subtitle2" mb={1}>
                                    Form answers
                                  </Typography>
                                  {c.form_answers.length ? (
                                    <Stack spacing={0.5}>
                                      {c.form_answers.map((a) => (
                                        <Typography
                                          key={a.key}
                                          variant="body2"
                                          sx={{ wordBreak: "break-word" }}
                                        >
                                          <b>{a.label}:</b> {a.display}
                                        </Typography>
                                      ))}
                                    </Stack>
                                  ) : (
                                    <Typography
                                      variant="body2"
                                      color="textSecondary"
                                    >
                                      No form fields on this contract.
                                    </Typography>
                                  )}
                                  {c.day_rate != null && (
                                    <Typography variant="body2" mt={1}>
                                      <b>Day rate:</b>{" "}
                                      {Number(c.day_rate).toFixed(2)}
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
                                        <b>Signed:</b>{" "}
                                        {c.signing_record.signed_at}
                                      </Typography>
                                      <Typography variant="body2">
                                        <b>IP:</b> {c.signing_record.ip ?? "—"}
                                      </Typography>
                                      <Typography variant="body2">
                                        <b>Device:</b>{" "}
                                        {c.signing_record.device ?? "—"}
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        color="textSecondary"
                                        sx={{ wordBreak: "break-all" }}
                                      >
                                        SHA-256:{" "}
                                        {c.signing_record.document_sha256}
                                      </Typography>
                                    </Stack>
                                  ) : (
                                    <Typography
                                      variant="body2"
                                      color="textSecondary"
                                    >
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

        {items.length > 0 && <Divider />}
        <TablePaginationFooter
          table={paginationTable}
          totalRows={data?.total ?? 0}
          selectedCount={bulkCount}
        />
      </Box>

      {selectable && bulkCount > 0 && (
        <Box
          sx={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "white",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            px: 3,
            py: 1.5,
            zIndex: 1000,
            minWidth: { xs: "calc(100% - 32px)", sm: "420px" },
            border: "1px solid #e0e0e0",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton
              size="small"
              onClick={() => setSelected([])}
              disabled={saving}
              aria-label="Clear selection"
              sx={{ color: "#666", "&:hover": { bgcolor: "grey.100" } }}
            >
              <IconX size={16} />
            </IconButton>

            <Typography variant="body2" fontWeight={600} color="text.primary">
              {bulkCount} Selected
            </Typography>

            <Box sx={{ flexGrow: 1 }} />

            <Stack direction="row" spacing={1.5}>
              <Button
                startIcon={<IconCheck size={15} />}
                variant="contained"
                color="success"
                size="small"
                onClick={() => openAction("approve", selectedItems)}
                disabled={saving}
                sx={{
                  px: 2.5,
                  textTransform: "none",
                  fontWeight: 600,
                  borderRadius: "8px",
                  boxShadow: "none",
                  "&:hover": { boxShadow: "none" },
                }}
              >
                Approve
              </Button>
              <Button
                startIcon={<IconX size={15} />}
                variant="outlined"
                color="error"
                size="small"
                onClick={() => openAction("reject", selectedItems)}
                disabled={saving}
                sx={{
                  px: 2.5,
                  textTransform: "none",
                  fontWeight: 600,
                  borderRadius: "8px",
                }}
              >
                Reject
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}

      <Dialog
        open={Boolean(action)}
        onClose={() => !saving && setAction(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {action?.type === "approve" ? "Approve" : "Reject"}{" "}
          {isBulk ? `${action?.contracts.length} contracts` : "contract"}
        </DialogTitle>
        <DialogContent>
          {isBulk ? (
            <Box
              mb={2}
              sx={{
                maxHeight: 180,
                overflowY: "auto",
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                px: 1.5,
                py: 1,
              }}
            >
              {action?.contracts.map((c) => (
                <Typography key={c.id} variant="body2" py={0.25}>
                  <b>{c.user_name ?? `User ${c.user_id}`}</b> ·{" "}
                  {c.template_title} (v{c.version_no})
                </Typography>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" mb={2}>
              <b>{action?.contracts[0]?.user_name ?? "User"}</b> signed{" "}
              <b>{action?.contracts[0]?.template_title}</b> (v
              {action?.contracts[0]?.version_no}) on{" "}
              {action?.contracts[0]?.signed_at}.
            </Typography>
          )}
          {action?.type === "reject" && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {isBulk
                ? "These signed copies will be marked as rejected and each user will be asked to sign again. They will all see the same reason."
                : "The signed copy will be marked as rejected and the user will be asked to sign the contract again. They will see your reason."}
            </Alert>
          )}
          {action?.type === "approve" && isBulk && (
            <Typography variant="body2" color="textSecondary" mb={2}>
              Any note you add is sent to every selected user.
            </Typography>
          )}
          <TextField
            fullWidth
            multiline
            minRows={3}
            autoFocus
            label={
              action?.type === "reject"
                ? "Reason for rejecting"
                : "Note (optional)"
            }
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
            {saving ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              `${action?.type === "approve" ? "Approve" : "Reject"}${isBulk ? ` ${action?.contracts.length}` : ""}`
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default ContractApprovals;
