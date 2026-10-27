"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  MenuItem,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  CircularProgress,
} from "@mui/material";
import { IconArrowLeft, IconArrowUp, IconEye } from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import ContractEditor from "./ContractEditor";
import ContractPreviewDialog from "./ContractPreviewDialog";
import PublishDialog, { PublishAssignment } from "./PublishDialog";
import { extractFormFields, FORM_FIELD_TYPES, toInputDate } from "./contracts-api";
import type { ContractField, ContractGroup, ContractTemplateDetail } from "./contracts-api";
import IOSSwitch from "@/app/components/common/IOSSwitch";

const card = {
  bgcolor: "background.paper",
  border: 1,
  borderColor: "divider",
  borderRadius: 2,
};

const STARTER_WORDING =
  "<h2>SUBCONTRACTOR AGREEMENT</h2>" +
  "<p>This agreement is made on {{signing_date}} between {{company_name}} (“the Contractor”), and {{user_name}} of {{user_address}}, " +
  "UTR {{user_utr}} (“the Subcontractor”).</p>" +
  "<p><strong>Rate.</strong> The Contractor will pay the Subcontractor {{day_rate}} per day worked, less CIS deductions where required.</p>" +
  "<p>[Add your contract clauses here]</p>";

interface Props {
  templateId: number | null; // null = new template
}

const TemplateEditor = ({ templateId }: Props) => {
  const router = useRouter();
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null; id?: number };

  const [fields, setFields] = useState<ContractField[]>([]);
  const [groups, setGroups] = useState<(ContractGroup & { members_count: number })[]>([]);
  const [template, setTemplate] = useState<ContractTemplateDetail | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState(templateId ? "" : STARTER_WORDING);
  const [groupIds, setGroupIds] = useState<number[]>([]);
  // The contract's own rules.
  const [isRequired, setIsRequired] = useState(true);
  const [expiryMonths, setExpiryMonths] = useState<number>(0);
  const [requiredFrom, setRequiredFrom] = useState(""); // yyyy-MM-dd
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [viewVersion, setViewVersion] = useState<{ version_no: number; body_html: string } | null>(null);
  const insertField = useRef<((key: string) => void) | null>(null);

  const load = useCallback(async () => {
    if (!user?.id || !user.company_id) return;
    try {
      const [f, t] = await Promise.all([
        api.get("contracts/fields"),
        templateId ? api.get(`contracts/templates/${templateId}`) : Promise.resolve(null),
      ]);
      const detail: ContractTemplateDetail | null = t?.data?.info ?? null;
      // Groups of the template's own company (the active one for a new template).
      const g = await api.get(`user-groups/list?company_id=${detail?.company_id ?? user.company_id}`);
      setFields(f.data?.info ?? []);
      setGroups(
        (g.data?.info ?? []).map((x: any) => ({ id: Number(x.id), name: x.name, members_count: x.members_count ?? 0 })),
      );
      if (detail) {
        setTemplate(detail);
        setTitle(detail.title);
        setBody(detail.body_html);
        setGroupIds(detail.groups.map((x) => x.id));
        setIsRequired(detail.is_required);
        setExpiryMonths(detail.expiry_months ?? 0);
        setRequiredFrom(toInputDate(detail.required_from));
      }
      setDirty(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [templateId, user?.id, user?.company_id]);

  useEffect(() => {
    load();
  }, [load]);

  // Warn before leaving with unsaved wording.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const latest = template?.versions.find((v) => v.is_current) ?? null;
  const nextVersion = (latest?.version_no ?? 0) + 1;
  const formFields = useMemo(() => extractFormFields(body), [body]);
  const usedKeys = useMemo(() => new Set([...body.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)].map((m) => m[1])), [body]);

  /** Saves the draft. Returns the template id (new templates get one here). */
  const save = async (quiet = false): Promise<number | null> => {
    if (!title.trim()) {
      toast.error("Template name is required");
      return null;
    }
    if (!groupIds.length) {
      toast.error("Choose at least one group");
      return null;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        body_html: body,
        group_ids: groupIds,
        is_required: isRequired,
        expiry_months: expiryMonths || null,
        required_from: requiredFrom || null,
      };
      const res = templateId
        ? await api.post(`contracts/templates/${templateId}/update`, payload)
        : await api.post(`contracts/templates?company_id=${user.company_id}`, payload);
      const saved: ContractTemplateDetail = res.data.info;
      setTemplate(saved);
      setDirty(false);
      if (!quiet) toast.success(res.data?.message || "Saved");
      if (!templateId) router.replace(`/apps/contracts/templates/${saved.id}`);
      return saved.id;
    } catch (error) {
      console.error(error);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const publish = async (changeType: "MAJOR" | "MINOR", changeNote: string, assignment: PublishAssignment) => {
    const id = dirty ? await save(true) : templateId;
    if (!id) return;
    setPublishing(true);
    try {
      const res = await api.post(`contracts/templates/${id}/publish`, {
        change_type: changeType,
        change_note: changeNote.trim() || undefined,
        ...assignment,
      });
      toast.success(res.data?.message || "Published");
      setPublishOpen(false);
      // Refresh by id: a brand-new template's page may not have re-mounted yet.
      const fresh = await api.get(`contracts/templates/${id}`);
      setTemplate(fresh.data.info);
      setBody(fresh.data.info.body_html);
      setIsRequired(fresh.data.info.is_required);
      setDirty(false);
    } catch (error) {
      console.error(error);
    } finally {
      setPublishing(false);
    }
  };

  const openPreview = async () => {
    const id = dirty || !templateId ? await save(true) : templateId;
    if (id) setPreviewOpen(true);
  };

  const showVersion = async (versionId: number) => {
    if (!templateId) return;
    try {
      const res = await api.get(`contracts/templates/${templateId}/versions/${versionId}`);
      setViewVersion(res.data.info);
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" py={4}><CircularProgress size={28} /></Box>;

  const statusChip = !template?.versions.length
    ? { label: "Draft · not published", color: "warning" as const }
    : dirty || template?.has_unpublished_changes
      ? { label: `Draft v${nextVersion} · unpublished changes`, color: "warning" as const }
      : { label: `Published v${latest?.version_no}`, color: "success" as const };

  return (
    <Stack spacing={2}>
      {/* Header */}
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ md: "center" }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <IconButton aria-label="Back to contracts" onClick={() => router.push("/apps/contracts")}>
            <IconArrowLeft size={20} />
          </IconButton>
          <Box>
            <Typography variant="body2" color="textSecondary">
              Contracts
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h5">{title || "New contract template"}</Typography>
              <Chip size="small" color={statusChip.color} label={statusChip.label} />
            </Stack>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button variant="outlined" color="inherit" disabled={saving} onClick={() => save()}>
            {saving ? "Saving..." : "Save draft"}
          </Button>
          <Button variant="outlined" startIcon={<IconEye size={16} />} onClick={openPreview}>
            Preview as user
          </Button>
          <Tooltip title={templateId ? "" : "Save the draft first"}>
            <span>
              <Button
                variant="contained"
                startIcon={<IconArrowUp size={16} />}
                disabled={!templateId}
                onClick={() => setPublishOpen(true)}
              >
                Publish v{nextVersion}
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems="flex-start">
        {/* Wording */}
        <Stack spacing={2} flex={1} minWidth={0} width="100%">
          <Box sx={{ ...card, p: 2.5 }}>
            <TextField
              label="Template name"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setDirty(true);
              }}
              fullWidth
              required
              inputProps={{ maxLength: 190 }}
            />
          </Box>
          <Box sx={card}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              flexWrap="wrap"
              gap={1}
              sx={{ px: 2.5, py: 1.5, borderBottom: 1, borderColor: "divider" }}
            >
              <Typography variant="h6">Contract wording</Typography>
              <Typography variant="body2" color="textSecondary">
                Leave out personal details. Use fields like {"{{user_name}}"} instead.
              </Typography>
            </Stack>
            <ContractEditor
              value={body}
              fields={fields}
              onChange={(html) => {
                setBody(html);
                setDirty(true);
              }}
              onReady={(insert) => {
                insertField.current = insert;
              }}
            />
          </Box>
        </Stack>

        {/* Side panel */}
        <Stack spacing={2} width={{ xs: "100%", lg: 360 }} flexShrink={0}>
          <Box sx={{ ...card, p: 2.5 }}>
            <Typography variant="h6" mb={1}>
              Rules
            </Typography>
            <FormControlLabel
              sx={{ m: 0, alignItems: "flex-start", gap: 1.5, mb: 2 }}
              control={
                <IOSSwitch
                  checked={isRequired}
                  onChange={(e) => {
                    setIsRequired(e.target.checked);
                    setDirty(true);
                  }}
                />
              }
              label={
                <Box>
                  <Typography fontWeight={600}>Required to start work</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {isRequired
                      ? "Assigned users can’t start work until they sign."
                      : "Assigned users are asked to sign, but can start work without it."}
                  </Typography>
                </Box>
              }
            />
            <Stack spacing={2}>
              <TextField
                select
                size="small"
                label="Contract expiry"
                value={expiryMonths}
                onChange={(e) => {
                  setExpiryMonths(Number(e.target.value));
                  setDirty(true);
                }}
                helperText="After this, users are asked to sign again."
              >
                <MenuItem value={0}>No expiry</MenuItem>
                <MenuItem value={6}>6 months</MenuItem>
                <MenuItem value={12}>12 months</MenuItem>
                <MenuItem value={24}>24 months</MenuItem>
              </TextField>
              {isRequired && (
                <TextField
                  size="small"
                  type="date"
                  label="Required from"
                  InputLabelProps={{ shrink: true }}
                  value={requiredFrom}
                  onChange={(e) => {
                    setRequiredFrom(e.target.value);
                    setDirty(true);
                  }}
                  helperText="Start work is blocked from this date. Empty = straight away."
                />
              )}
            </Stack>
          </Box>

          <Box sx={{ ...card, p: 2.5 }}>
            <Typography variant="h6">Groups using this template</Typography>
            <Typography variant="body2" color="textSecondary" mb={1}>
              Only users in these groups are asked to sign.
            </Typography>
            {groups.map((g) => (
              <FormControlLabel
                key={g.id}
                sx={{ display: "flex" }}
                control={
                  <Checkbox
                    checked={groupIds.includes(g.id)}
                    onChange={(e) => {
                      setGroupIds((ids) => (e.target.checked ? [...ids, g.id] : ids.filter((x) => x !== g.id)));
                      setDirty(true);
                    }}
                  />
                }
                label={
                  <>
                    {g.name}{" "}
                    <Typography component="span" variant="caption" color="textSecondary">
                      · {g.members_count} user{g.members_count === 1 ? "" : "s"}
                    </Typography>
                  </>
                }
              />
            ))}
            {!groups.length && (
              <Typography variant="body2" color="textSecondary">
                No groups yet. Create user groups in Admin settings first.
              </Typography>
            )}
          </Box>

          <Box sx={{ ...card, p: 2.5 }}>
            <Typography variant="h6">Auto-fill fields</Typography>
            <Typography variant="body2" color="textSecondary" mb={1}>
              Click a field to insert it at the cursor.
            </Typography>
            {fields.map((f) => (
              <Stack
                key={f.key}
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                spacing={1}
                sx={{ py: 0.75, borderBottom: 1, borderColor: "divider" }}
              >
                <Button
                  size="small"
                  sx={{ px: 0.5, minWidth: 0, fontWeight: 600 }}
                  onClick={() => insertField.current?.(f.key)}
                >
                  {f.label}
                  {usedKeys.has(f.key) ? " ✓" : ""}
                </Button>
                <Typography variant="caption" color="textSecondary" textAlign="right">
                  {f.source}
                  {f.fillable ? " · user fills if missing" : ""}
                </Typography>
              </Stack>
            ))}
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              If a company field is empty, the manager is told and users can’t sign until it’s filled.
            </Alert>
          </Box>

          <Box sx={{ ...card, p: 2.5 }}>
            <Typography variant="h6">Form fields</Typography>
            <Typography variant="body2" color="textSecondary" mb={1}>
              Questions the user answers when signing. Add one with “Form field” in the toolbar.
            </Typography>
            {formFields.fields.map((f) => (
              <Stack
                key={f.key}
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                spacing={1}
                sx={{ py: 0.75, borderBottom: 1, borderColor: "divider" }}
              >
                <Box minWidth={0}>
                  <Typography variant="body2" fontWeight={600} noWrap title={f.label}>
                    {f.label}
                    {f.required ? " *" : ""}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" component="div" noWrap title={f.options.join(", ")}>
                    {f.key}
                    {f.options.length ? ` · ${f.options.length} options` : ""}
                  </Typography>
                </Box>
                <Chip size="small" label={FORM_FIELD_TYPES.find((t) => t.value === f.type)?.label ?? f.type} />
              </Stack>
            ))}
            {!formFields.fields.length && !formFields.errors.length && (
              <Typography variant="body2" color="textSecondary">
                No form fields in this contract.
              </Typography>
            )}
            {formFields.errors.map((error) => (
              <Alert key={error} severity="error" sx={{ mt: 1 }}>
                {error}
              </Alert>
            ))}
          </Box>

          {template && template.versions.length > 0 && (
            <Box sx={{ ...card, p: 2.5 }}>
              <Typography variant="h6" mb={1}>
                Version history
              </Typography>
              <Stack spacing={1.5}>
                {template.versions.map((v) => (
                  <Stack key={v.id} direction="row" spacing={1} alignItems="flex-start">
                    <Chip size="small" label={`v${v.version_no}`} color={v.is_current ? "success" : "default"} />
                    <Box flex={1}>
                      <Typography variant="body2">
                        {v.change_type === "MAJOR" ? "Major" : "Minor"}
                        {v.change_note ? ` · ${v.change_note}` : ""}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {v.published_at} · {v.published_by_name}
                        {v.is_current ? " · current" : ""}
                      </Typography>
                    </Box>
                    <Button size="small" onClick={() => showVersion(v.id)}>
                      View
                    </Button>
                  </Stack>
                ))}
              </Stack>
              <Typography variant="caption" color="textSecondary" display="block" mt={1.5}>
                Signed copies stay linked to the version that was signed.
              </Typography>
            </Box>
          )}
        </Stack>
      </Stack>

      <PublishDialog
        open={publishOpen}
        templateId={template?.id ?? null}
        title={title}
        nextVersion={nextVersion}
        isFirstVersion={!template?.versions.length}
        isRequired={isRequired}
        companyId={template?.company_id ?? Number(user?.company_id)}
        groups={groups.filter((g) => groupIds.includes(g.id))}
        publishing={publishing || saving}
        onClose={() => setPublishOpen(false)}
        onPublish={publish}
      />

      <ContractPreviewDialog templateId={previewOpen ? template?.id ?? null : null} onClose={() => setPreviewOpen(false)} />

      <Dialog open={Boolean(viewVersion)} onClose={() => setViewVersion(null)} fullWidth maxWidth="md">
        <DialogTitle>Version {viewVersion?.version_no}</DialogTitle>
        <DialogContent dividers>
          <Box
            component="iframe"
            title="Contract version"
            sandbox=""
            srcDoc={`<!doctype html><meta charset="utf-8"><body style="font-family:Helvetica,Arial,sans-serif;line-height:1.6;padding:16px">${viewVersion?.body_html ?? ""}</body>`}
            sx={{ width: "100%", height: "60vh", border: 0 }}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setViewVersion(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default TemplateEditor;
