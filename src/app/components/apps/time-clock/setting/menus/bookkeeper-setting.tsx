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
  Chip,
  CircularProgress,
  Divider,
  Skeleton,
} from "@mui/material";
import { IconLock, IconLockOpen, IconCash, IconShieldCheck } from "@tabler/icons-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/material.css";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";

// Users listed under this request-action slug can Lock, Unlock and mark
// timesheets as Paid (checked in the backend by validateTimesheetActionAccess).
const TIMESHEET_ACTION_SLUG = "timesheet_approve";
const TIMESHEET_ACTION_NAME = "Edit Timesheet";

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

const parseUserIds = (value: unknown): number[] => {
  if (Array.isArray(value)) {
    return value.map(Number).filter((id) => Number.isFinite(id) && id > 0);
  }
  if (value === null || value === undefined) return [];
  return String(value)
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isFinite(id) && id > 0);
};

const sameIds = (a: number[], b: number[]) => {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
};

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

  // Timesheet action access (Lock / Unlock / Paid)
  const [approverLoadState, setApproverLoadState] = useState<ApproverLoadState>("loading");
  const [approverOptions, setApproverOptions] = useState<ApproverOption[]>([]);
  const [adminCount, setAdminCount] = useState(0);
  const [requestActionId, setRequestActionId] = useState<number | null>(null);
  const [savedApproverIds, setSavedApproverIds] = useState<number[]>([]);
  const [selectedApproverIds, setSelectedApproverIds] = useState<number[]>([]);

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
        api.get("request-action/list", { skipToast: true } as any),
        api.get("user/list", { params: { company_id: companyId }, skipToast: true } as any),
      ]);

      const rawUsers: any[] = usersRes.data?.IsSuccess ? usersRes.data.info || [] : [];
      const options: ApproverOption[] = [];
      let admins = 0;
      for (const u of rawUsers) {
        const id = Number(u.id);
        if (!Number.isFinite(id)) continue;
        // Admins always have access, so they are not offered in the picker.
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

      const actions: any[] = actionsRes.data?.info || [];
      const action = actions.find(
        (item) => String(item.request_slug ?? item.slug ?? "").trim() === TIMESHEET_ACTION_SLUG,
      );
      // Keep only users that still exist in the picker, so saving never sends
      // removed/inactive users (the backend rejects those).
      const optionIds = new Set(options.map((o) => o.id));
      const savedIds = parseUserIds(action?.user_ids ?? action?.selected_users).filter((id) =>
        optionIds.has(id),
      );

      setApproverOptions(options);
      setAdminCount(admins);
      setRequestActionId(action ? Number(action.id) : null);
      setSavedApproverIds(savedIds);
      setSelectedApproverIds(savedIds);
      setApproverLoadState("ready");
    } catch (error) {
      console.error("Error fetching timesheet access users:", error);
      setApproverLoadState("error");
    }
  }, [companyId]);

  useEffect(() => {
    if (session.status === "loading") return;
    fetchApprovers();
  }, [fetchApprovers, session.status]);

  const selectedApprovers = useMemo(() => {
    const byId = new Map(approverOptions.map((o) => [o.id, o]));
    return selectedApproverIds
      .map((id) => byId.get(id))
      .filter((o): o is ApproverOption => Boolean(o));
  }, [approverOptions, selectedApproverIds]);

  const approversChanged =
    approverLoadState === "ready" && !sameIds(savedApproverIds, selectedApproverIds);

  // Returns true when there was nothing to save or the save succeeded.
  const saveApprovers = async (): Promise<boolean> => {
    if (!approversChanged) return true;

    try {
      if (selectedApproverIds.length === 0) {
        if (requestActionId) {
          await api.delete(`request-action/${requestActionId}`);
        }
        setRequestActionId(null);
      } else {
        const payload = {
          request_name: TIMESHEET_ACTION_NAME,
          request_slug: TIMESHEET_ACTION_SLUG,
          selected_users: selectedApproverIds.join(","),
        };
        if (requestActionId) {
          await api.put(`request-action/edit/${requestActionId}`, payload);
        } else {
          const res = await api.post("request-action/create", payload);
          const newId = Number(res.data?.info?.id);
          if (Number.isFinite(newId)) setRequestActionId(newId);
        }
      }
      setSavedApproverIds(selectedApproverIds);
      return true;
    } catch (error) {
      // The axios interceptor already shows the server's error message.
      console.error("Error saving timesheet access users:", error);
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

    return (
      <>
        <Autocomplete
          multiple
          disableCloseOnSelect
          options={approverOptions}
          value={selectedApprovers}
          onChange={(_, value) => setSelectedApproverIds(value.map((o) => o.id))}
          getOptionLabel={(option) => option.name}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          noOptionsText={t("No users found")}
          disabled={settings.isSaving}
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
          renderValue={(value, getItemProps) =>
            value.map((option, index) => {
              const { key, ...itemProps } = getItemProps({ index }) as any;
              return (
                <Chip
                  key={option.id}
                  {...itemProps}
                  size="small"
                  label={option.name}
                  avatar={
                    <Avatar src={option.image ?? undefined}>
                      {getInitials(option.name)}
                    </Avatar>
                  }
                />
              );
            })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              placeholder={selectedApprovers.length ? "" : t("Search and select users")}
            />
          )}
        />

        <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
          <Typography variant="caption" color="text.secondary">
            {selectedApprovers.length === 1
              ? t("1 user selected")
              : t("{{count}} users selected", { count: selectedApprovers.length })}
            {adminCount > 0 && ` · ${t("Admins always have access")}`}
          </Typography>
          {selectedApprovers.length > 0 && (
            <Button
              size="small"
              color="inherit"
              onClick={() => setSelectedApproverIds([])}
              disabled={settings.isSaving}
              sx={{ textTransform: "none", color: "text.secondary" }}
            >
              {t("Clear all")}
            </Button>
          )}
        </Box>

        {selectedApprovers.length === 0 && (
          <Alert severity="info" sx={{ mt: 1.5 }}>
            {t("No users selected — only Admins can lock, unlock or mark timesheets as paid")}
          </Alert>
        )}

        {approversChanged && (
          <Typography variant="caption" color="warning.main" sx={{ display: "block", mt: 1 }}>
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

              {/* Timesheet access: Lock / Unlock / Paid */}
              <Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <IconShieldCheck size={18} />
                  <Typography variant="body2" fontWeight={600}>
                    {t('Timesheet lock & payment access')}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5, mb: 1 }}>
                  {t('Choose who can lock, unlock and mark timesheets as paid in Time Clock — they can also edit locked timesheet entries')}
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                  <Chip size="small" variant="outlined" icon={<IconLock size={14} />} label={t('Lock')} />
                  <Chip size="small" variant="outlined" icon={<IconLockOpen size={14} />} label={t('Unlock')} />
                  <Chip size="small" variant="outlined" icon={<IconCash size={14} />} label={t('Paid')} />
                </Box>

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
