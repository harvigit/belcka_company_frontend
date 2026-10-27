"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
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
  CircularProgress,
} from "@mui/material";
import { IconChevronDown, IconChevronUp, IconDownload, IconSignature } from "@tabler/icons-react";
import { alpha } from "@mui/material/styles";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import {
  ContractSummary,
  downloadContractPdf,
  REASON_LABELS,
  UserCompanyContract,
} from "@/app/components/apps/settings/contracts/contracts-api";

interface Props {
  userId: number;
  active: boolean;
  canEdit: boolean;
}

const STATUS_STYLE: Record<
  UserCompanyContract["status"],
  { label: string; color: "success" | "warning" | "error" | "default"; border: string }
> = {
  SIGNED: { label: "Signed", color: "success", border: "success.light" },
  WAITING: { label: "Waiting to sign", color: "warning", border: "warning.main" },
  DETAILS_MISSING: { label: "Can’t sign yet", color: "error", border: "error.light" },
  NOT_REQUIRED: { label: "Not required", color: "default", border: "divider" },
  NO_TEMPLATE: { label: "No contract published", color: "default", border: "divider" },
  NOT_ENABLED: { label: "Contracts off", color: "default", border: "divider" },
};

const HISTORY_STATUS: Record<string, { label: string; color: "success" | "default" }> = {
  SIGNED: { label: "Current", color: "success" },
  SUPERSEDED: { label: "Replaced", color: "default" },
};

const UserContracts = ({ userId, active, canEdit }: Props) => {
  const router = useRouter();
  const [companies, setCompanies] = useState<UserCompanyContract[]>([]);
  const [history, setHistory] = useState<ContractSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [preview, setPreview] = useState<{ title: string; html: string } | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await api.get("contracts/user", { params: { user_id: userId } });
      setCompanies(res.data?.info?.companies ?? []);
      setHistory(res.data?.info?.history ?? []);
      const current = (res.data?.info?.history ?? []).find((c: ContractSummary) => c.status === "SIGNED");
      setExpanded((prev) => prev ?? current?.id ?? null);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [userId]);

  useEffect(() => {
    if (active && !loaded) load();
  }, [active, loaded, load]);

  const run = async (key: string, action: () => Promise<any>) => {
    setBusy(key);
    try {
      await action();
      await load();
    } catch (error) {
      console.error(error);
    } finally {
      setBusy(null);
    }
  };

  const requestSignature = (company: UserCompanyContract) =>
    run(`request-${company.company_id}-${company.template_id}`, async () => {
      const res = await api.post("contracts/request-signature", {
        company_id: company.company_id,
        template_id: company.template_id ?? undefined,
        user_id: userId,
      });
      toast.success(res.data?.message || "Signature requested");
    });

  const remind = (contractId: number) =>
    run(`remind-${contractId}`, async () => {
      const res = await api.post(`contracts/${contractId}/remind`);
      toast.success(res.data?.message || "Reminder sent");
    });

  const openPreview = async (contractId: number, title: string) => {
    try {
      const res = await api.get(`contracts/${contractId}`);
      setPreview({ title, html: res.data?.info?.html ?? "" });
    } catch (error) {
      console.error(error);
    }
  };

  const download = async (contractId: number) => {
    setBusy(`pdf-${contractId}`);
    try {
      await downloadContractPdf(contractId);
    } catch (error) {
      console.error(error);
    } finally {
      setBusy(null);
    }
  };

  if (loading && !loaded) {
    return (
      <Box p={3}>
        <Box display="flex" justifyContent="center" py={4}><CircularProgress size={28} /></Box>
      </Box>
    );
  }

  const pendingCount = companies.filter((c) => c.status === "WAITING" || c.status === "DETAILS_MISSING").length;

  return (
    <Stack spacing={2.5} p={2.5}>
      <Box>
        <Typography variant="h6">Contract status by company</Typography>
        <Typography variant="body2" color="textSecondary">
          A contract for one company doesn’t cover another. A company can have several contracts to sign.
          {pendingCount ? ` ${pendingCount} waiting.` : ""}
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {companies.map((c) => {
          const style = STATUS_STYLE[c.status];
          return (
            <Grid key={`${c.company_id}-${c.template_id ?? "none"}`} size={{ xs: 12, md: 6, xl: 4 }}>
              <Stack
                spacing={1.25}
                sx={{
                  height: "100%",
                  p: 2,
                  borderRadius: 2,
                  border: 1,
                  borderColor: style.border,
                  bgcolor: (theme) =>
                    style.color === "default" ? "transparent" : alpha(theme.palette[style.color].main, 0.06),
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Typography fontWeight={700}>{c.company_name}</Typography>
                  <Chip size="small" color={style.color} label={style.label} />
                </Stack>

                <Stack spacing={0.5}>
                  {c.template_title && (
                    <Typography variant="body2" color="textSecondary">
                      {c.template_title}
                      {c.current_version_no ? ` · v${c.current_version_no}` : ""}
                    </Typography>
                  )}
                  {c.status === "SIGNED" && c.signed && (
                    <>
                      <Typography variant="body2" color="textSecondary">
                        Signed {c.signed.signed_at}
                      </Typography>
                      {c.signed.expires_at && (
                        <Typography variant="body2" color="textSecondary">
                          Expires {c.signed.expires_at}
                        </Typography>
                      )}
                    </>
                  )}
                  {(c.status === "WAITING" || c.status === "DETAILS_MISSING") && (
                    <>
                      <Typography variant="body2">
                        <b>Why:</b> {c.reason_detail || REASON_LABELS[c.reason ?? ""] || "Signature needed"}
                      </Typography>
                      {c.pending && (
                        <Typography variant="body2" color="textSecondary">
                          Asked {c.pending.requested_at}
                          {c.pending.reminder_count ? ` · reminded ${c.pending.reminder_count}×` : ""}
                        </Typography>
                      )}
                      {c.blocks_start_work && (
                        <Typography variant="body2" color="error.main" fontWeight={600}>
                          Start work blocked for {c.company_name}
                        </Typography>
                      )}
                    </>
                  )}
                  {c.status === "DETAILS_MISSING" && (
                    <Typography variant="body2">
                      <b>Missing:</b> {c.missing_company_fields.join(", ")}
                    </Typography>
                  )}
                  {c.status === "NOT_REQUIRED" && (
                    <Typography variant="body2" color="textSecondary">
                      {c.requirement?.reason || "Not selected to sign"}
                      {c.requirement?.valid_until ? ` · until ${c.requirement.valid_until}` : ""}
                    </Typography>
                  )}
                  {c.status === "NO_TEMPLATE" && (
                    <Typography variant="body2" color="textSecondary">
                      Publish a contract template for this company first.
                    </Typography>
                  )}
                  {c.status === "NOT_ENABLED" && (
                    <Typography variant="body2" color="textSecondary">
                      Contract signing is switched off for this company.
                    </Typography>
                  )}
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mt="auto">
                  {c.status === "SIGNED" && c.signed && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<IconDownload size={15} />}
                      disabled={busy === `pdf-${c.signed.id}`}
                      onClick={() => download(c.signed!.id)}
                    >
                      PDF
                    </Button>
                  )}
                  {c.status === "WAITING" && c.pending && canEdit && (
                    <Button
                      size="small"
                      variant="contained"
                      disabled={busy === `remind-${c.pending.id}`}
                      onClick={() => remind(c.pending!.id)}
                    >
                      Send reminder
                    </Button>
                  )}
                  {(c.status === "WAITING" || c.status === "DETAILS_MISSING") && c.pending && (
                    <Button size="small" variant="outlined" onClick={() => openPreview(c.pending!.id, c.template_title ?? "Contract")}>
                      Preview
                    </Button>
                  )}
                  {c.status === "DETAILS_MISSING" && canEdit && (
                    <Button size="small" variant="outlined" onClick={() => router.push("/company-info")}>
                      Fix details
                    </Button>
                  )}
                  {c.status === "SIGNED" && canEdit && (
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<IconSignature size={15} />}
                      disabled={busy === `request-${c.company_id}-${c.template_id}`}
                      onClick={() => requestSignature(c)}
                    >
                      Ask to sign again
                    </Button>
                  )}
                  {c.status === "NO_TEMPLATE" && canEdit && (
                    <Button size="small" variant="outlined" onClick={() => router.push("/apps/contracts")}>
                      Set up contracts
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Grid>
          );
        })}
      </Grid>

      <Box>
        <Typography variant="h6" mb={1}>
          Signing history
        </Typography>
        <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell>Signed</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Contract</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Day rate</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">PDF</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((h) => {
                const open = expanded === h.id;
                const status = HISTORY_STATUS[h.status] ?? { label: h.status, color: "default" as const };
                return (
                  <React.Fragment key={h.id}>
                    <TableRow hover sx={{ "& > td": { borderBottom: open ? 0 : undefined } }}>
                      <TableCell padding="checkbox">
                        <IconButton
                          size="small"
                          aria-label={open ? "Hide signing record" : "Show signing record"}
                          onClick={() => setExpanded(open ? null : h.id)}
                        >
                          {open ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                        </IconButton>
                      </TableCell>
                      <TableCell>{h.signed_at ?? "—"}</TableCell>
                      <TableCell>{h.company_name}</TableCell>
                      <TableCell>
                        {h.template_title}
                        <Typography variant="caption" color="textSecondary" display="block">
                          v{h.version_no}
                        </Typography>
                      </TableCell>
                      <TableCell>{REASON_LABELS[h.reason] ?? h.reason}</TableCell>
                      <TableCell>{h.day_rate != null ? Number(h.day_rate).toFixed(2) : "—"}</TableCell>
                      <TableCell>
                        <Chip size="small" color={status.color} label={status.label} />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Download PDF">
                          <span>
                            <IconButton
                              color="primary"
                              disabled={!h.has_pdf || busy === `pdf-${h.id}`}
                              onClick={() => download(h.id)}
                              aria-label={`Download PDF, ${h.company_name} version ${h.version_no}`}
                            >
                              <IconDownload size={18} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={8} sx={{ py: 0 }}>
                        <Collapse in={open} unmountOnExit>
                          <Grid container spacing={2} sx={{ my: 1.5, p: 1.5, border: 1, borderStyle: "dashed", borderColor: "divider", borderRadius: 1 }}>
                            {[
                              ["Signed at", h.signing_record?.signed_at],
                              ["Device", h.signing_record?.device],
                              ["IP address", h.signing_record?.ip],
                              ["Document hash", h.signing_record?.document_sha256],
                            ].map(([label, value]) => (
                              <Grid key={label} size={{ xs: 12, sm: 6, md: 3 }}>
                                <Typography variant="caption" color="textSecondary">
                                  {label}
                                </Typography>
                                <Typography variant="body2" sx={{ wordBreak: "break-all", fontFamily: label === "Document hash" ? "monospace" : undefined }}>
                                  {value || "—"}
                                </Typography>
                              </Grid>
                            ))}
                            {(h.form_answers ?? []).length > 0 && (
                              <Grid size={12}>
                                <Typography variant="subtitle2" mt={0.5} mb={1}>
                                  Form answers
                                </Typography>
                                <Grid container spacing={2}>
                                  {(h.form_answers ?? []).map((a) => (
                                    <Grid key={a.key} size={{ xs: 12, sm: 6, md: 3 }}>
                                      <Typography variant="caption" color="textSecondary">
                                        {a.label}
                                      </Typography>
                                      <Typography variant="body2" sx={{ wordBreak: "break-word", whiteSpace: "pre-line" }}>
                                        {a.display || "—"}
                                      </Typography>
                                    </Grid>
                                  ))}
                                </Grid>
                              </Grid>
                            )}
                          </Grid>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
              {!history.length && (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Typography variant="body2" color="textSecondary" py={1}>
                      No signed contracts yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Alert severity="info" sx={{ mt: 1.5 }}>
          PDFs are private. Only this user and managers with permission for that company can download them.
        </Alert>
      </Box>

      <Dialog open={Boolean(preview)} onClose={() => setPreview(null)} fullWidth maxWidth="md">
        <DialogTitle>{preview?.title}</DialogTitle>
        <DialogContent dividers>
          <Box
            component="iframe"
            title="Contract preview"
            sandbox=""
            srcDoc={preview?.html ?? ""}
            sx={{ width: "100%", height: "65vh", border: 0 }}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setPreview(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default UserContracts;
