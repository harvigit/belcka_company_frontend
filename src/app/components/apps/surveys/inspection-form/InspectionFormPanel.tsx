"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  LinearProgress,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  IconChevronDown,
  IconChevronRight,
  IconCircleCheckFilled,
  IconClipboardList,
  IconDeviceFloppy,
  IconDownload,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import { InspectionFormData, InspectionFormField } from "./useInspectionForm";

type Props = {
  data: InspectionFormData;
  saving?: boolean;
  /** Read-only view (survey details); the form is also read-only when the API says it is not editable. */
  readOnly?: boolean;
  onSave?: (answers: Record<string, unknown>) => Promise<boolean>;
  /** Open section, when the page controls it (e.g. from a section list). undefined = not chosen yet. */
  openSection?: string | null;
  onOpenSection?: (id: string | null) => void;
  /** Live required counts per section, for a section list outside the panel. */
  onSectionStats?: (stats: FormSectionStat[]) => void;
  /** Scroll the sections inside the panel (desktop), so the header with Save stays in view. */
  scrollBody?: boolean;
};

export type FormSectionStat = { id: string; label: string; required: number; done: number };

const NOT_ANSWERABLE = new Set(["Group", "Description", "Formula"]);

const isBlank = (value: unknown) =>
  value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);

const isWide = (field: InspectionFormField) =>
  field.type === "Text area" ||
  field.type === "Description" ||
  (field.type === "Dropdown" && (field.options?.length || 0) > (field.multipleSelection ? 4 : 6));

const flatten = (fields: InspectionFormField[]): InspectionFormField[] =>
  (fields || []).flatMap((field) => [field, ...flatten(field.fields || [])]);

// Same rule as the API: Number/Formula ids in the expression are replaced by their values.
function calculateFormulas(fields: InspectionFormField[], values: Record<string, unknown>) {
  const all = flatten(fields);
  const ids = all
    .filter((f) => f.type === "Number" || f.type === "Formula")
    .map((f) => f.id)
    .sort((a, b) => b.length - a.length);
  const result: Record<string, number> = {};
  for (const field of all.filter((f) => f.type === "Formula" && f.formulaExpression)) {
    let expression = String(field.formulaExpression);
    const used = ids.filter((id) => expression.includes(id));
    if (used.every((id) => isBlank(values[id]))) continue;
    for (const id of used) {
      const num = Number(values[id] ?? 0);
      expression = expression.split(id).join(String(Number.isFinite(num) ? num : 0));
    }
    if (!/^[\d+\-*/().\s]+$/.test(expression)) continue;
    try {
      const value = Function(`"use strict"; return (${expression});`)();
      if (Number.isFinite(value)) result[field.id] = Math.round(value * 100) / 100;
    } catch {
      // Leave it empty.
    }
  }
  return result;
}

// Top-level groups are the sections; fields outside any group form a "General" section first.
export function formSections(fields: InspectionFormField[]): InspectionFormField[] {
  const loose = (fields || []).filter((f) => f.type !== "Group");
  return [
    ...(loose.length ? [{ id: "__general", label: "General", type: "Group", fields: loose }] : []),
    ...(fields || []).filter((f) => f.type === "Group"),
  ];
}

// Required fields per section, sub-sections included.
export function formSectionStats(
  fields: InspectionFormField[],
  values: Record<string, unknown>,
): FormSectionStat[] {
  return formSections(fields).map((section) => {
    const required = flatten(section.fields || []).filter((f) => f.required && !NOT_ANSWERABLE.has(f.type));
    return {
      id: section.id,
      label: section.label || "Section",
      required: required.length,
      done: required.filter((f) => !isBlank(values[f.id])).length,
    };
  });
}

// The page layout clips overflow, so CSS sticky does not work there; the panel scrolls its own
// sections instead and keeps the header (progress, PDF, Save) in view.
const SCROLL_BODY_SX = { maxHeight: { md: "calc(100vh - 320px)" }, overflowY: { md: "auto" }, pr: { md: 0.5 } };

const SOURCE_LABEL: Record<string, string> = {
  "survey.address": "From survey address",
  "survey.postcode": "From survey address",
  "survey.date": "From survey date",
  "survey.notes": "From survey notes",
  "survey.damp": "Damp recorded in inspection",
};

// Property detail of a survey: sections of fields filled in on site (or shown read-only).
export default function InspectionFormPanel({
  data,
  saving = false,
  readOnly = false,
  onSave,
  openSection,
  onOpenSection,
  onSectionStats,
  scrollBody = false,
}: Props) {
  const fields = data.form?.fields || [];
  const editable = !readOnly && data.editable && Boolean(onSave);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [dirty, setDirty] = useState(false);
  const [showMissing, setShowMissing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setValues({ ...data.prefill, ...data.answers });
    setDirty(false);
  }, [data]);

  const formulas = useMemo(() => calculateFormulas(fields, values), [fields, values]);

  const sections = useMemo(() => formSections(fields), [fields]);
  const stats = useMemo(() => formSectionStats(fields, values), [fields, values]);

  // One section open at a time; the page may control which (left-hand section list).
  const [ownSection, setOwnSection] = useState<string | null | undefined>(undefined);
  const currentSection = onOpenSection ? openSection : ownSection;
  const setSection = onOpenSection ?? setOwnSection;
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const previousSection = useRef<string | null | undefined | "__mount">("__mount");

  useEffect(() => {
    onSectionStats?.(stats);
  }, [stats, onSectionStats]);

  // Start on the first section that still has required fields to fill in.
  useEffect(() => {
    if (currentSection !== undefined || !stats.length) return;
    setSection((stats.find((stat) => stat.done < stat.required) ?? stats[0]).id);
  }, [currentSection, stats, setSection]);

  // Bring a section into view when it is opened, but not for the automatic first choice.
  useEffect(() => {
    const previous = previousSection.current;
    previousSection.current = currentSection;
    if (!currentSection || previous === undefined) return;
    const node = sectionRefs.current[currentSection];
    if (node) requestAnimationFrame(() => node.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [currentSection]);

  const answerable = useMemo(() => flatten(fields).filter((f) => !NOT_ANSWERABLE.has(f.type)), [fields]);
  const required = answerable.filter((f) => f.required);
  const missingIds = new Set(required.filter((f) => isBlank(values[f.id])).map((f) => f.id));
  const answeredRequired = required.length - missingIds.size;
  const percent = required.length ? Math.round((answeredRequired / required.length) * 100) : 100;

  const setValue = (id: string, value: unknown) => {
    setValues((current) => ({ ...current, [id]: value }));
    setDirty(true);
  };

  const save = async () => {
    if (!onSave) return;
    // Every field the surveyor sees is sent, so prefilled values are kept as answers.
    const answers: Record<string, unknown> = {};
    for (const field of answerable) answers[field.id] = isBlank(values[field.id]) ? null : values[field.id];
    setShowMissing(true);
    if (await onSave(answers)) setDirty(false);
    // Take the surveyor to the first section that still has required fields to fill in.
    const firstMissing = stats.find((stat) => stat.done < stat.required);
    if (firstMissing) setSection(firstMissing.id);
  };

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`surveys/${data.survey_id}/form-pdf`, { responseType: "blob", skipToast: true } as any);
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${(data.form?.name || "Inspection_Form").replace(/[^A-Za-z0-9 _-]+/g, "").trim().replace(/\s+/g, "_")}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      toast.error("Couldn't generate the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const renderInput = (field: InspectionFormField) => {
    const value = values[field.id];
    const disabled = !editable;
    const error = showMissing && missingIds.has(field.id);
    const options = field.type === "Yes/No" && !field.options?.length ? ["Yes", "No"] : field.options || [];

    switch (field.type) {
      case "Description":
        return (
          <Alert severity="warning" icon={false} sx={{ fontStyle: "italic" }}>
            {field.label}
          </Alert>
        );
      case "Formula":
        return (
          <TextField
            size="small"
            fullWidth
            value={formulas[field.id] ?? ""}
            placeholder="Calculated"
            InputProps={{ readOnly: true }}
            helperText="Calculated automatically"
          />
        );
      case "Number":
        return (
          <TextField
            size="small"
            type="number"
            fullWidth
            disabled={disabled}
            error={error}
            value={value ?? ""}
            onChange={(e) => setValue(field.id, e.target.value === "" ? null : e.target.value)}
          />
        );
      case "Date":
        return (
          <TextField
            size="small"
            type="date"
            fullWidth
            disabled={disabled}
            error={error}
            value={value ?? ""}
            onChange={(e) => setValue(field.id, e.target.value || null)}
            InputLabelProps={{ shrink: true }}
          />
        );
      case "Text area":
        return (
          <TextField
            size="small"
            fullWidth
            multiline
            minRows={3}
            disabled={disabled}
            error={error}
            value={value ?? ""}
            onChange={(e) => setValue(field.id, e.target.value)}
          />
        );
      case "Yes/No":
      case "Dropdown":
        if (field.type === "Dropdown" && field.multipleSelection) {
          const selected = Array.isArray(value) ? (value as string[]) : [];
          return (
            <FormGroup row>
              {options.map((option) => (
                <FormControlLabel
                  key={option}
                  disabled={disabled}
                  control={
                    <Checkbox
                      size="small"
                      checked={selected.includes(option)}
                      onChange={(e) =>
                        setValue(
                          field.id,
                          e.target.checked ? [...selected, option] : selected.filter((o) => o !== option),
                        )
                      }
                    />
                  }
                  label={<Typography fontSize={14}>{option}</Typography>}
                />
              ))}
            </FormGroup>
          );
        }
        if (options.length > 6) {
          return (
            <TextField
              select
              size="small"
              fullWidth
              disabled={disabled}
              error={error}
              value={value ?? ""}
              onChange={(e) => setValue(field.id, e.target.value || null)}
            >
              <MenuItem value="">
                <em>Select…</em>
              </MenuItem>
              {options.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          );
        }
        return (
          <RadioGroup row value={value ?? ""} onChange={(e) => setValue(field.id, e.target.value)}>
            {options.map((option) => (
              <FormControlLabel
                key={option}
                value={option}
                disabled={disabled}
                control={<Radio size="small" />}
                label={<Typography fontSize={14}>{option}</Typography>}
              />
            ))}
          </RadioGroup>
        );
      default:
        return (
          <TextField
            size="small"
            fullWidth
            disabled={disabled}
            error={error}
            value={value ?? ""}
            onChange={(e) => setValue(field.id, e.target.value)}
          />
        );
    }
  };

  const renderField = (field: InspectionFormField) => {
    if (field.type === "Description") {
      return (
        <Box key={field.id} sx={{ gridColumn: "1 / -1" }}>
          {renderInput(field)}
        </Box>
      );
    }
    const fromSurvey =
      field.source && !isBlank(data.prefill[field.id]) && values[field.id] === data.prefill[field.id];
    const missing = showMissing && missingIds.has(field.id);
    return (
      <Box key={field.id} sx={{ gridColumn: isWide(field) ? "1 / -1" : undefined }}>
        <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
          <Typography fontSize={13.5} fontWeight={600}>
            {field.label}
            {field.required && field.type !== "Formula" ? (
              <Box component="span" color="error.main">
                {" "}*
              </Box>
            ) : null}
          </Typography>
          {fromSurvey && <Chip size="small" label={SOURCE_LABEL[field.source!] || "From survey"} color="info" variant="outlined" />}
        </Stack>
        {renderInput(field)}
        {missing && <FormHelperText error>This field is required.</FormHelperText>}
      </Box>
    );
  };

  if (!data.form) {
    return (
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, textAlign: "center" }}>
        <Typography color="text.secondary">This survey has no property detail.</Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
            <IconClipboardList size={22} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" fontWeight={700} noWrap>
                {data.form.name}
              </Typography>
              <Typography fontSize={13} color="text.secondary">
                {editable
                  ? "Fill in the form for this property. Fields marked * are needed to submit the survey."
                  : "Property detail answers (read-only)."}
              </Typography>
            </Box>
          </Stack>
          <Box sx={{ minWidth: 200 }}>
            <Stack direction="row" justifyContent="space-between">
              <Typography fontSize={12.5} color="text.secondary">
                Required fields
              </Typography>
              <Typography fontSize={12.5} fontWeight={700}>
                {answeredRequired} / {required.length}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={percent}
              color={percent === 100 ? "success" : "primary"}
              sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
            />
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={downloading ? <CircularProgress size={16} /> : <IconDownload size={18} />}
              onClick={() => void downloadPdf()}
              disabled={downloading || dirty}
              title={dirty ? "Save your changes first" : undefined}
            >
              PDF
            </Button>
            {editable && (
              <Button
                variant="contained"
                startIcon={<IconDeviceFloppy size={18} />}
                onClick={() => void save()}
                disabled={saving || !dirty}
              >
                {saving ? "Saving..." : "Save form"}
              </Button>
            )}
          </Stack>
        </Stack>
        {editable && dirty && (
          <Alert severity="info" sx={{ mt: 1.5, py: 0 }}>
            You have unsaved changes.
          </Alert>
        )}
        {showMissing && missingIds.size > 0 && (
          <Alert severity="warning" sx={{ mt: 1.5 }}>
            {missingIds.size} required field(s) still to fill in before the survey can be submitted.
          </Alert>
        )}
      </Paper>

      <Stack spacing={1.5} sx={scrollBody ? SCROLL_BODY_SX : undefined}>
        {sections.map((section, index) => {
          const sectionFields = section.fields || [];
          const stat = stats[index];
          const complete = stat.required > 0 && stat.done === stat.required;
          const open = currentSection === section.id;
          const next = sections[index + 1];
          return (
            <Paper
              key={section.id}
              ref={(node: HTMLDivElement | null) => {
                sectionRefs.current[section.id] = node;
              }}
              variant="outlined"
              sx={{
                borderRadius: 2,
                overflow: "hidden",
                flex: "none",
                borderColor: open ? "primary.main" : "divider",
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                px={2}
                py={1.25}
                onClick={() => setSection(open ? null : section.id)}
                sx={{
                  cursor: "pointer",
                  bgcolor: open ? "primary.light" : "grey.50",
                  borderBottom: open ? "1px solid" : "none",
                  borderColor: "divider",
                  "&:hover": { bgcolor: open ? "primary.light" : "grey.100" },
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                  {open ? <IconChevronDown size={18} /> : <IconChevronRight size={18} />}
                  <Typography fontWeight={700} color={open ? "primary.main" : "text.primary"} noWrap>
                    {section.label}
                  </Typography>
                  {complete && <IconCircleCheckFilled size={18} color="#13DEB9" />}
                </Stack>
                {stat.required > 0 && (
                  <Typography
                    fontSize={12.5}
                    fontWeight={700}
                    color={complete ? "success.main" : "text.secondary"}
                    sx={{ flex: "none", ml: 1 }}
                  >
                    {stat.done}/{stat.required} required
                  </Typography>
                )}
              </Stack>
              {open && (
                <>
                  <Box
                    sx={{
                      p: 2,
                      display: "grid",
                      gap: 2,
                      gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                    }}
                  >
                    {sectionFields.map((field) =>
                      field.type === "Group" ? (
                        <Box key={field.id} sx={{ gridColumn: "1 / -1" }}>
                          <Typography fontWeight={700} mb={1}>
                            {field.label}
                          </Typography>
                          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
                            {(field.fields || []).map(renderField)}
                          </Box>
                        </Box>
                      ) : (
                        renderField(field)
                      ),
                    )}
                  </Box>
                  {next && (
                    <Stack direction="row" justifyContent="flex-end" px={2} pb={2}>
                      <Button size="small" endIcon={<IconChevronRight size={16} />} onClick={() => setSection(next.id)}>
                        Next: {next.label}
                      </Button>
                    </Stack>
                  )}
                </>
              )}
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}
