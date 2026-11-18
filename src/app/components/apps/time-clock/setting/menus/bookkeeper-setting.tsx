"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Typography,
  TextField,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  IconButton,
  Skeleton,
  Tooltip,
} from "@mui/material";
import {
  IconAlertTriangle,
  IconCash,
  IconClockEdit,
  IconLock,
  IconLockOpen,
  IconShieldCheck,
  IconTrash,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/material.css";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";

// Who can run each Time Clock action. Saved per action in request_actions
// (timesheet_approve for Edit, timesheet_lock, timesheet_unlock, timesheet_paid, timesheet_delete) and checked by the backend.
// Separate from Request Settings: with no users saved, only admins can run the action.
const TIMESHEET_ACTIONS = [
  { key: "edit", label: "Edit", icon: IconClockEdit },
  { key: "lock", label: "Lock", icon: IconLock },
  { key: "unlock", label: "Unlock", icon: IconLockOpen },
  { key: "paid", label: "Paid", icon: IconCash },
  { key: "delete", label: "Delete", icon: IconTrash },
] as const;

type TimesheetActionKey = (typeof TIMESHEET_ACTIONS)[number]["key"];
type ActionAccess = Record<TimesheetActionKey, boolean>;
interface AccessRow extends ActionAccess {
  id: number;
}

// New users can edit, lock, unlock and mark as paid. Delete is left off because it can't be undone.
const NEW_USER_ACCESS: ActionAccess = { edit: true, lock: true, unlock: true, paid: true, delete: false };

const hasAnyAction = (row: ActionAccess) => TIMESHEET_ACTIONS.some((action) => row[action.key]);

const sameRows = (a: AccessRow[], b: AccessRow[]) =>
  JSON.stringify(a.filter(hasAnyAction)) === JSON.stringify(b.filter(hasAnyAction));

interface SettingsState {
  phone: string;
  extension: string;
  billing_days: number;
  isSaving: boolean;
  loading: boolean;
  timeZone: string;
  is_billing_days: boolean;
}

interface BookkeeperSettingProps {
  onSaveSuccess: () => void;
  /** Non-admins only manage timesheet access users; company settings stay admin-only. */
  limitedAccess?: boolean;
}

interface ApproverOption {
  id: number;
  name: string;
  image: string | null;
  subtitle: string | null;
}

type ApproverLoadState = "loading" | "ready" | "error";

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const BookkeeperSetting: React.FC<BookkeeperSettingProps> = ({
  onSaveSuccess,
  limitedAccess = false,
}) => {
  const { t } = useTranslation();
  const session = useSession();
  const companyId = (session.data?.user as { company_id?: number | string | null } | undefined)?.company_id;

  const [settings, setSettings] = useState<SettingsState>({
    phone: "",
    extension: "",
    billing_days: 0,
    isSaving: false,
    timeZone: "",
    loading: true,
    is_billing_days: false,
  });

  // Time Clock action access (Lock / Unlock / Paid / Delete)
  const [approverLoadState, setApproverLoadState] = useState<ApproverLoadState>("loading");
  const [approverOptions, setApproverOptions] = useState<ApproverOption[]>([]);
  const [adminCount, setAdminCount] = useState(0);
  const [savedRows, setSavedRows] = useState<AccessRow[]>([]);
  const [accessRows, setAccessRows] = useState<AccessRow[]>([]);

  const updateSettings = (updates: Partial<SettingsState>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  const createCheckboxHandler = useCallback(
    (field: keyof SettingsState) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        updateSettings({ [field]: event.target.checked });
      },
    [updateSettings],
  );

  useEffect(() => {
    if (limitedAccess) {
      updateSettings({ loading: false });
      return;
    }

    const fetchSettings = async () => {
      try {
        const response = await api.get("/setting/get-company-settings");

        if (response.data?.IsSuccess) {
          const data = response.data.data || {};

          updateSettings({
            phone: data.hr_contact_number || "",
            extension: data.hr_contact_extension || "",
            billing_days: Number(data.allow_day_billing_info) || 0,
            timeZone: data.timezone_id || 39,
            is_billing_days: data.is_billing_days || false,
          });
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        updateSettings({ loading: false });
      }
    };

    fetchSettings();
  }, [limitedAccess]);

  const fetchApprovers = useCallback(async () => {
    setApproverLoadState("loading");
    try {
      const [actionsRes, usersRes] = await Promise.all([
        api.get("request-action/timesheet-actions", { skipToast: true } as any),
        api.get("user/list", { params: { company_id: companyId }, skipToast: true } as any),
      ]);

      const rawUsers: any[] = usersRes.data?.IsSuccess ? usersRes.data.info || [] : [];
      const options: ApproverOption[] = [];
      let admins = 0;
      for (const u of rawUsers) {
        const id = Number(u.id);
        if (!Number.isFinite(id)) continue;
        // Admins can always run every action, so they are not offered in the picker.
        if (u.trade_name === "Admin") {
          admins += 1;
          continue;
        }
        options.push({
          id,
          name: u.name || `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim(),
          image: u.user_thumb_image || u.user_image || u.image || null,
          subtitle: u.trade_name || null,
        });
      }

      const info = actionsRes.data?.info ?? {};
      // Keep only users that still exist in the picker, so saving never sends
      // removed/inactive users (the backend rejects those).
      const optionIds = new Set(options.map((o) => o.id));
      const rows: AccessRow[] = (Array.isArray(info.users) ? info.users : [])
        .map((u: any) => ({
          id: Number(u.user_id),
          edit: Boolean(u.edit),
          lock: Boolean(u.lock),
          unlock: Boolean(u.unlock),
          paid: Boolean(u.paid),
          delete: Boolean(u.delete),
        }))
        .filter((row: AccessRow) => optionIds.has(row.id));

      setApproverOptions(options);
      setAdminCount(admins);
      setSavedRows(rows);
      setAccessRows(rows);
      setApproverLoadState("ready");
    } catch (error) {
      console.error("Error fetching timesheet action users:", error);
      setApproverLoadState("error");
    }
  }, [companyId]);

  useEffect(() => {
    if (session.status === "loading") return;
    fetchApprovers();
  }, [fetchApprovers, session.status]);

  const optionsById = useMemo(() => new Map(approverOptions.map((o) => [o.id, o])), [approverOptions]);

  const selectedAccessUsers = useMemo(
    () => accessRows.map((row) => optionsById.get(row.id)).filter((o): o is ApproverOption => Boolean(o)),
    [accessRows, optionsById],
  );

  const handleAccessUsersChange = (ids: number[]) => {
    setAccessRows((prev) => {
      const kept = prev.filter((row) => ids.includes(row.id));
      const added = ids
        .filter((id) => !prev.some((row) => row.id === id))
        .map((id) => ({ id, ...NEW_USER_ACCESS }));
      return [...kept, ...added];
    });
  };

  const toggleAction = (userId: number, key: TimesheetActionKey, value: boolean) => {
    setAccessRows((prev) => prev.map((row) => (row.id === userId ? { ...row, [key]: value } : row)));
  };

  const setActionForAll = (key: TimesheetActionKey, value: boolean) => {
    setAccessRows((prev) => prev.map((row) => ({ ...row, [key]: value })));
  };

  const removeAccessUser = (userId: number) => {
    setAccessRows((prev) => prev.filter((row) => row.id !== userId));
  };

  const approversChanged = approverLoadState === "ready" && !sameRows(savedRows, accessRows);

  // Returns true when there was nothing to save or the save succeeded.
  const saveApprovers = async (): Promise<boolean> => {
    if (!approversChanged) return true;

    try {
      // Users with no action ticked are dropped.
      const rows = accessRows.filter(hasAnyAction);
      await api.post("request-action/timesheet-actions", {
        users: rows.map(({ id, ...access }) => ({ user_id: id, ...access })),
      });
      setSavedRows(rows);
      setAccessRows(rows);
      return true;
    } catch (error) {
      // The axios interceptor already shows the server's error message.
      console.error("Error saving timesheet action users:", error);
      return false;
    }
  };

  // ✅ Handle Save
  const handleSave = async () => {
    try {
      updateSettings({ isSaving: true });

      if (limitedAccess) {
        const approversSaved = await saveApprovers();
        if (!approversSaved) return;
        toast.success(t("Settings saved!"));
        onSaveSuccess();
        return;
      }

      const payload = {
        phone: settings.phone,
        extension: settings.extension,
        billing_days: String(settings.billing_days),
        timeZone: settings.timeZone,
        is_billing_days: settings.is_billing_days,
      };

      const response = await api.post("/setting/save-general-setting", payload);
      if (!response.data?.IsSuccess) return;

      const approversSaved = await saveApprovers();
      if (!approversSaved) return;

      toast.success(response.data.message);
      onSaveSuccess();
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      updateSettings({ isSaving: false });
    }
  };

  if (settings.loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="200px"
      >
        <CircularProgress />
      </Box>
    );
  }

  const renderApproverPicker = () => {
    if (approverLoadState === "loading") {
      return <Skeleton variant="rounded" height={48} />;
    }

    if (approverLoadState === "error") {
      return (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={fetchApprovers}>
              {t("Retry")}
            </Button>
          }
        >
          {t("Could not load users, please try again")}
        </Alert>
      );
    }

    const anyDelete = accessRows.some((row) => row.delete);
    const activeCount = accessRows.filter(hasAnyAction).length;
    // Header and user rows share these columns so everything lines up.
    const tableColumns = `minmax(0, 1fr) repeat(${TIMESHEET_ACTIONS.length}, 110px) 44px`;
    const tableRowSx = {
      display: "grid",
      gridTemplateColumns: { xs: "minmax(0, 1fr) 44px", sm: tableColumns },
      alignItems: "center",
      px: 2,
    } as const;

    return (
      <>
        <Autocomplete
          multiple
          disableCloseOnSelect
          options={approverOptions}
          value={selectedAccessUsers}
          onChange={(_, value) => handleAccessUsersChange(value.map((o) => o.id))}
          getOptionLabel={(option) => option.name}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          noOptionsText={t("No users found")}
          disabled={settings.isSaving}
          disableClearable
          renderOption={(props, option, { selected }) => {
            const { key, ...optionProps } = props as any;
            return (
              <li key={option.id} {...optionProps}>
                <Checkbox size="small" checked={selected} sx={{ mr: 1, p: 0.5 }} />
                <Avatar src={option.image ?? undefined} sx={{ width: 28, height: 28, mr: 1.5, fontSize: 12 }}>
                  {getInitials(option.name)}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" noWrap>
                    {option.name}
                  </Typography>
                  {option.subtitle && (
                    <Typography variant="caption" color="text.secondary" display="block" noWrap>
                      {option.subtitle}
                    </Typography>
                  )}
                </Box>
              </li>
            );
          }}
          // Selected users are listed below with their actions, so no chips here.
          renderValue={() => null}
          renderInput={(params) => (
            <TextField {...params} size="small" placeholder={t("Search and add users")} />
          )}
        />

        {selectedAccessUsers.length === 0 ? (
          <Box
            sx={{
              mt: 1.5,
              py: 3,
              px: 2,
              border: "1px dashed",
              borderColor: "divider",
              borderRadius: 2,
              textAlign: "center",
            }}
          >
            <IconUsers size={22} style={{ opacity: 0.5 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t("No users added, only Admins can edit, lock, unlock, mark as paid or delete timesheets")}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ mt: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
            {/* Column headers (wide screens). With 2+ users each header has a checkbox that
                ticks or clears that action for everyone. */}
            <Box
              sx={{
                ...tableRowSx,
                display: { xs: "none", sm: "grid" },
                py: 1.25,
                bgcolor: "grey.50",
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography variant="caption" fontWeight={600} color="text.secondary">
                {t("User")}
              </Typography>
              {TIMESHEET_ACTIONS.map((action) => {
                const color = action.key === "delete" ? "error.main" : "text.secondary";
                if (selectedAccessUsers.length < 2) {
                  return (
                    <Box key={action.key} display="flex" alignItems="center" justifyContent="center" gap={0.5} sx={{ color }}>
                      <action.icon size={14} />
                      <Typography variant="caption" fontWeight={600} color="inherit">
                        {t(action.label)}
                      </Typography>
                    </Box>
                  );
                }
                const ticked = accessRows.filter((row) => row[action.key]).length;
                return (
                  <Tooltip key={action.key} title={`${t("Select all")} · ${t(action.label)}`}>
                    {/* The checkbox sits in the column centre (same line as the row checkboxes);
                        the name hangs to its right. */}
                    <Box
                      component="label"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      sx={{ position: "relative", color, cursor: "pointer", userSelect: "none" }}
                    >
                      <Checkbox
                        size="small"
                        checked={ticked === accessRows.length}
                        indeterminate={ticked > 0 && ticked < accessRows.length}
                        onChange={(e) => setActionForAll(action.key, e.target.checked)}
                        disabled={settings.isSaving}
                        sx={{ p: 0.5 }}
                        inputProps={{ "aria-label": `${t("Select all")} ${t(action.label)}` }}
                      />
                      <Typography
                        variant="caption"
                        fontWeight={600}
                        color="inherit"
                        noWrap
                        sx={{ position: "absolute", left: "calc(50% + 16px)", top: "50%", transform: "translateY(-50%)" }}
                      >
                        {t(action.label)}
                      </Typography>
                    </Box>
                  </Tooltip>
                );
              })}
              <span />
            </Box>

            {selectedAccessUsers.map((option, index) => {
              const row = accessRows.find((r) => r.id === option.id)!;
              const noAction = !hasAnyAction(row);
              return (
                <Box
                  key={option.id}
                  sx={{
                    ...tableRowSx,
                    py: 1,
                    borderTop: index === 0 ? "none" : "1px solid",
                    borderColor: "divider",
                    transition: "background-color 120ms",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1.5} sx={{ minWidth: 0, opacity: noAction ? 0.6 : 1 }}>
                    <Avatar src={option.image ?? undefined} sx={{ width: 34, height: 34, fontSize: 13 }}>
                      {getInitials(option.name)}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={500} noWrap>
                        {option.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        color={noAction ? "warning.dark" : "text.secondary"}
                        display="block"
                        noWrap
                      >
                        {noAction ? t("No actions, removed when you save") : option.subtitle}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Wide screens: one checkbox per column. Small screens: labelled checkboxes under the name. */}
                  <Box
                    sx={{
                      display: { xs: "flex", sm: "contents" },
                      flexWrap: "wrap",
                      columnGap: 1.5,
                      gridColumn: { xs: "1 / -1", sm: "auto" },
                      gridRow: { xs: 2, sm: "auto" },
                      ml: { xs: 5.5, sm: 0 },
                    }}
                  >
                    {TIMESHEET_ACTIONS.map((action) => (
                      <Box
                        key={action.key}
                        component="label"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        sx={{ cursor: "pointer" }}
                      >
                        <Checkbox
                          size="small"
                          checked={row[action.key]}
                          onChange={(e) => toggleAction(option.id, action.key, e.target.checked)}
                          disabled={settings.isSaving}
                          inputProps={{ "aria-label": `${option.name} ${t(action.label)}` }}
                        />
                        <Typography variant="caption" sx={{ display: { xs: "inline", sm: "none" } }}>
                          {t(action.label)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  <Box display="flex" justifyContent="center">
                    <Tooltip title={t("Remove")}>
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => removeAccessUser(option.id)}
                          disabled={settings.isSaving}
                          aria-label={t("Remove")}
                          sx={{ color: "text.disabled", "&:hover": { color: "error.main" } }}
                        >
                          <IconX size={16} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

        {selectedAccessUsers.length > 0 && (
          <Box display="flex" justifyContent="space-between" alignItems="center" mt={1} px={0.5}>
            <Typography variant="caption" color="text.secondary">
              {t("{{count}} users", { count: activeCount })}
              {adminCount > 0 && ` · ${t("Admins can always do everything")}`}
            </Typography>
            <Button
              size="small"
              color="inherit"
              onClick={() => setAccessRows([])}
              disabled={settings.isSaving}
              sx={{ textTransform: "none", color: "text.secondary", fontSize: 12, minWidth: 0, px: 1 }}
            >
              {t("Clear all")}
            </Button>
          </Box>
        )}

        {anyDelete && (
          <Box display="flex" alignItems="center" gap={0.75} mt={1} px={0.5} sx={{ color: "warning.dark" }}>
            <IconAlertTriangle size={14} />
            <Typography variant="caption" color="inherit">
              {/* Two keys: i18n keys can't contain "." */}
              {t("Delete removes all hours, pricework, expenses and penalties in the selected date range")}
              {". "}
              {t("Paid records can't be deleted, and there is no undo")}
              {"."}
            </Typography>
          </Box>
        )}

        {approversChanged && (
          <Typography variant="caption" color="warning.main" sx={{ display: "block", mt: 1, px: 0.5 }}>
            {t("Unsaved changes — click Save changes to apply them")}
          </Typography>
        )}
      </>
    );
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Scrollable Content */}
        <Box sx={{ flex: 1, overflowY: "auto", p: 3, bgcolor: "white" }}>
          <Box sx={{ maxWidth: 900, mx: "auto" }}>
            <Box>
              {!limitedAccess && (
              <>
              {/* Billing Days */}
              <Box>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Box display="flex" alignItems="center">
                    <Checkbox
                      checked={settings.is_billing_days}
                      onChange={createCheckboxHandler("is_billing_days")}
                      sx={{ p: 0, mr: 1 }}
                      size="small"
                    />
                    <Box>
                      <Typography variant="body2">
                        {t('Allow bookkeeper to start work without fill billing info')}
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <TextField
                      variant="outlined"
                      size="small"
                      type="text"
                      disabled={!settings.is_billing_days}
                      value={settings.billing_days}
                      onChange={(e) => {
                        const value = Number(e.target.value.replace(/\D/g, ""));

                        updateSettings({
                          billing_days: Math.max(0, Math.min(365, value || 0)),
                        });
                      }}
                      sx={{
                        width: 72,
                        "& .MuiOutlinedInput-root": { bgcolor: "#fff" },
                      }}
                      inputProps={{
                        inputMode: "numeric",
                        maxLength: 3,
                        "aria-label": t("Days"),
                        style: { textAlign: "center" },
                      }}
                    />
                    {t('Days')}
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* HR Contact */}
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
              >
                <Box display="flex" alignItems="center">
                  <Typography variant="body2">
                    {t('HR Contact Information')}
                  </Typography>
                </Box>

                <Box display="flex" alignItems="center" gap={1}>
                  <PhoneInput
                    country="gb"
                    value={`${settings.extension}${settings.phone}`}
                    onChange={(value, country: any) => {
                      const dialCode = country.dialCode;

                      updateSettings({
                        extension: `+${dialCode}`,
                        phone: value.slice(dialCode.length),
                      });
                    }}
                    inputStyle={{
                      height: "47px",
                      borderColor: "#c0d1dc9c",
                      backgroundColor:"transparent"
                    }}
                    enableSearch
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />
              </>
              )}

              {/* Time Clock actions: Lock / Unlock / Paid / Delete */}
              <Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <IconShieldCheck size={18} />
                  <Typography variant="body2" fontWeight={600}>
                    {t('Timesheet actions')}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5, mb: 1.5 }}>
                  {t('Choose who can lock, unlock, mark as paid and delete timesheets in Time Clock')}
                </Typography>

                {renderApproverPicker()}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Fixed Footer with Save Button */}
        <Box
          sx={{
            borderTop: "1px solid #e0e0e0",
            p: 2,
            bgcolor: "#fff",
            position: "sticky",
            bottom: 0,
            zIndex: 1000,
            textAlign: "right",
          }}
        >
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={settings.isSaving || (limitedAccess && !approversChanged)}
            sx={{
              bgcolor: "#1976d2",
              color: "#fff",
              "&:hover": {
                bgcolor: "#1565c0",
              },
              "&:disabled": {
                bgcolor: "#ccc",
              },
            }}
          >
            {settings.isSaving ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1, color: "inherit" }} />
                {t('Saving...')}
              </>
            ) : (
              t('Save changes')
            )}
          </Button>
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default BookkeeperSetting;
