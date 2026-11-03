"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  IconArrowDown,
  IconArrowUp,
  IconCopy,
  IconEye,
  IconLayoutList,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import SurveyFormPdfPreview, { PdfPreviewSource } from "./pdf-preview";

/**
 * One field of an inspection form. Same shape the Forms module stores, so the saved JSON stays
 * compatible: sections are `Group` fields whose children live in `fields`.
 */
export type InspectionField = {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
  multipleSelection?: boolean;
  formulaExpression?: string;
  fields?: InspectionField[];
};

export type SurveyFormRecord = {
  id: number;
  name: string;
  status: boolean | number;
  fields: InspectionField[];
  field_count?: number;
  group_count?: number;
};

type SurveyFormEditorProps = {
  open: boolean;
  /** Form to edit; null creates a new one. */
  form: SurveyFormRecord | null;
  onClose: () => void;
  onSaved: () => void;
};

const FIELD_TYPES: { value: string; label: string }[] = [
  { value: "Open ended", label: "Text (single line)" },
  { value: "Text area", label: "Text area (multi-line)" },
  { value: "Number", label: "Number" },
  { value: "Yes/No", label: "Yes / No" },
  { value: "Dropdown", label: "Dropdown" },
  { value: "Date", label: "Date" },
  { value: "Formula", label: "Formula (calculated)" },
  { value: "Description", label: "Info text" },
];

const OPERATORS = [
  { value: "*", label: "×" },
  { value: "+", label: "+" },
  { value: "-", label: "−" },
  { value: "/", label: "÷" },
];

const newId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const errorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || fallback;

// Formulas are stored as "<fieldId> <op> <fieldId>".
const parseFormula = (expression?: string) => {
  const match = /^\s*(\S+)\s*([*+\-/])\s*(\S+)\s*$/.exec(expression || "");
  return match ? { left: match[1], operator: match[2], right: match[3] } : null;
};

// Sections are top-level groups. Loose top-level fields (from forms built elsewhere) go into a
// leading "General" section so every field belongs to one.
const toSections = (fields: unknown): InspectionField[] => {
  const list = Array.isArray(fields) ? (fields as InspectionField[]) : [];
  const sections = list
    .filter((f) => f?.type === "Group")
    .map((g) => ({ ...g, label: g.label || "", fields: g.fields || [] }));
  const loose = list.filter((f) => f && f.type !== "Group");
  return loose.length
    ? [{ id: newId("grp"), label: "General", type: "Group", fields: loose }, ...sections]
    : sections;
};

const move = <T,>(items: T[], index: number, delta: number) => {
  const target = index + delta;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

// Inspection form builder: sections on the left, the selected section's fields on the right.
const SurveyFormEditor = ({ open, form, onClose, onSaved }: SurveyFormEditorProps) => {
  const [name, setName] = useState("");
  const [sections, setSections] = useState<InspectionField[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [deleteSectionId, setDeleteSectionId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PdfPreviewSource | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const loaded = toSections(form?.fields);
    setName(form?.name || "");
    setSections(loaded);
    setActiveSectionId(loaded[0]?.id ?? null);
  }, [open, form]);

  const activeSection = sections.find((s) => s.id === activeSectionId) || null;

  // Number and formula fields anywhere in the form can feed a formula.
  const numericFields = useMemo(
    () =>
      sections.flatMap((section) =>
        (section.fields || [])
          .filter((f) => f.type === "Number" || f.type === "Formula")
          .map((f) => ({ id: f.id, label: `${f.label || "Untitled"} (${section.label || "Section"})` })),
      ),
    [sections],
  );

  const updateSection = (sectionId: string, patch: Partial<InspectionField>) =>
    setSections((current) => current.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)));

  const updateFields = (sectionId: string, update: (fields: InspectionField[]) => InspectionField[]) =>
    setSections((current) =>
      current.map((s) => (s.id === sectionId ? { ...s, fields: update(s.fields || []) } : s)),
    );

  const updateField = (sectionId: string, fieldId: string, patch: Partial<InspectionField>) =>
    updateFields(sectionId, (fields) => fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)));

  const addSection = () => {
    const section: InspectionField = { id: newId("grp"), label: "", type: "Group", fields: [] };
    setSections((current) => [...current, section]);
    setActiveSectionId(section.id);
  };

  const removeSection = (sectionId: string) => {
    const index = sections.findIndex((s) => s.id === sectionId);
    const remaining = sections.filter((s) => s.id !== sectionId);
    setSections(remaining);
    if (activeSectionId === sectionId) {
      setActiveSectionId(remaining[Math.max(0, index - 1)]?.id ?? null);
    }
    setDeleteSectionId(null);
  };

  const addField = (sectionId: string) =>
    updateFields(sectionId, (fields) => [
      ...fields,
      { id: newId("fld"), label: "", type: "Open ended", required: false },
    ]);

  const changeFieldType = (sectionId: string, field: InspectionField, type: string) => {
    const patch: Partial<InspectionField> = { type };
    if (type === "Dropdown") {
      patch.options = field.type === "Dropdown" ? field.options : [];
      patch.multipleSelection = Boolean(field.multipleSelection);
    } else if (type === "Yes/No") {
      patch.options = ["Yes", "No"];
      patch.multipleSelection = undefined;
    } else {
      patch.options = undefined;
      patch.multipleSelection = undefined;
    }
    if (type !== "Formula") patch.formulaExpression = undefined;
    if (type === "Description" || type === "Formula") patch.required = false;
    updateField(sectionId, field.id, patch);
  };

  const duplicateField = (sectionId: string, field: InspectionField) =>
    updateFields(sectionId, (fields) => {
      const index = fields.findIndex((f) => f.id === field.id);
      const copy = { ...field, id: newId("fld"), label: field.label ? `${field.label} (copy)` : "" };
      return [...fields.slice(0, index + 1), copy, ...fields.slice(index + 1)];
    });

  const validate = (): string | null => {
    if (!name.trim()) return "Please enter the form name.";
    if (!sections.length) return "Add at least one section.";
    const ids = new Set(sections.flatMap((s) => (s.fields || []).map((f) => f.id)));
    for (const section of sections) {
      if (!section.label.trim()) return "Every section needs a name.";
      const title = section.label.trim();
      if (!(section.fields || []).length) return `Section "${title}" has no fields.`;
      for (const field of section.fields || []) {
        if (!field.label.trim()) {
          return field.type === "Description"
            ? `Info text in "${title}" is empty.`
            : `A field in "${title}" has no name.`;
        }
        if (field.type === "Dropdown" && !(field.options || []).some((o) => o.trim())) {
          return `Dropdown "${field.label}" needs at least one option.`;
        }
        if (field.type === "Formula") {
          const formula = parseFormula(field.formulaExpression);
          if (!formula || !ids.has(formula.left) || !ids.has(formula.right)) {
            return `Formula "${field.label}" needs two fields to calculate from.`;
          }
        }
      }
    }
    return null;
  };

  const save = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    setSaving(true);
    try {
      const fields = sections.map((section) => ({
        ...section,
        label: section.label.trim(),
        fields: (section.fields || []).map((field) => ({
          ...field,
          label: field.label.trim(),
          ...(field.type === "Dropdown"
            ? { options: (field.options || []).map((o) => o.trim()).filter(Boolean) }
            : {}),
        })),
      }));
      const payload = { name: name.trim(), fields };
      const res = form?.id
        ? await api.put("survey-forms/update", { id: form.id, ...payload })
        : await api.post("survey-forms/create", payload);
      if (res.data?.IsSuccess) {
        toast.success(res.data.message || "Inspection form saved");
        onSaved();
      } else {
        toast.error(res.data?.message || "Failed to save inspection form");
      }
    } catch (err) {
      console.error(err);
      toast.error(errorMessage(err, "Failed to save inspection form"));
    } finally {
      setSaving(false);
    }
  };

  const renderTypeSettings = (sectionId: string, field: InspectionField) => {
    if (field.type === "Dropdown") {
      return (
        <Stack spacing={1}>
          <Autocomplete
            multiple
            freeSolo
            options={[] as string[]}
            value={field.options || []}
            onChange={(_, value) =>
              updateField(sectionId, field.id, {
                options: (value as string[]).map((v) => v.trim()).filter(Boolean),
              })
            }
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip {...getTagProps({ index })} key={`${option}-${index}`} label={option} size="small" />
              ))
            }
            renderInput={(params) => (
              <TextField {...params} size="small" label="Options" placeholder="Type an option and press Enter" />
            )}
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={Boolean(field.multipleSelection)}
                onChange={(event) =>
                  updateField(sectionId, field.id, { multipleSelection: event.target.checked })
                }
              />
            }
            label={<Typography fontSize={13}>Allow multiple answers</Typography>}
          />
        </Stack>
      );
    }

    if (field.type === "Formula") {
      const formula = parseFormula(field.formulaExpression) || { left: "", operator: "*", right: "" };
      const options = numericFields.filter((f) => f.id !== field.id);
      const setFormula = (patch: Partial<typeof formula>) => {
        const next = { ...formula, ...patch };
        updateField(sectionId, field.id, {
          formulaExpression: next.left && next.right ? `${next.left} ${next.operator} ${next.right}` : "",
        });
      };
      const operandSelect = (value: string, onChange: (id: string) => void) => (
        <TextField
          select
          size="small"
          label="Field"
          value={options.some((o) => o.id === value) ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          sx={{ flex: 1, minWidth: 180 }}
        >
          {options.map((o) => (
            <MenuItem key={o.id} value={o.id}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      );
      return options.length ? (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
          {operandSelect(formula.left, (id) => setFormula({ left: id }))}
          <TextField
            select
            size="small"
            value={formula.operator}
            onChange={(event) => setFormula({ operator: event.target.value })}
            sx={{ width: 80 }}
          >
            {OPERATORS.map((op) => (
              <MenuItem key={op.value} value={op.value}>
                {op.label}
              </MenuItem>
            ))}
          </TextField>
          {operandSelect(formula.right, (id) => setFormula({ right: id }))}
        </Stack>
      ) : (
        <Typography fontSize={12} color="text.secondary">
          Add Number fields first, then pick two of them to calculate this value.
        </Typography>
      );
    }

    if (field.type === "Yes/No") {
      return (
        <Typography fontSize={12} color="text.secondary">
          Answer options: Yes / No
        </Typography>
      );
    }
    return null;
  };

  const renderField = (sectionId: string, field: InspectionField, index: number, total: number) => {
    const isInfo = field.type === "Description";
    const settings = renderTypeSettings(sectionId, field);
    return (
      <Paper key={field.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "flex-start" }}>
          <Typography fontSize={12} fontWeight={700} color="text.secondary" sx={{ minWidth: 24, pt: { md: 1.25 } }}>
            {index + 1}.
          </Typography>
          <TextField
            size="small"
            fullWidth
            multiline={isInfo}
            minRows={isInfo ? 2 : undefined}
            label={isInfo ? "Info text" : "Field name"}
            placeholder={isInfo ? "Text shown to the inspector" : "e.g. Meter Reading"}
            value={field.label}
            onChange={(event) => updateField(sectionId, field.id, { label: event.target.value })}
            sx={{ flex: 1 }}
          />
          <TextField
            select
            size="small"
            label="Type"
            value={field.type}
            onChange={(event) => changeFieldType(sectionId, field, event.target.value)}
            sx={{ width: { xs: "100%", md: 200 } }}
          >
            {FIELD_TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction="row" alignItems="center" spacing={0.25}>
            {!isInfo && field.type !== "Formula" && (
              <FormControlLabel
                sx={{ mr: 0.5 }}
                control={
                  <Switch
                    size="small"
                    checked={Boolean(field.required)}
                    onChange={(event) => updateField(sectionId, field.id, { required: event.target.checked })}
                  />
                }
                label={<Typography fontSize={13}>Required</Typography>}
              />
            )}
            <Tooltip title="Move up">
              <span>
                <IconButton
                  size="small"
                  disabled={index === 0}
                  onClick={() => updateFields(sectionId, (fields) => move(fields, index, -1))}
                >
                  <IconArrowUp size={16} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Move down">
              <span>
                <IconButton
                  size="small"
                  disabled={index === total - 1}
                  onClick={() => updateFields(sectionId, (fields) => move(fields, index, 1))}
                >
                  <IconArrowDown size={16} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Duplicate">
              <IconButton size="small" onClick={() => duplicateField(sectionId, field)}>
                <IconCopy size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete field">
              <IconButton
                size="small"
                color="error"
                onClick={() => updateFields(sectionId, (fields) => fields.filter((f) => f.id !== field.id))}
              >
                <IconTrash size={16} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
        {settings && <Box sx={{ mt: 1.5, pl: { md: 4.5 } }}>{settings}</Box>}
      </Paper>
    );
  };

  const sectionToDelete = sections.find((s) => s.id === deleteSectionId);

  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      fullScreen
      PaperProps={{ sx: { display: "flex", flexDirection: "column", bgcolor: "#f8fafc" } }}
    >
      {/* Header */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ sm: "center" }}
        spacing={2}
        px={{ xs: 2, sm: 3 }}
        py={1.5}
        sx={{ flexShrink: 0, borderBottom: "1px solid", borderColor: "divider", bgcolor: "#fff" }}
      >
        <Typography fontWeight={700} fontSize={17} sx={{ whiteSpace: "nowrap" }}>
          {form?.id ? "Edit inspection form" : "Add inspection form"}
        </Typography>
        <TextField
          size="small"
          label="Form name"
          placeholder="e.g. Void Repairs Specification"
          value={name}
          onChange={(event) => setName(event.target.value)}
          sx={{ flex: 1, maxWidth: { sm: 480 } }}
        />
        <Box sx={{ flex: 1, display: { xs: "none", sm: "block" } }} />
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title={sections.length ? "See how this form will look as a PDF" : "Add a section first"}>
            <span>
              <Button
                variant="outlined"
                startIcon={<IconEye size={18} />}
                disabled={!sections.length || saving}
                onClick={() => setPreview({ name: name.trim(), fields: sections })}
              >
                Preview
              </Button>
            </span>
          </Tooltip>
          <Button variant="outlined" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
          <IconButton onClick={onClose} disabled={saving} aria-label="Close" size="small">
            <IconX size={20} />
          </IconButton>
        </Stack>
      </Stack>

      {/* Body */}
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: { xs: "column", md: "row" } }}>
        <Box
          sx={{
            width: { xs: "auto", md: 300 },
            flexShrink: 0,
            borderRight: { md: "1px solid" },
            borderBottom: { xs: "1px solid", md: "none" },
            borderColor: "divider",
            bgcolor: "#fff",
            display: "flex",
            flexDirection: "column",
            maxHeight: { xs: 220, md: "none" },
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" px={2} py={1.5}>
            <Typography fontSize={12} fontWeight={700} color="text.secondary" sx={{ textTransform: "uppercase" }}>
              Sections ({sections.length})
            </Typography>
            <Button size="small" startIcon={<IconPlus size={16} />} onClick={addSection}>
              Add section
            </Button>
          </Stack>
          <Divider />
          <Box sx={{ flex: 1, overflowY: "auto", p: 1 }}>
            {sections.length === 0 && (
              <Typography fontSize={13} color="text.secondary" textAlign="center" py={4} px={2}>
                Start by adding a section, e.g. &quot;Property details&quot; or &quot;Gas&quot;.
              </Typography>
            )}
            {sections.map((section, index) => {
              const active = section.id === activeSectionId;
              const count = (section.fields || []).length;
              return (
                <Stack
                  key={section.id}
                  direction="row"
                  alignItems="center"
                  spacing={0.5}
                  onClick={() => setActiveSectionId(section.id)}
                  sx={{
                    px: 1.25,
                    py: 1,
                    mb: 0.5,
                    borderRadius: 1.5,
                    cursor: "pointer",
                    bgcolor: active ? "#eaf5ff" : "transparent",
                    "&:hover": { bgcolor: active ? "#eaf5ff" : "#f6f7f7" },
                  }}
                >
                  <IconLayoutList size={16} color={active ? "#1e5fcb" : "#7D92A9"} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontSize={14} fontWeight={active ? 600 : 500} noWrap>
                      {section.label || "Untitled section"}
                    </Typography>
                    <Typography fontSize={12} color="text.secondary">
                      {count} {count === 1 ? "field" : "fields"}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    disabled={index === 0}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSections((current) => move(current, index, -1));
                    }}
                  >
                    <IconArrowUp size={14} />
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={index === sections.length - 1}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSections((current) => move(current, index, 1));
                    }}
                  >
                    <IconArrowDown size={14} />
                  </IconButton>
                </Stack>
              );
            })}
          </Box>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, overflowY: "auto", p: { xs: 2, sm: 3 } }}>
          {activeSection ? (
            <Box sx={{ maxWidth: 1100, mx: "auto" }}>
              <Stack direction="row" spacing={1.5} alignItems="center" mb={2.5}>
                <TextField
                  size="small"
                  label="Section name"
                  placeholder="e.g. Gas"
                  value={activeSection.label}
                  onChange={(event) => updateSection(activeSection.id, { label: event.target.value })}
                  sx={{ flex: 1, bgcolor: "#fff" }}
                />
                <Button
                  color="error"
                  variant="outlined"
                  startIcon={<IconTrash size={16} />}
                  onClick={() =>
                    (activeSection.fields || []).length
                      ? setDeleteSectionId(activeSection.id)
                      : removeSection(activeSection.id)
                  }
                >
                  Delete section
                </Button>
              </Stack>

              <Stack spacing={1.5}>
                {(activeSection.fields || []).map((field, index, all) =>
                  renderField(activeSection.id, field, index, all.length),
                )}
                {(activeSection.fields || []).length === 0 && (
                  <Typography fontSize={13} color="text.secondary" textAlign="center" py={3}>
                    No fields in this section yet.
                  </Typography>
                )}
                <Button
                  variant="outlined"
                  startIcon={<IconPlus size={16} />}
                  onClick={() => addField(activeSection.id)}
                  sx={{ alignSelf: "flex-start", bgcolor: "#fff" }}
                >
                  Add field
                </Button>
              </Stack>
            </Box>
          ) : (
            <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }} spacing={1.5}>
              <Typography color="text.secondary">No section selected.</Typography>
              <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={addSection}>
                Add section
              </Button>
            </Stack>
          )}
        </Box>
      </Box>

      <SurveyFormPdfPreview form={preview} onClose={() => setPreview(null)} />

      <Dialog open={Boolean(sectionToDelete)} onClose={() => setDeleteSectionId(null)}>
        <DialogTitle>Delete section?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            &quot;{sectionToDelete?.label || "Untitled section"}&quot; and its{" "}
            {(sectionToDelete?.fields || []).length} field(s) will be removed from this form.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setDeleteSectionId(null)}>
            Cancel
          </Button>
          <Button color="error" variant="outlined" onClick={() => sectionToDelete && removeSection(sectionToDelete.id)}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default SurveyFormEditor;
