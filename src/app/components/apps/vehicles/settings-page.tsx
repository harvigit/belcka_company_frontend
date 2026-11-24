"use client";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";
import { IconArrowDown, IconArrowUp, IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import FormDrawer from "../inventory-new/shared/FormDrawer";
import FormField from "../inventory-new/shared/FormField";
import ConfirmDialog from "../inventory-new/shared/ConfirmDialog";
import FleetNav from "./fleet-nav";
import { RecordTable, Section } from "./detail/common";
import { Connection, CONNECTION_KIND, DailyCheckItem, DEFAULT_FLEET_RULES, FleetRules, formatDate, OnboardingTemplate } from "./types";
import { DriverOption, useVehicles } from "./useVehicles";
import { useDrivers } from "./useDrivers";
import { DriverName, NoCompany } from "./shared";

type DailyCheckForm = { id?: number; title: string; is_critical: boolean; all_drivers: boolean; driver_ids: number[] };

type NumberRule = Exclude<keyof FleetRules, "odometerEveryFill" | "motValidMonths">;

const RULES: { group: string; fields: { key: NumberRule; label: string; unit: string; min: number; max: number }[] }[] = [
  {
    group: "Service",
    fields: [
      { key: "serviceMonths", label: "Service every", unit: "months", min: 1, max: 36 },
      { key: "serviceMiles", label: "or every", unit: "miles", min: 1000, max: 50000 },
    ],
  },
  {
    group: "Tyres",
    fields: [
      { key: "tyreCheckMonths", label: "Tyre check every", unit: "months", min: 1, max: 24 },
      { key: "tyreCheckMiles", label: "or every", unit: "miles", min: 1000, max: 50000 },
      { key: "treadLimitMm", label: "Replace tyres at", unit: "mm", min: 1.6, max: 8 },
    ],
  },
  {
    group: "Checks and reminders",
    fields: [
      { key: "photoCheckMonths", label: "Photo check about every", unit: "months", min: 1, max: 12 },
      { key: "dueSoonDays", label: "Show as due soon", unit: "days before", min: 1, max: 120 },
    ],
  },
  {
    group: "Private cars",
    fields: [{ key: "mileageRatePence", label: "Default mileage rate", unit: "pence per mile", min: 1, max: 200 }],
  },
];

const SettingsPage: React.FC = () => {
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null; name?: string | null };
  const store = useVehicles(user?.company_id, user?.name || "You");
  const employees = useDrivers(user?.company_id);

  const [form, setForm] = useState<Record<string, string>>({});
  const [odometer, setOdometer] = useState(true);
  const [editing, setEditing] = useState<{ id?: number; name: string; steps: string[] } | null>(null);
  const [toDelete, setToDelete] = useState<OnboardingTemplate | null>(null);
  const [editingCheck, setEditingCheck] = useState<DailyCheckForm | null>(null);
  const [checkToDelete, setCheckToDelete] = useState<DailyCheckItem | null>(null);
  const [connecting, setConnecting] = useState<Connection | null>(null);
  const [account, setAccount] = useState("");
  const [disconnecting, setDisconnecting] = useState<Connection | null>(null);

  const toForm = (s: FleetRules) =>
    Object.fromEntries(RULES.flatMap((g) => g.fields).map((f) => [f.key, String(s[f.key])]));

  useEffect(() => {
    if (store.loading) return;
    if (window.location.hash === "#connections")
      setTimeout(() => document.getElementById("connections")?.scrollIntoView({ behavior: "smooth" }), 100);
    setForm(toForm(store.settings));
    setOdometer(store.settings.odometerEveryFill);
  }, [store.loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const fieldError = (key: NumberRule) => {
    const f = RULES.flatMap((g) => g.fields).find((x) => x.key === key)!;
    const n = Number(form[key]);
    if (form[key] === "" || Number.isNaN(n)) return "Enter a number.";
    if (n < f.min || n > f.max) return `Between ${f.min} and ${f.max.toLocaleString("en-GB")}.`;
    return "";
  };
  const hasErrors = RULES.flatMap((g) => g.fields).some((f) => fieldError(f.key));
  const dirty =
    !store.loading &&
    (JSON.stringify(form) !== JSON.stringify(toForm(store.settings)) || odometer !== store.settings.odometerEveryFill);

  const saveRules = async () => {
    if (hasErrors) {
      toast.error("Please check the highlighted rules.");
      return;
    }
    const next = { ...store.settings, odometerEveryFill: odometer } as FleetRules;
    RULES.flatMap((g) => g.fields).forEach((f) => {
      (next[f.key] as number) = Number(form[f.key]);
    });
    await store.saveSettings(next);
    toast.success("Rules saved. Due dates use them from now on.");
  };

  const inUse = (templateId: number) =>
    store.vehicles.filter((v) => {
      if (!v.driver_id || v.status === "archived") return false;
      const o = store.onboardings
        .filter((x) => x.vehicle_id === v.id && x.driver_id === v.driver_id)
        .sort((a, b) => b.id - a.id)[0];
      return o?.template_id === templateId;
    }).length;

  // Move a daily check up (-1) or down (1).
  const moveCheck = async (index: number, by: number) => {
    const ids = store.dailyChecks.map((c) => c.id);
    [ids[index], ids[index + by]] = [ids[index + by], ids[index]];
    try {
      await store.sortDailyChecks(ids);
    } catch {
      return;
    }
  };

  if (store.noCompany) return <NoCompany />;

  return (
    <Box sx={{ minHeight: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
      <FleetNav data={store} />

      <Box p={2} display="flex" flexDirection="column" gap={4}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Fleet settings
          </Typography>
          <Typography variant="body2" color="textSecondary">
            The same rules apply to every company vehicle. Private cars only need a valid MOT and insurance.
          </Typography>
        </Box>

        <Section
          title="Rules"
          subtitle="A check is due after the set months or miles, whichever comes first. The photo check date is picked at random inside the period so drivers can't predict it."
          actions={
            <>
              <Button
                variant="outlined"
                disabled={store.loading}
                onClick={() => {
                  setForm(toForm(DEFAULT_FLEET_RULES));
                  setOdometer(DEFAULT_FLEET_RULES.odometerEveryFill);
                }}
              >
                Use defaults
              </Button>
              <Button variant="contained" disabled={!dirty} onClick={saveRules}>
                Save rules
              </Button>
            </>
          }
        >
          {dirty && (
            <Alert severity="info" sx={{ mb: 2 }}>
              You have unsaved changes.
            </Alert>
          )}
          <Grid container spacing={2}>
            {RULES.map((g) => (
              <Grid key={g.group} size={{ xs: 12, md: 6 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
                  <Typography fontWeight={700} mb={1.5}>
                    {g.group}
                  </Typography>
                  <Stack spacing={2}>
                    {g.fields.map((f) => {
                      const err = fieldError(f.key);
                      return (
                        <Stack key={f.key} direction="row" alignItems="center" spacing={2}>
                          <Typography variant="body2" sx={{ flex: 1 }}>
                            {f.label}
                          </Typography>
                          <CustomTextField
                            size="small"
                            value={form[f.key] ?? ""}
                            onChange={(e: any) =>
                              /^\d{0,6}(\.\d{0,1})?$/.test(e.target.value) &&
                              setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                            }
                            error={!!err}
                            helperText={err}
                            sx={{ width: 220 }}
                            slotProps={{
                              htmlInput: { inputMode: "decimal", style: { textAlign: "right" } },
                              input: { endAdornment: <InputAdornment position="end">{f.unit}</InputAdornment> },
                            }}
                          />
                        </Stack>
                      );
                    })}
                    {g.group === "Checks and reminders" && (
                      <FormControlLabel
                        control={<Switch checked={odometer} onChange={(e) => setOdometer(e.target.checked)} />}
                        label={
                          <Typography variant="body2">
                            Odometer reading required at every fuel fill
                          </Typography>
                        }
                      />
                    )}
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Section>

        <Divider />

        <Section
          title="Onboarding types"
          subtitle="Each type has its own list of steps. When a vehicle is given to a person, the list for its type starts: Manager for management cars, Driver for the rest."
          actions={
            <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={() => setEditing({ name: "", steps: [""] })}>
              Add type
            </Button>
          }
        >
          <RecordTable<OnboardingTemplate>
            rows={store.templates}
            empty="No onboarding types. Add one so new drivers get a start list."
            columns={[
              { header: "Type", render: (t) => <Typography fontWeight={600}>{t.name}</Typography> },
              {
                header: "Steps",
                render: (t) => (
                  <Box sx={{ maxWidth: 520 }}>
                    <Typography variant="body2">{t.steps.map((s) => s.title).join(" · ")}</Typography>
                  </Box>
                ),
              },
              {
                header: "In use",
                render: (t) => {
                  const n = inUse(t.id);
                  return <Chip size="small" variant="outlined" label={`${n} driver${n === 1 ? "" : "s"}`} />;
                },
              },
              {
                header: "",
                align: "right",
                render: (t) => {
                  const n = inUse(t.id);
                  const last = store.templates.length === 1;
                  return (
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Edit">
                        <IconButton
                          color="primary"
                          onClick={() => setEditing({ id: t.id, name: t.name, steps: t.steps.map((s) => s.title) })}
                        >
                          <IconEdit size={18} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={n ? "In use by current drivers" : last ? "Keep at least one type" : "Delete"}>
                        <span>
                          <IconButton color="error" disabled={n > 0 || last} onClick={() => setToDelete(t)}>
                            <IconTrash size={18} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  );
                },
              },
            ]}
          />
        </Section>

        <Divider />

        <Section
          title="Daily checks"
          subtitle="Drivers tick these in the app each day before the first journey and send the check. Give a check to all drivers or only to the drivers who need it. An item marked as a defect needs a photo and goes to the Action Centre. Checks already sent keep their items."
          actions={
            <Button
              variant="contained"
              startIcon={<IconPlus size={16} />}
              onClick={() => setEditingCheck({ title: "", is_critical: false, all_drivers: true, driver_ids: [] })}
            >
              Add check
            </Button>
          }
        >
          <RecordTable<DailyCheckItem>
            rows={store.dailyChecks}
            empty="No daily checks. Add one so drivers have something to tick in the app."
            columns={[
              {
                header: "#",
                render: (c) => (
                  <Typography variant="body2" color="textSecondary">
                    {store.dailyChecks.indexOf(c) + 1}
                  </Typography>
                ),
              },
              { header: "Check", render: (c) => <Typography fontWeight={600}>{c.title}</Typography> },
              {
                header: "Drivers",
                render: (c) =>
                  c.all_drivers ? (
                    <Chip size="small" variant="outlined" color="primary" label="All drivers" />
                  ) : (
                    <Box sx={{ maxWidth: 420 }}>
                      <Typography variant="body2">{c.drivers.map((d) => d.name).join(", ")}</Typography>
                    </Box>
                  ),
              },
              {
                header: "Defect level",
                render: (c) =>
                  c.is_critical ? (
                    <Chip size="small" color="error" variant="outlined" label="Critical" />
                  ) : (
                    <Chip size="small" variant="outlined" label="Major" />
                  ),
              },
              {
                header: "",
                align: "right",
                render: (c) => {
                  const i = store.dailyChecks.indexOf(c);
                  const last = store.dailyChecks.length === 1;
                  return (
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Move up">
                        <span>
                          <IconButton disabled={i === 0} onClick={() => moveCheck(i, -1)}>
                            <IconArrowUp size={18} />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Move down">
                        <span>
                          <IconButton disabled={i === store.dailyChecks.length - 1} onClick={() => moveCheck(i, 1)}>
                            <IconArrowDown size={18} />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton
                          color="primary"
                          onClick={() =>
                            setEditingCheck({
                              id: c.id,
                              title: c.title,
                              is_critical: c.is_critical,
                              all_drivers: c.all_drivers,
                              driver_ids: c.drivers.map((d) => d.id),
                            })
                          }
                        >
                          <IconEdit size={18} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={last ? "Keep at least one check" : "Delete"}>
                        <span>
                          <IconButton color="error" disabled={last} onClick={() => setCheckToDelete(c)}>
                            <IconTrash size={18} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  );
                },
              },
            ]}
          />
        </Section>

        <Divider />

        <Box id="connections">
          <Section
            title="Connections"
            subtitle="Services the fleet takes data from. File imports are used from Fuel cards and Road costs; services that need a server are set up by the IT team."
          >
            <Grid container spacing={2}>
              {store.connections.map((c) => (
                <Grid key={c.id} size={{ xs: 12, md: 6 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%", display: "flex", flexDirection: "column", gap: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                      <Typography fontWeight={700}>{c.name}</Typography>
                      <Chip
                        size="small"
                        color={c.connected ? "success" : c.kind === "server" ? "default" : "warning"}
                        variant={c.connected ? "filled" : "outlined"}
                        label={c.connected ? "Connected" : c.kind === "server" ? "Needs a server" : "Not connected"}
                      />
                    </Stack>
                    <Typography variant="body2" color="textSecondary" sx={{ flex: 1 }}>
                      {c.brings}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {CONNECTION_KIND[c.kind]}
                      {c.connected && c.account ? ` · ${c.account}` : ""}
                      {c.connected ? ` · connected by ${c.connected_by}, ${formatDate(c.connected_at)}` : ""}
                    </Typography>
                    <Box>
                      {c.kind === "server" ? (
                        <Tooltip title="Needs a secret key kept on the Belcka server. The IT team sets it up.">
                          <span>
                            <Button size="small" variant="outlined" disabled>
                              Set up by IT
                            </Button>
                          </span>
                        </Tooltip>
                      ) : c.connected ? (
                        <Button size="small" variant="outlined" color="error" onClick={() => setDisconnecting(c)}>
                          Disconnect
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => {
                            setAccount(c.account);
                            setConnecting(c);
                          }}
                        >
                          Connect
                        </Button>
                      )}
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Section>
        </Box>
      </Box>

      <TemplateDrawer
        value={editing}
        names={store.templates.filter((t) => t.id !== editing?.id).map((t) => t.name.toLowerCase())}
        onClose={() => setEditing(null)}
        onSave={async (t) => {
          await store.saveTemplate(t);
          toast.success(t.id ? `${t.name} updated. Lists already started keep their steps.` : `${t.name} added.`);
          setEditing(null);
        }}
      />

      <DailyCheckDrawer
        value={editingCheck}
        employees={employees}
        names={store.dailyChecks.filter((c) => c.id !== editingCheck?.id).map((c) => c.title.toLowerCase())}
        onClose={() => setEditingCheck(null)}
        onSave={async (c) => {
          try {
            await store.saveDailyCheck(c);
          } catch {
            return;
          }
          toast.success(c.id ? `${c.title} updated. Drivers see it from their next check.` : `${c.title} added.`);
          setEditingCheck(null);
        }}
      />

      <ConfirmDialog
        open={!!connecting}
        title={connecting ? `Connect ${connecting.name}` : ""}
        message={
          connecting?.kind === "file"
            ? "You download the statement from the service and import it here. Add the account number so imports can be checked against it."
            : "Turn on this live service."
        }
        confirmLabel="Connect"
        confirmColor="primary"
        onClose={() => setConnecting(null)}
        onConfirm={async () => {
          if (!connecting) return;
          await store.setConnection(connecting.id, true, account.trim());
          toast.success(`${connecting.name} connected.`);
          setConnecting(null);
        }}
      >
        {connecting?.kind === "file" && (
          <CustomTextField
            fullWidth
            label="Account number (optional)"
            helperText="Do not enter passwords or secret keys here."
            value={account}
            onChange={(e: any) => setAccount(e.target.value.slice(0, 40))}
            sx={{ mt: 2 }}
          />
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={!!disconnecting}
        title={disconnecting ? `Disconnect ${disconnecting.name}` : ""}
        message="Records already imported stay. New files from this service can't be imported until it is connected again."
        confirmLabel="Disconnect"
        onClose={() => setDisconnecting(null)}
        onConfirm={async () => {
          if (!disconnecting) return;
          await store.setConnection(disconnecting.id, false);
          toast.success(`${disconnecting.name} disconnected.`);
          setDisconnecting(null);
        }}
      />
      <ConfirmDialog
        open={!!toDelete}
        title="Delete onboarding type"
        message={toDelete ? `Delete ${toDelete.name}? Lists already started keep their steps.` : ""}
        confirmLabel="Delete"
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          await store.deleteTemplate(toDelete.id);
          toast.success(`${toDelete.name} deleted.`);
          setToDelete(null);
        }}
      />
      <ConfirmDialog
        open={!!checkToDelete}
        title="Delete daily check"
        message={checkToDelete ? `Delete ${checkToDelete.title}? Drivers stop seeing it; checks already sent keep it.` : ""}
        confirmLabel="Delete"
        onClose={() => setCheckToDelete(null)}
        onConfirm={async () => {
          if (!checkToDelete) return;
          try {
            await store.deleteDailyCheck(checkToDelete.id);
          } catch {
            return;
          }
          toast.success(`${checkToDelete.title} deleted.`);
          setCheckToDelete(null);
        }}
      />
    </Box>
  );
};

const TemplateDrawer: React.FC<{
  value: { id?: number; name: string; steps: string[] } | null;
  names: string[];
  onClose: () => void;
  onSave: (t: { id?: number; name: string; steps: string[] }) => Promise<void>;
}> = ({ value, names, onClose, onSave }) => {
  const [name, setName] = useState("");
  const [steps, setSteps] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (value) {
      setName(value.name);
      setSteps(value.steps.length ? value.steps : [""]);
      setShowErrors(false);
    }
  }, [value]);

  if (!value) return null;
  const filled = steps.map((s) => s.trim()).filter(Boolean);
  const nameError = !name.trim()
    ? showErrors
      ? "Enter a name."
      : ""
    : names.includes(name.trim().toLowerCase())
      ? "There is already a type with this name."
      : "";
  const stepsError = showErrors && !filled.length ? "Add at least one step." : "";
  const duplicate = filled.find((s, i) => filled.findIndex((x) => x.toLowerCase() === s.toLowerCase()) !== i);

  const move = (i: number, by: number) =>
    setSteps((list) => {
      const next = [...list];
      [next[i], next[i + by]] = [next[i + by], next[i]];
      return next;
    });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    if (!name.trim() || nameError || !filled.length || duplicate) {
      toast.error("Please check the highlighted fields.");
      return;
    }
    await onSave({ id: value.id, name: name.trim(), steps: filled });
  };

  return (
    <FormDrawer
      open
      title={value.id ? "Edit onboarding type" : "Add onboarding type"}
      onClose={onClose}
      onSubmit={submit}
      isSaving={false}
      submitLabel="Save type"
    >
      <FormField label="Name *" hint={nameError ? undefined : "e.g. Driver, Manager, Apprentice"}>
        <CustomTextField
          fullWidth
          value={name}
          onChange={(e: any) => setName(e.target.value.slice(0, 40))}
          error={!!nameError}
          helperText={nameError}
        />
      </FormField>
      <FormField label="Steps *" hint="In the order they should be done.">
        <Stack spacing={1}>
          {steps.map((s, i) => (
            <Stack key={i} direction="row" spacing={0.5} alignItems="center">
              <Typography variant="body2" color="textSecondary" sx={{ width: 20 }}>
                {i + 1}.
              </Typography>
              <CustomTextField
                fullWidth
                size="small"
                value={s}
                placeholder="e.g. Driving licence checked"
                onChange={(e: any) => setSteps((list) => list.map((x, j) => (j === i ? e.target.value.slice(0, 100) : x)))}
              />
              <IconButton size="small" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                <IconArrowUp size={16} />
              </IconButton>
              <IconButton size="small" disabled={i === steps.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                <IconArrowDown size={16} />
              </IconButton>
              <IconButton
                size="small"
                color="error"
                disabled={steps.length === 1}
                onClick={() => setSteps((list) => list.filter((_, j) => j !== i))}
                aria-label="Remove step"
              >
                <IconTrash size={16} />
              </IconButton>
            </Stack>
          ))}
          <Box>
            <Button size="small" variant="outlined" startIcon={<IconPlus size={16} />} onClick={() => setSteps((l) => [...l, ""])}>
              Add step
            </Button>
          </Box>
          {(stepsError || duplicate) && (
            <Typography variant="caption" color="error">
              {stepsError || `"${duplicate}" is in the list twice.`}
            </Typography>
          )}
        </Stack>
      </FormField>
      {value.id && (
        <Alert severity="info">Changes apply to new start lists. Lists already started keep their steps.</Alert>
      )}
    </FormDrawer>
  );
};

const DailyCheckDrawer: React.FC<{
  value: DailyCheckForm | null;
  employees: DriverOption[];
  names: string[];
  onClose: () => void;
  onSave: (c: DailyCheckForm) => Promise<void>;
}> = ({ value, employees, names, onClose, onSave }) => {
  const [title, setTitle] = useState("");
  const [critical, setCritical] = useState(false);
  const [allDrivers, setAllDrivers] = useState(true);
  const [driverIds, setDriverIds] = useState<number[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (value) {
      setTitle(value.title);
      setCritical(value.is_critical);
      setAllDrivers(value.all_drivers);
      setDriverIds(value.driver_ids);
      setShowErrors(false);
    }
  }, [value]);

  if (!value) return null;
  const titleError = !title.trim()
    ? showErrors
      ? "Enter the check."
      : ""
    : names.includes(title.trim().toLowerCase())
      ? "There is already a check with this name."
      : "";
  const driversError = showErrors && !allDrivers && !driverIds.length ? "Choose at least one driver." : "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    if (!title.trim() || titleError || (!allDrivers && !driverIds.length)) {
      toast.error("Please check the highlighted fields.");
      return;
    }
    setSaving(true);
    try {
      await onSave({ id: value.id, title: title.trim(), is_critical: critical, all_drivers: allDrivers, driver_ids: allDrivers ? [] : driverIds });
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDrawer
      open
      title={value.id ? "Edit daily check" : "Add daily check"}
      onClose={onClose}
      onSubmit={submit}
      isSaving={saving}
      submitLabel="Save check"
    >
      <FormField label="Check *" hint={titleError ? undefined : "What the driver looks at, e.g. Tyres and wheels"}>
        <CustomTextField
          fullWidth
          value={title}
          onChange={(e: any) => setTitle(e.target.value.slice(0, 60))}
          error={!!titleError}
          helperText={titleError}
        />
      </FormField>
      <FormField label="Who does this check *">
        <RadioGroup value={allDrivers ? "all" : "selected"} onChange={(e) => setAllDrivers(e.target.value === "all")}>
          <FormControlLabel value="all" control={<Radio size="small" />} label="All drivers" />
          <FormControlLabel value="selected" control={<Radio size="small" />} label="Only the drivers I choose" />
        </RadioGroup>
        {!allDrivers && (
          <Autocomplete
            multiple
            size="small"
            sx={{ mt: 1 }}
            options={employees}
            value={employees.filter((d) => driverIds.includes(d.id))}
            onChange={(_, list) => setDriverIds(list.map((d) => d.id))}
            getOptionLabel={(o) => o.name}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            disableCloseOnSelect
            noOptionsText="No employees found"
            renderOption={(props, option) => {
              const { key, ...rest } = props as any;
              return (
                <Box component="li" key={key} {...rest}>
                  <DriverName name={option.name} image={option.image} />
                </Box>
              );
            }}
            renderInput={(params) => (
              <CustomTextField
                {...params}
                placeholder={driverIds.length ? "" : "Search employee..."}
                error={!!driversError}
                helperText={driversError || "Only these drivers see the check in the app."}
              />
            )}
          />
        )}
      </FormField>
      <FormControlLabel
        control={<Switch checked={critical} onChange={(e) => setCritical(e.target.checked)} />}
        label={
          <Box>
            <Typography variant="body2">Critical</Typography>
            <Typography variant="caption" color="textSecondary">
              A defect on this check is critical, for example brakes, tyres or lights.
            </Typography>
          </Box>
        }
      />
      {value.id && <Alert severity="info">Checks already sent keep the old name.</Alert>}
    </FormDrawer>
  );
};

export default SettingsPage;
