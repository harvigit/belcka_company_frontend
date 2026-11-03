"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  InputAdornment,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { IconSearch } from "@tabler/icons-react";
import api from "@/utils/axios";
import IOSSwitch from "@/app/components/common/IOSSwitch";
import type { ContractGroup, ContractUserRow } from "./contracts-api";

export interface PublishAssignment {
  assign_mode: "ALL" | "SELECTED";
  user_ids: number[];
  /** The contract's own switch: users must sign before they can start work. */
  is_required: boolean;
}

interface Props {
  open: boolean;
  /** Saved template: who must sign is read per template. Empty for a template not saved yet. */
  templateId?: number | null;
  title: string;
  nextVersion: number;
  isFirstVersion: boolean;
  /** Assign users only (templates list): no version, change type or note. */
  assignOnly?: boolean;
  /** The template's company. */
  companyId: number;
  /** The template's groups: only their members can be assigned. */
  groups: ContractGroup[];
  /** The contract's current switch, shown pre-set. */
  isRequired: boolean;
  publishing: boolean;
  onClose: () => void;
  onPublish: (changeType: "MAJOR" | "MINOR", changeNote: string, assignment: PublishAssignment) => void;
}

const option = (selected: boolean) => ({
  m: 0,
  p: 1.5,
  alignItems: "flex-start",
  border: selected ? 2 : 1,
  borderColor: selected ? "primary.main" : "divider",
  borderRadius: 2,
  bgcolor: selected ? "primary.light" : "transparent",
});

const PublishDialog = ({
  open,
  templateId,
  title,
  nextVersion,
  isFirstVersion,
  assignOnly = false,
  companyId,
  groups,
  isRequired,
  publishing,
  onClose,
  onPublish,
}: Props) => {
  const [changeType, setChangeType] = useState<"MAJOR" | "MINOR">("MAJOR");
  const [note, setNote] = useState("");
  const [assignMode, setAssignMode] = useState<"ALL" | "SELECTED">("ALL");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [required, setRequired] = useState(isRequired);
  const [users, setUsers] = useState<ContractUserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Reload only when the dialog opens or the set of groups changes (not on every new array).
  const groupKey = groups.map((g) => g.id).join(",");

  // Load the users of the template's groups; start from what is set today.
  useEffect(() => {
    if (!open) return;
    setChangeType("MAJOR");
    setNote("");
    setSearch("");
    setRequired(isRequired);
    if (!companyId || !groups.length) {
      setUsers([]);
      setAssignMode("ALL");
      setSelected(new Set());
      return;
    }
    setLoading(true);
    api
      .get("contracts/users", {
        params: {
          company_id: companyId,
          group_ids: groupKey,
          ...(templateId ? { template_id: templateId } : {}),
        },
      })
      .then((res) => {
        const rows = (res.data?.info?.users ?? []) as ContractUserRow[];
        const onlySelected = res.data?.info?.audience === "ONLY_SELECTED";
        setUsers(rows);
        setAssignMode(onlySelected ? "SELECTED" : "ALL");
        // Pre-tick only users already chosen by hand; coming from "All users" the list starts empty.
        setSelected(onlySelected ? new Set(rows.filter((u) => u.must_sign).map((u) => u.user_id)) : new Set());
      })
      .catch((error) => console.error(error))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, companyId, groupKey, templateId]);

  const allUserIds = useMemo(() => users.map((u) => u.user_id), [users]);
  const term = search.trim().toLowerCase();
  const visibleUsers = users.filter((u) => !term || u.name.toLowerCase().includes(term));
  const excludedCount = users.filter((u) => u.requirement?.type === "EXEMPT").length;
  const groupNames = groups.map((g) => g.name).join(", ");
  const signsAgain = isFirstVersion || changeType === "MAJOR";

  const toggle = (userId: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });

  const allSelected = allUserIds.length > 0 && allUserIds.every((id) => selected.has(id));
  const canPublish = !publishing && !loading && groups.length > 0 && (assignMode === "ALL" || selected.size > 0);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {assignOnly ? "Assign users" : `Publish version ${nextVersion}`}
        <Typography variant="body2" color="textSecondary">
          {title}
          {groupNames ? ` · ${groupNames}` : ""}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {!groups.length && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Choose at least one group for this template first. Only users in its groups are asked to sign.
          </Alert>
        )}
        {assignOnly ? (
          <Typography variant="body2" color="textSecondary">
            Newly assigned users are asked to sign the current version. Users you take off no longer need to.
          </Typography>
        ) : isFirstVersion ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            This is the first version. The users you choose below will be asked to sign it.
          </Alert>
        ) : (
          <>
            <Typography variant="subtitle2" mb={1}>
              What kind of change is this?
            </Typography>
            <RadioGroup value={changeType} onChange={(e) => setChangeType(e.target.value as "MAJOR" | "MINOR")}>
              <Stack spacing={1.5}>
                <FormControlLabel
                  value="MAJOR"
                  control={<Radio sx={{ mt: -0.5 }} />}
                  sx={option(changeType === "MAJOR")}
                  label={
                    <Box>
                      <Typography fontWeight={600}>Important change: users must sign again</Typography>
                      <Typography variant="body2" color="textSecondary">
                        Everyone assigned gets a “You have a contract to sign” notification and can’t start work
                        until they sign.
                      </Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="MINOR"
                  control={<Radio sx={{ mt: -0.5 }} />}
                  sx={option(changeType === "MINOR")}
                  label={
                    <Box>
                      <Typography fontWeight={600}>Minor wording fix: no new signature</Typography>
                      <Typography variant="body2" color="textSecondary">
                        Existing signed contracts stay valid. Newly assigned users sign this version.
                      </Typography>
                    </Box>
                  }
                />
              </Stack>
            </RadioGroup>
          </>
        )}

        <Typography variant="subtitle2" mt={2.5} mb={1}>
          Who gets this contract?
        </Typography>
        <RadioGroup value={assignMode} onChange={(e) => setAssignMode(e.target.value as "ALL" | "SELECTED")}>
          <Stack spacing={1.5}>
            <FormControlLabel
              value="ALL"
              control={<Radio sx={{ mt: -0.5 }} />}
              sx={option(assignMode === "ALL")}
              label={
                <Box>
                  <Typography fontWeight={600}>All users</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Every user in {groups.length > 1 ? "these groups" : "this group"} ({allUserIds.length}
                    ), including users added to {groups.length > 1 ? "them" : "it"} later.
                    {excludedCount
                      ? excludedCount === 1
                        ? " 1 user already marked as not required stays excluded."
                        : ` ${excludedCount} users already marked as not required stay excluded.`
                      : ""}
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="SELECTED"
              control={<Radio sx={{ mt: -0.5 }} />}
              sx={option(assignMode === "SELECTED")}
              label={
                <Box>
                  <Typography fontWeight={600}>Select users manually</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Only the users you tick from {groups.length > 1 ? "these groups" : "this group"}. Nobody else is
                    asked to sign.
                  </Typography>
                </Box>
              }
            />
          </Stack>
        </RadioGroup>

        {assignMode === "SELECTED" && (
          <Box sx={{ mt: 1.5, border: 1, borderColor: "divider", borderRadius: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 1.5, borderBottom: 1, borderColor: "divider" }}>
              <TextField
                size="small"
                placeholder="Search users"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconSearch size={16} />
                    </InputAdornment>
                  ),
                }}
              />
              <FormControlLabel
                sx={{ m: 0, whiteSpace: "nowrap" }}
                control={
                  <Checkbox
                    checked={allSelected}
                    indeterminate={!allSelected && selected.size > 0}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(allUserIds))}
                  />
                }
                label="Select all"
              />
            </Stack>
            <Box sx={{ maxHeight: 280, overflowY: "auto" }}>
              {loading ? (
                <Box display="flex" justifyContent="center" py={3}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                visibleUsers.map((u) => (
                  <Stack
                    key={u.user_id}
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    sx={{ px: 1.5, py: 0.5, cursor: "pointer" }}
                    onClick={() => toggle(u.user_id)}
                  >
                    <Checkbox
                      checked={selected.has(u.user_id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggle(u.user_id)}
                      inputProps={{ "aria-label": `Assign to ${u.name}` }}
                    />
                    <Avatar sx={{ width: 30, height: 30, fontSize: 12 }}>
                      {u.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                    </Avatar>
                    <Box minWidth={0}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {u.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" noWrap component="div">
                        {[u.trade, u.team].filter(Boolean).join(" · ") || "—"}
                      </Typography>
                    </Box>
                  </Stack>
                ))
              )}
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ px: 2, py: 1, borderTop: 1, borderColor: "divider" }}>
              {selected.size} of {allUserIds.length} users selected
            </Typography>
          </Box>
        )}

        <Box sx={{ mt: 2, p: 1.5, border: 1, borderColor: "divider", borderRadius: 2 }}>
          <FormControlLabel
            sx={{ m: 0, alignItems: "flex-start", gap: 1.5 }}
            control={<IOSSwitch checked={required} onChange={(e) => setRequired(e.target.checked)} />}
            label={
              <Box>
                <Typography fontWeight={600}>Required to start work</Typography>
                <Typography variant="body2" color="textSecondary">
                  {required
                    ? "Assigned users can’t start work until they sign."
                    : "Assigned users are asked to sign, but can start work without it."}
                </Typography>
              </Box>
            }
          />
        </Box>

        {!assignOnly && (
        <TextField
          label="What changed?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          multiline
          minRows={2}
          fullWidth
          sx={{ mt: 2 }}
          inputProps={{ maxLength: 2000 }}
          helperText={signsAgain ? "Shown to users above the contract when they’re asked to sign." : "Kept in the version history."}
        />
        )}
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!canPublish}
          onClick={() =>
            onPublish(changeType, note, {
              assign_mode: assignMode,
              user_ids: assignMode === "SELECTED" ? [...selected] : [],
              is_required: required,
            })
          }
        >
          {assignOnly
            ? publishing
              ? "Saving..."
              : "Save"
            : publishing
              ? "Publishing..."
              : signsAgain
                ? "Publish and notify users"
                : "Publish"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PublishDialog;
