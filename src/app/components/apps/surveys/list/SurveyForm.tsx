"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  Grid,
  IconButton,
  Link,
  Stack,
  Switch,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { IconCheck, IconChevronLeft, IconChevronRight, IconDoor, IconPlus, IconRefresh, IconTrash, IconUpload, IconX } from "@tabler/icons-react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import api from "@/utils/axios";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { DriverName } from "@/app/components/apps/vehicles/shared";
import { apiMessage } from "../settings/nhf-rates/types";
import NewAddressPanel from "./NewAddressPanel";
import { PdDetails, PdFileCard } from "./PropertyDetail";
import { PdAiStatus, PdSection, PdUpload, STATUS_META, SurveyDetail, SurveyOptions } from "./types";

type Form = {
  title: string;
  reference: string;
  project_id: number | null;
  address_id: number | null;
  template_id: number | null;
  surveyor_id: number | null;
  survey_date: string;
  notes: string;
};
// The property detail in the form: the one saved with the survey, or a new upload.
type Pd =
  | { kind: "saved"; name: string; size: number | null; url: string | null; status: PdAiStatus; details: PdSection[] | null }
  | { kind: "upload"; upload: PdUpload };

const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = (reference = ""): Form => ({
  title: "",
  reference,
  project_id: null,
  address_id: null,
  template_id: null,
  surveyor_id: null,
  survey_date: today(),
  notes: "",
});
const SECTIONS = [
  { key: "prop", label: "Property" },
  { key: "det", label: "Survey details" },
  { key: "who", label: "Surveyor & date" },
  { key: "pd", label: "Property detail", optional: true },
] as const;
type SectionKey = (typeof SECTIONS)[number]["key"];
const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("");

const issues = (f: Form) => {
  const e: Partial<Record<keyof Form, string>> = {};
  if (!f.project_id) e.project_id = "Choose a project";
  if (!f.address_id) e.address_id = f.project_id ? "Choose an address" : "Choose a project first";
  if (!f.title.trim()) e.title = "Enter a survey title";
  if (!f.reference.trim()) e.reference = "Reference is required";
  if (!f.template_id) e.template_id = "Choose a template";
  if (!f.survey_date) e.survey_date = "Choose the survey date";
  return e;
};

// Field label: small and bold, red star for required (as in the demo).
const Label: React.FC<{ children: React.ReactNode; req?: boolean; action?: React.ReactNode }> = ({ children, req, action }) => (
  <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.75} minHeight={20}>
    <Typography fontSize={13} fontWeight={600} color="text.primary">
      {children}
      {req && (
        <Box component="span" color="error.main">
          {" "}
          *
        </Box>
      )}
    </Typography>
    {action}
  </Stack>
);

const Section: React.FC<{
  id: string;
  n: number;
  done: boolean;
  title: string;
  hint: string;
  optional?: boolean;
  children: React.ReactNode;
}> = ({ id, n, done, title, hint, optional, children }) => (
  <Box id={id} sx={{ p: { xs: 2, sm: 2.5 }, border: "1px solid", borderColor: "grey.200", borderRadius: 2, backgroundColor: "background.paper", scrollMarginTop: 12 }}>
    <Stack direction="row" spacing={1.5} alignItems="flex-start" mb={2.5}>
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
          color: done ? "#fff" : "primary.main",
          backgroundColor: done ? "success.main" : "primary.light",
        }}
      >
        {done ? <IconCheck size={15} /> : n}
      </Box>
      <Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography fontSize={15} fontWeight={700} lineHeight={1.4}>
            {title}
          </Typography>
          {optional && <Chip size="small" label="Optional" sx={{ height: 20, fontSize: 11 }} />}
        </Stack>
        <Typography fontSize={13} color="textSecondary">
          {hint}
        </Typography>
      </Box>
    </Stack>
    {children}
  </Box>
);

const SurveyForm: React.FC<{
  open: boolean;
  surveyId: number | null; // null = create
  options: SurveyOptions | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ open, surveyId, options, onClose, onSaved }) => {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("sm"));
  const session = useSession();
  const user = session.data?.user as { company_id?: number | null } | undefined;
  const isEdit = !!surveyId;
  const [form, setForm] = useState<Form>(emptyForm());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [serverError, setServerError] = useState("");
  const [status, setStatus] = useState<string>("draft");
  const [step, setStep] = useState<"form" | "pd">("form");
  const [addresses, setAddresses] = useState<{ id: number; name: string }[]>([]);
  const [addrLoading, setAddrLoading] = useState(false);
  const [newAddress, setNewAddress] = useState(false);
  const [pd, setPd] = useState<Pd | null>(null);
  const [pdShared, setPdShared] = useState(false);
  const [pdRemoved, setPdRemoved] = useState(false);
  const [pdBusy, setPdBusy] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((p) => ({ ...p, [k]: v }));

  const loadAddresses = useCallback(async (projectId: number | null) => {
    setAddresses([]);
    if (!projectId) return [];
    setAddrLoading(true);
    try {
      const res = await api.get(`surveys/addresses?project_id=${projectId}`);
      setAddresses(res.data.data);
      return res.data.data as { id: number; name: string }[];
    } catch (e) {
      toast.error(apiMessage(e, "Could not load the addresses."));
      return [];
    } finally {
      setAddrLoading(false);
    }
  }, []);

  // open: a new form, or the survey to edit
  useEffect(() => {
    if (!open) return;
    setShowErrors(false);
    setServerError("");
    setStep("form");
    setPd(null);
    setPdShared(false);
    setPdRemoved(false);
    setPdBusy(null);
    setNewAddress(false);
    if (!surveyId) {
      setStatus("draft");
      setForm(emptyForm(options?.next_reference ?? ""));
      setAddresses([]);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`surveys/${surveyId}`);
        const s: SurveyDetail = res.data.data;
        setStatus(s.status);
        setForm({
          title: s.title,
          reference: s.reference,
          project_id: s.project?.id ?? null,
          address_id: s.address?.id ?? null,
          template_id: s.template_id,
          surveyor_id: s.surveyor?.id ?? null,
          survey_date: s.survey_date ?? today(),
          notes: s.notes ?? "",
        });
        const p = s.property_detail;
        if (p) {
          setPd({ kind: "saved", name: p.file_name ?? "Property detail.pdf", size: p.file_size, url: p.url, status: p.ai_status, details: p.details });
          setPdShared(p.shared);
        }
        await loadAddresses(s.project?.id ?? null);
      } catch (e) {
        toast.error(apiMessage(e, "Could not load the survey."));
        onClose();
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, surveyId]);

  // the next reference may arrive after the form opened
  useEffect(() => {
    if (open && !surveyId && options?.next_reference) setForm((p) => (p.reference ? p : { ...p, reference: options.next_reference }));
  }, [open, surveyId, options?.next_reference]);

  const project = options?.projects.find((p) => p.id === form.project_id) ?? null;
  const template = options?.templates.find((t) => t.id === form.template_id) ?? null;
  const surveyor = options?.surveyors.find((u) => u.id === form.surveyor_id) ?? null;
  const editable = !isEdit || ["draft", "assigned"].includes(status);
  const nextStatus = (editable ? (form.surveyor_id ? "assigned" : "draft") : status) as keyof typeof STATUS_META;
  const errors = showErrors ? issues(form) : {};
  const done: Record<SectionKey, boolean> = {
    prop: !!(form.project_id && form.address_id),
    det: !!(form.title.trim() && form.reference.trim() && form.template_id),
    who: !!form.survey_date,
    pd: !!pd,
  };
  const pdName = pd ? (pd.kind === "saved" ? pd.name : pd.upload.file_name) : "";
  const pdStatus = pd ? (pd.kind === "saved" ? pd.status : pd.upload.ai_status) : "none";
  const pdDetails = pd ? (pd.kind === "saved" ? pd.details : pd.upload.details) : null;
  const pdUrl = pd ? (pd.kind === "saved" ? pd.url : pd.upload.url) : null;
  const pdSize = pd ? (pd.kind === "saved" ? pd.size : pd.upload.file_size) : null;

  const goTo = (key: string) => document.getElementById(`svf-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const pickProject = (id: number | null) => {
    setForm((p) => ({ ...p, project_id: id, address_id: null }));
    setNewAddress(false);
    loadAddresses(id);
  };

  const addressAdded = async () => {
    const before = new Set(addresses.map((a) => a.id));
    const list = await loadAddresses(form.project_id);
    const added = list.filter((a) => !before.has(a.id)).sort((x, y) => y.id - x.id)[0];
    if (added) set("address_id", added.id);
    setNewAddress(false);
    toast.success("Address saved to the project and selected.");
  };

  // ---------- property detail PDF ----------
  const uploadPdf = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") return toast.error("Please upload a PDF file.");
    if (file.size > 20 * 1024 * 1024) return toast.error("The PDF is too large (max 20 MB).");
    setPdBusy(file.name);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("surveys/property-detail/read", fd, { timeout: 240000 });
      const up: PdUpload = res.data.data;
      setPd({ kind: "upload", upload: up });
      setPdRemoved(false);
      if (up.ai_status === "done") toast.success(res.data.message);
      else toast(res.data.message, { icon: "⚠️" });
    } catch (e) {
      toast.error(apiMessage(e, "Could not read the PDF."));
    }
    setPdBusy(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const readAgain = async () => {
    if (!pd) return;
    setPdBusy(pdName);
    try {
      const body = pd.kind === "upload" ? { upload_id: pd.upload.upload_id } : { survey_id: surveyId };
      const res = await api.post("surveys/property-detail/read-again", body, { timeout: 240000 });
      const up: PdUpload = res.data.data;
      setPd(pd.kind === "upload" ? { kind: "upload", upload: up } : { ...pd, status: up.ai_status, details: up.details });
      if (up.ai_status === "done") toast.success(res.data.message);
      else toast(res.data.message, { icon: "⚠️" });
    } catch (e) {
      toast.error(apiMessage(e, "Could not read the PDF."));
    }
    setPdBusy(null);
  };

  const removePdf = () => {
    if (pd?.kind === "saved") setPdRemoved(true);
    setPd(null);
    setPdShared(false);
    if (step === "pd") setStep("form");
  };

  // ---------- save ----------
  const save = async () => {
    setShowErrors(true);
    setServerError("");
    const e = issues(form);
    if (Object.keys(e).length) {
      setStep("form");
      const first = (["project_id", "address_id", "title", "reference", "template_id", "survey_date"] as const).find((k) => e[k]);
      setTimeout(() => goTo(first === "project_id" || first === "address_id" ? "prop" : first === "survey_date" ? "who" : "det"), 50);
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...form,
        title: form.title.trim(),
        reference: form.reference.trim(),
        notes: form.notes.trim(),
        pd_upload_id: pd?.kind === "upload" ? pd.upload.upload_id : undefined,
        pd_remove: isEdit && pdRemoved && !pd ? true : undefined,
        pd_shared: !!pd && pdShared,
      };
      const res = isEdit ? await api.put(`surveys/${surveyId}`, body) : await api.post("surveys", body);
      toast.success(res.data.message);
      onSaved();
    } catch (err) {
      setServerError(apiMessage(err, "Could not save the survey."));
    }
    setSaving(false);
  };

  const next = () => {
    setShowErrors(true);
    if (Object.keys(issues(form)).length) return save();
    setStep("pd");
    scrollRef.current?.scrollTo({ top: 0 });
  };

  // ---------- parts ----------
  const pdBox = pdBusy ? (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ p: 2, border: "1px dashed", borderColor: "primary.main", borderRadius: 2, backgroundColor: "primary.light" }}>
      <CircularProgress size={24} />
      <Box>
        <Typography className="f-14" fontWeight={600}>
          AI is reading {pdBusy}…
        </Typography>
        <Typography variant="caption" color="textSecondary">
          Finding the property details in the PDF. This can take up to a minute.
        </Typography>
      </Box>
    </Stack>
  ) : pd ? (
    <PdFileCard
      name={pdName}
      size={pdSize}
      url={pdUrl}
      status={pdStatus}
      details={pdDetails}
      actions={
        <>
          <Button size="small" variant="outlined" color="inherit" startIcon={<IconUpload size={16} />} onClick={() => fileRef.current?.click()}>
            Replace
          </Button>
          <Button size="small" variant="outlined" color="error" startIcon={<IconTrash size={16} />} onClick={removePdf}>
            Remove
          </Button>
        </>
      }
    />
  ) : (
    <ButtonBase
      onClick={() => fileRef.current?.click()}
      sx={{
        width: "100%",
        justifyContent: "flex-start",
        gap: 2,
        p: 2,
        borderRadius: 2,
        border: "1px dashed",
        borderColor: "grey.400",
        backgroundColor: "grey.50",
        textAlign: "left",
        "&:hover": { borderColor: "primary.main", backgroundColor: "primary.light" },
      }}
    >
      <Box sx={{ width: 40, height: 40, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", color: "primary.main", backgroundColor: "primary.light", flexShrink: 0 }}>
        <IconUpload size={20} />
      </Box>
      <Box>
        <Typography className="f-14" fontWeight={600}>
          Upload PDF
        </Typography>
        <Typography variant="caption" color="textSecondary">
          Optional · for example the void specification. AI reads the details from it.
        </Typography>
      </Box>
    </ButtonBase>
  );

  const formBody = (
    <Stack spacing={2}>
      {isEdit && !editable && <Alert severity="warning">This survey has started, so it can no longer be edited.</Alert>}

      <Section id="svf-prop" n={1} done={done.prop} title="Property" hint="Which property is surveyed. Pick the project first, then its address.">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Label req>Project</Label>
            <Autocomplete
              size="small"
              options={options?.projects ?? []}
              value={project}
              onChange={(_, p) => pickProject(p?.id ?? null)}
              getOptionLabel={(o) => (o.code ? `${o.name} · ${o.code}` : o.name)}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              getOptionKey={(o) => o.id}
              noOptionsText="No projects found"
              renderInput={(params) => (
                <CustomTextField
                  {...params}
                  placeholder="Select project"
                  error={!!errors.project_id}
                  helperText={errors.project_id ?? (project ? `Project uplift ${project.uplift_percent}% · used by the QS` : " ")}
                />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Label
              req
              action={
                project && !newAddress ? (
                  <Link component="button" type="button" underline="hover" onClick={() => setNewAddress(true)} sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: 13, fontWeight: 600 }}>
                    <IconPlus size={14} />
                    Add new address
                  </Link>
                ) : null
              }
            >
              Address
            </Label>
            <Autocomplete
              size="small"
              options={addresses}
              value={addresses.find((a) => a.id === form.address_id) ?? null}
              onChange={(_, a) => set("address_id", a?.id ?? null)}
              getOptionLabel={(o) => o.name}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              getOptionKey={(o) => o.id}
              disabled={!project}
              loading={addrLoading}
              noOptionsText="No addresses in this project yet. Use Add new address."
              renderInput={(params) => (
                <CustomTextField
                  {...params}
                  placeholder={!project ? "Select a project first" : addresses.length ? "Select address" : "No addresses yet – add one"}
                  error={!!errors.address_id}
                  helperText={
                    errors.address_id ?? (project ? `${addresses.length} ${addresses.length === 1 ? "address" : "addresses"} in ${project.name}` : " ")
                  }
                />
              )}
            />
          </Grid>
          {project && newAddress && (
            <Grid size={12}>
              <NewAddressPanel project={project} companyId={user?.company_id} onCancel={() => setNewAddress(false)} onSaved={addressAdded} />
            </Grid>
          )}
        </Grid>
      </Section>

      <Section id="svf-det" n={2} done={done.det} title="Survey details" hint="How the survey is named, and what the surveyor checks on site.">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 8 }}>
            <Label req>Survey title</Label>
            <CustomTextField
              fullWidth
              value={form.title}
              onChange={(e: any) => set("title", e.target.value.slice(0, 255))}
              placeholder="e.g. Void inspection – Flat 2"
              error={!!errors.title}
              helperText={errors.title ?? "Shown in the survey list and in the app"}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Label req>Reference ID</Label>
            <CustomTextField
              fullWidth
              value={form.reference}
              onChange={(e: any) => set("reference", e.target.value.slice(0, 100))}
              error={!!errors.reference}
              helperText={errors.reference ?? (isEdit ? " " : "Created for you")}
            />
          </Grid>
          <Grid size={12}>
            <Label req>Template</Label>
            <Autocomplete
              size="small"
              options={options?.templates ?? []}
              value={template}
              onChange={(_, t) => set("template_id", t?.id ?? null)}
              getOptionLabel={(o) => `${o.name} · ${o.elements.toLocaleString("en-GB")} ${o.elements === 1 ? "element" : "elements"}`}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              getOptionKey={(o) => o.id}
              noOptionsText="No templates yet. Add one under Settings › Templates."
              renderInput={(params) => (
                <CustomTextField
                  {...params}
                  placeholder="Select template"
                  error={!!errors.template_id}
                  helperText={
                    errors.template_id ??
                    (template
                      ? isEdit
                        ? "Changing the template replaces the rooms and elements of this survey."
                        : undefined
                      : "The rooms and elements the surveyor inspects")
                  }
                />
              )}
            />
            {template && (
              <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75} mt={1}>
                {template.rooms.length ? (
                  template.rooms.map((r, i) => <Chip key={`${r}${i}`} size="small" variant="outlined" icon={<IconDoor size={14} />} label={r} />)
                ) : (
                  <Typography variant="caption" color="warning.dark">
                    This template has no rooms yet.
                  </Typography>
                )}
              </Stack>
            )}
          </Grid>
        </Grid>
      </Section>

      <Section id="svf-who" n={3} done={done.who} title="Surveyor & date" hint="Who goes to the property, and when. You can assign the surveyor later.">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Label>Surveyor</Label>
            <Autocomplete
              size="small"
              options={options?.surveyors ?? []}
              value={surveyor}
              onChange={(_, u) => set("surveyor_id", u?.id ?? null)}
              getOptionLabel={(o) => o.name}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              getOptionKey={(o) => o.id}
              noOptionsText="No surveyors. A surveyor needs the Surveys permission in the app."
              renderOption={(props, o) => {
                const { key: _key, ...rest } = props as any;
                return (
                  <Box component="li" key={o.id} {...rest}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" width="100%" spacing={1}>
                      <DriverName name={o.name} image={o.image} />
                      <Typography variant="caption" color="textSecondary" noWrap>
                        {o.open_surveys ? `${o.open_surveys} open` : ""}
                      </Typography>
                    </Stack>
                  </Box>
                );
              }}
              renderInput={(params) => (
                <CustomTextField
                  {...params}
                  slotProps={{
                    ...(params as any).slotProps,
                    input: {
                      ...params.InputProps,
                      startAdornment: surveyor ? (
                        <Avatar src={surveyor.image ?? undefined} sx={{ width: 24, height: 24, fontSize: 11, ml: 0.5 }}>
                          {initials(surveyor.name)}
                        </Avatar>
                      ) : undefined,
                    },
                  }}
                  placeholder="Not assigned yet"
                  helperText={surveyor ? `The survey appears in ${surveyor.name}'s app` : "Empty = saved as a draft"}
                />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Label req>Survey date</Label>
            <CustomTextField
              type="date"
              fullWidth
              value={form.survey_date}
              onChange={(e: any) => set("survey_date", e.target.value)}
              error={!!errors.survey_date}
              helperText={errors.survey_date ?? " "}
            />
          </Grid>
          <Grid size={12}>
            <Label>Access note for the surveyor</Label>
            <CustomTextField
              fullWidth
              multiline
              minRows={2}
              value={form.notes}
              onChange={(e: any) => set("notes", e.target.value.slice(0, 2000))}
              placeholder="e.g. Key safe by the front door, call the tenant first"
              helperText="Shown at the top of the survey in the app"
            />
          </Grid>
        </Grid>
      </Section>

      <Section
        id="svf-pd"
        n={4}
        done={done.pd}
        optional
        title="Property detail"
        hint="Upload the property detail PDF, e.g. the void specification. AI reads it and you check the details on the next step."
      >
        <Stack spacing={2}>
          {!options?.ai_enabled && !pd && !pdBusy && (
            <Alert severity="info" sx={{ py: 0 }}>
              AI is not set up yet. You can still upload the PDF: it is saved with the survey and the details can be read later.
            </Alert>
          )}
          {pdBox}
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ p: 1.5, borderRadius: 2, backgroundColor: "grey.50", border: "1px solid", borderColor: "grey.200", opacity: pd ? 1 : 0.6 }}
          >
            <Switch checked={!!pd && pdShared} disabled={!pd || !!pdBusy} onChange={(e) => setPdShared(e.target.checked)} />
            <Box>
              <Typography className="f-14" fontWeight={600}>
                Share property detail with the surveyor
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {!pd
                  ? "Upload a PDF first."
                  : pdShared
                    ? "On: the surveyor can see the property details for this survey."
                    : "Off: the surveyor sees a short note instead. Admin always sees the details."}
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Section>
    </Stack>
  );

  const pdStep = (
    <Stack spacing={2}>
      <Alert severity={pdStatus === "done" ? "info" : "warning"}>
        {pdStatus === "done" ? (
          <>
            AI read these details from the PDF. They are shown <b>read only</b>. Please check them against the PDF before you continue.
            {pdShared ? " The surveyor will be able to see them." : " They are not shared with the surveyor for this survey (only Admin sees them)."}
          </>
        ) : pdStatus === "no_key" ? (
          "AI is not set up yet, so the details were not read. The PDF is still saved with the survey."
        ) : (
          "AI could not read this PDF. The PDF is still saved with the survey. You can try again."
        )}
      </Alert>
      <PdFileCard
        name={pdName}
        size={pdSize}
        url={pdUrl}
        status={pdStatus}
        details={pdDetails}
        actions={
          pdStatus !== "done" && options?.ai_enabled ? (
            <Button size="small" variant="outlined" startIcon={pdBusy ? <CircularProgress size={14} /> : <IconRefresh size={16} />} disabled={!!pdBusy} onClick={readAgain}>
              Read again
            </Button>
          ) : null
        }
      />
      {pdStatus === "done" && <PdDetails details={pdDetails} />}
    </Stack>
  );

  const pill = (key: string, label: React.ReactNode, ok: boolean, n: number | null, onClick?: () => void, current = false) => (
    <ButtonBase
      key={key}
      onClick={onClick}
      sx={{
        gap: 0.75,
        pl: 0.6,
        pr: 1.5,
        py: 0.5,
        borderRadius: 5,
        fontSize: 13,
        fontWeight: 600,
        border: "1px solid",
        borderColor: ok ? "success.main" : current ? "primary.main" : "grey.300",
        color: ok ? "success.dark" : current ? "primary.main" : "text.primary",
        backgroundColor: ok ? "success.light" : current ? "primary.light" : "background.paper",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      <Box
        component="span"
        sx={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          color: ok || current ? "#fff" : "text.secondary",
          backgroundColor: ok ? "success.main" : current ? "primary.main" : "grey.100",
        }}
      >
        {ok ? <IconCheck size={12} /> : n}
      </Box>
      {label}
    </ButtonBase>
  );

  const pills =
    step === "form"
      ? SECTIONS.map((s, i) =>
          pill(
            s.key,
            <>
              {s.label}
              {"optional" in s && s.optional && (
                <Box component="span" sx={{ fontSize: 11, fontWeight: 500, color: "text.secondary" }}>
                  optional
                </Box>
              )}
            </>,
            done[s.key],
            i + 1,
            () => goTo(s.key),
          ),
        )
      : [pill("back", "Survey details", true, 1, () => setStep("form")), pill("pd", "Check property detail", false, 2, undefined, true)];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={mobile}
      fullWidth
      maxWidth="md"
      slotProps={{ paper: { sx: { height: mobile ? "100%" : "92vh", backgroundColor: "#f9f9f9", borderRadius: mobile ? 0 : 3 } } }}
    >
      {/* header: title + progress */}
      <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2, pb: 1.5, backgroundColor: "background.paper", borderBottom: "1px solid", borderColor: "grey.200" }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          {step === "pd" && (
            <IconButton size="small" onClick={() => setStep("form")} aria-label="Back to the form">
              <IconChevronLeft size={20} />
            </IconButton>
          )}
          <Typography fontSize={19} fontWeight={700} flex={1} noWrap>
            {isEdit ? `Edit survey · ${form.reference}` : "Create survey"}
          </Typography>
          <IconButton onClick={onClose} aria-label="Close">
            <IconX size={20} />
          </IconButton>
        </Stack>
        <Stack direction="row" spacing={1} mt={1.5} sx={{ overflowX: "auto", pb: 0.25 }}>
          {pills}
        </Stack>
      </Box>

      <DialogContent ref={scrollRef} sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
        {loading ? (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <CircularProgress size={28} />
          </Box>
        ) : step === "form" ? (
          formBody
        ) : (
          pdStep
        )}
      </DialogContent>

      {serverError && (
        <Alert severity="error" sx={{ mx: 3, mb: 1 }} onClose={() => setServerError("")}>
          {serverError}
        </Alert>
      )}

      {/* footer: what it saves as + actions */}
      <Stack
        direction={{ xs: "column-reverse", sm: "row" }}
        gap={1.5}
        alignItems={{ sm: "center" }}
        justifyContent="space-between"
        sx={{ px: { xs: 2, sm: 3 }, py: 1.5, borderTop: "1px solid", borderColor: "grey.200", backgroundColor: "background.paper" }}
      >
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="body2" color="textSecondary">
            Saves as
          </Typography>
          <Chip size="small" color={STATUS_META[nextStatus].color} label={STATUS_META[nextStatus].label} />
          <Typography variant="body2" color="textSecondary">
            {surveyor ? `assigned to ${surveyor.name}` : "no surveyor yet"}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1.5} justifyContent="flex-end">
          {step === "pd" ? (
            <Button variant="outlined" color="inherit" startIcon={<IconChevronLeft size={16} />} onClick={() => setStep("form")}>
              Back
            </Button>
          ) : (
            <Button variant="outlined" color="inherit" onClick={onClose}>
              Cancel
            </Button>
          )}
          {step === "form" && pd && !pdBusy ? (
            <Button variant="contained" endIcon={<IconChevronRight size={16} />} disabled={loading || !editable} onClick={next}>
              Next: check property detail
            </Button>
          ) : (
            <Button
              variant="contained"
              disabled={saving || loading || !!pdBusy || !editable}
              onClick={save}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {isEdit ? "Save changes" : "Create survey"}
            </Button>
          )}
        </Stack>
      </Stack>
      <input ref={fileRef} type="file" accept=".pdf,application/pdf" hidden onChange={(e) => uploadPdf(e.target.files?.[0])} />
    </Dialog>
  );
};

export default SurveyForm;
