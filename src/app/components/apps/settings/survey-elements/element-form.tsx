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
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { IconArrowLeft, IconEdit, IconHistory, IconLock, IconTrash } from "@tabler/icons-react";
import ElementHistoryDialog from "./element-history";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { surveyInputAlignSx } from "@/app/components/apps/settings/survey-settings/input-align";

type FormFactor = "flat" | "volumetric" | "";
type MeasurementMode = "dimensions" | "direct" | "";

type DamageMethod = {
  id: number;
  name?: string;
  allow_count: boolean;
  allow_length: boolean;
  allow_width: boolean;
  allow_area: boolean;
};

type CatalogueDamage = {
  id: number;
  name: string;
  status?: boolean | number;
  element_id?: number | null;
  locked?: boolean;
};
type CatalogueMaterial = {
  id: number;
  name: string;
  category: string;
  status?: boolean | number;
  element_id?: number | null;
  locked?: boolean;
};
type PendingDamage = {
  key: string;
  name: string;
  allow_count: boolean;
  allow_length: boolean;
  allow_width: boolean;
  allow_area: boolean;
};
type PendingMaterial = { key: string; name: string; category: "subbase" | "topwear" };
type RenameTarget = {
  kind: "damage" | "material";
  id?: number;
  key?: string;
  name: string;
  category?: string;
};

type ElementFormState = {
  name: string;
  description: string;
  form_factor: FormFactor;
  measurement_mode: MeasurementMode;
  dimension_1_name: string;
  dimension_1_unit: string;
  dimension_2_name: string;
  dimension_2_unit: string;
  dimension_3_name: string;
  dimension_3_unit: string;
  output_name: string;
  output_unit: string;
  other_units: string;
  surface_photo_minimum: string;
  damage: DamageMethod[];
  materialIds: number[];
  publish_status: string;
};

const emptyForm: ElementFormState = {
  name: "",
  description: "",
  form_factor: "",
  measurement_mode: "",
  dimension_1_name: "",
  dimension_1_unit: "",
  dimension_2_name: "",
  dimension_2_unit: "",
  dimension_3_name: "",
  dimension_3_unit: "",
  output_name: "",
  output_unit: "",
  other_units: "",
  surface_photo_minimum: "",
  damage: [],
  materialIds: [],
  publish_status: "draft",
};

const isActive = (status?: boolean | number) => status === true || Number(status) === 1;

const errorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || fallback;

const hasMethod = (item: DamageMethod) =>
  item.allow_count || item.allow_length || item.allow_width || item.allow_area;

const sectionSx = {
  p: 2.5,
  borderRadius: 2,
  border: "1px solid",
  borderColor: "divider",
  bgcolor: "background.paper",
};

const ChoiceCard = ({
  selected,
  title,
  caption,
  onClick,
}: {
  selected: boolean;
  title: string;
  caption: string;
  onClick: () => void;
}) => (
  <Box
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") onClick();
    }}
    sx={{
      flex: "1 1 220px",
      p: 1.5,
      borderRadius: 2,
      cursor: "pointer",
      border: "1px solid",
      borderColor: selected ? "primary.main" : "divider",
      bgcolor: selected ? "#e7ecf7" : "background.paper",
    }}
  >
    <Typography fontWeight={600} color={selected ? "primary.main" : "text.primary"}>
      {title}
    </Typography>
    <Typography variant="body2" color="text.secondary" mt={0.25}>
      {caption}
    </Typography>
  </Box>
);

const SectionTitle = ({ step, title, caption }: { step: string; title: string; caption: string }) => (
  <Stack direction="row" spacing={1.5} alignItems="flex-start" mb={2}>
    <Box
      sx={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        bgcolor: "#e7ecf7",
        color: "primary.main",
        display: "grid",
        placeItems: "center",
        fontWeight: 700,
        fontSize: 13,
        flexShrink: 0,
      }}
    >
      {step}
    </Box>
    <Box>
      <Typography fontWeight={700}>{title}</Typography>
      <Typography variant="body2" color="text.secondary">
        {caption}
      </Typography>
    </Box>
  </Stack>
);

const SurveyElementForm = ({
  elementId,
  onClose,
  onSaved,
  onRestored,
}: {
  elementId: number | null;
  onClose: () => void;
  onSaved: () => void;
  onRestored?: () => void;
}) => {
  const [form, setForm] = useState<ElementFormState>(emptyForm);
  const [latestVersion, setLatestVersion] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [damageTypes, setDamageTypes] = useState<CatalogueDamage[]>([]);
  const [materials, setMaterials] = useState<CatalogueMaterial[]>([]);
  const [pendingDamage, setPendingDamage] = useState<PendingDamage[]>([]);
  const [pendingMaterials, setPendingMaterials] = useState<PendingMaterial[]>([]);
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [renameName, setRenameName] = useState("");
  const [newDamageName, setNewDamageName] = useState("");
  const [newSubbaseName, setNewSubbaseName] = useState("");
  const [newTopwearName, setNewTopwearName] = useState("");
  const [knownMaterials, setKnownMaterials] = useState<CatalogueMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadCatalogues = async () => {
    const damageUrl = elementId
      ? `survey-damage-types/get?element_id=${elementId}`
      : "survey-damage-types/get";
    const materialUrl = elementId
      ? `survey-materials/get?element_id=${elementId}`
      : "survey-materials/get";
    const [damageRes, materialRes] = await Promise.all([
      api.get(damageUrl),
      api.get(materialUrl),
    ]);
    setDamageTypes(
      (Array.isArray(damageRes.data?.info) ? damageRes.data.info : []).filter(
        (row: CatalogueDamage) => row?.id && row?.name && isActive(row.status),
      ),
    );
    setMaterials(
      (Array.isArray(materialRes.data?.info) ? materialRes.data.info : []).filter(
        (row: CatalogueMaterial) => row?.id && row?.name && isActive(row.status),
      ),
    );
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setPendingDamage([]);
      setPendingMaterials([]);
      try {
        await loadCatalogues();
        if (!elementId) {
          setLatestVersion(null);
          return;
        }
        const res = await api.get(`survey-elements/get?element_id=${elementId}`);
        const row = Array.isArray(res.data?.info) ? res.data.info[0] : null;
        if (!row) {
          toast.error("Survey element with provided ID does not exist!");
          onClose();
          return;
        }
        setForm({
          name: row.name || "",
          description: row.description || "",
          form_factor: row.form_factor === "volumetric" ? "volumetric" : row.form_factor === "flat" ? "flat" : "",
          measurement_mode:
            row.measurement_mode === "direct"
              ? "direct"
              : row.measurement_mode === "dimensions"
                ? "dimensions"
                : "",
          dimension_1_name: row.dimension_1_name || "",
          dimension_1_unit: row.dimension_1_unit || "",
          dimension_2_name: row.dimension_2_name || "",
          dimension_2_unit: row.dimension_2_unit || "",
          dimension_3_name: row.dimension_3_name || "",
          dimension_3_unit: row.dimension_3_unit || "",
          output_name: row.output_name || "",
          output_unit: row.output_unit || "",
          other_units: row.other_units || "",
          surface_photo_minimum:
            row.surface_photo_minimum === null || row.surface_photo_minimum === undefined
              ? ""
              : String(row.surface_photo_minimum),
          damage: Array.isArray(row.damage_types) ? row.damage_types : [],
          materialIds: Array.isArray(row.materials)
            ? row.materials.map((item: { id: number }) => item.id)
            : [],
          publish_status: row.publish_status || "draft",
        });
        setLatestVersion(Number(row.latest_version) > 0 ? Number(row.latest_version) : null);
        setKnownMaterials(Array.isArray(row.materials) ? row.materials : []);
      } catch (error) {
        console.error(error);
        toast.error(errorMessage(error, "Failed to load survey element"));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [elementId, refreshKey]);

  const setField = (key: keyof ElementFormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const chooseFactor = (factor: FormFactor) => {
    if (!factor) return;
    setForm((current) => {
      const next = { ...current, form_factor: factor };
      const untouched =
        !current.dimension_1_name &&
        !current.dimension_2_name &&
        !current.output_name &&
        !current.measurement_mode;
      if (!untouched) return next;
      if (factor === "flat") {
        return {
          ...next,
          measurement_mode: "dimensions",
          dimension_1_name: "Height",
          dimension_1_unit: "m",
          dimension_2_name: "Length",
          dimension_2_unit: "m",
          output_name: "Area",
          output_unit: "m²",
        };
      }
      return {
        ...next,
        measurement_mode: "dimensions",
        dimension_1_name: "Length",
        dimension_1_unit: "m",
        dimension_2_name: "Width",
        dimension_2_unit: "m",
        dimension_3_name: "Depth",
        dimension_3_unit: "m",
        output_name: "Volume",
        output_unit: "m³",
      };
    });
  };

  const damageFor = (id: number) =>
    form.damage.find((item) => item.id === id) || {
      id,
      allow_count: false,
      allow_length: false,
      allow_width: false,
      allow_area: false,
    };

  const toggleMethod = (id: number, key: keyof Omit<DamageMethod, "id">) => {
    setForm((current) => {
      const existing = current.damage.find((item) => item.id === id) || {
        id,
        allow_count: false,
        allow_length: false,
        allow_width: false,
        allow_area: false,
      };
      const nextItem = { ...existing, [key]: !existing[key] };
      const damage = hasMethod(nextItem)
        ? [...current.damage.filter((item) => item.id !== id), nextItem]
        : current.damage.filter((item) => item.id !== id);
      return { ...current, damage };
    });
  };

  const sameName = (left: string, right: string) =>
    left.trim().toLowerCase() === right.trim().toLowerCase();

  const damageNameTaken = (name: string, except?: { key?: string; id?: number }) =>
    damageTypes.some((row) => row.id !== except?.id && sameName(row.name, name)) ||
    pendingDamage.some((row) => row.key !== except?.key && sameName(row.name, name));

  const materialNameTaken = (name: string, except?: { key?: string; id?: number }) =>
    materials.some((row) => row.id !== except?.id && sameName(row.name, name)) ||
    pendingMaterials.some((row) => row.key !== except?.key && sameName(row.name, name));

  const openRename = (target: RenameTarget) => {
    setRenameTarget(target);
    setRenameName(target.name);
  };

  const saveRename = async () => {
    const name = renameName.trim();
    if (!renameTarget) return;
    if (!name) {
      toast.error("Name is a required field!");
      return;
    }
    if (renameTarget.kind === "damage" && damageNameTaken(name, renameTarget)) {
      toast.error("Provided survey damage type exists in this company!");
      return;
    }
    if (renameTarget.kind === "material" && materialNameTaken(name, renameTarget)) {
      toast.error("Provided survey material exists in this company!");
      return;
    }
    if (renameTarget.key) {
      if (renameTarget.kind === "damage") {
        setPendingDamage((current) =>
          current.map((row) => (row.key === renameTarget.key ? { ...row, name } : row)),
        );
      } else {
        setPendingMaterials((current) =>
          current.map((row) => (row.key === renameTarget.key ? { ...row, name } : row)),
        );
      }
      setRenameTarget(null);
      return;
    }
    try {
      const res =
        renameTarget.kind === "damage"
          ? await api.put("survey-damage-types/update", { id: renameTarget.id, name })
          : await api.put("survey-materials/update", {
              id: renameTarget.id,
              name,
              category: renameTarget.category,
            });
      if (!res.data?.IsSuccess) {
        toast.error(res.data?.message || "Failed to update");
        return;
      }
      setRenameTarget(null);
      await loadCatalogues();
      toast.success(res.data.message || "Updated");
    } catch (error) {
      toast.error(errorMessage(error, "Failed to update"));
    }
  };

  const deleteOwnedDamage = async (row: CatalogueDamage) => {
    try {
      const res = await api.post("survey-damage-types/delete", { id: row.id });
      if (!res.data?.IsSuccess) {
        toast.error(res.data?.message || "Failed to delete damage type");
        return;
      }
      setForm((current) => ({
        ...current,
        damage: current.damage.filter((item) => item.id !== row.id),
      }));
      await loadCatalogues();
      toast.success(res.data.message || "Damage type deleted");
    } catch (error) {
      toast.error(errorMessage(error, "Failed to delete damage type"));
    }
  };

  const deleteOwnedMaterial = async (row: CatalogueMaterial) => {
    try {
      const res = await api.post("survey-materials/delete", { id: row.id });
      if (!res.data?.IsSuccess) {
        toast.error(res.data?.message || "Failed to delete material");
        return;
      }
      setForm((current) => ({
        ...current,
        materialIds: current.materialIds.filter((id) => id !== row.id),
      }));
      setKnownMaterials((current) => current.filter((item) => item.id !== row.id));
      await loadCatalogues();
      toast.success(res.data.message || "Material deleted");
    } catch (error) {
      toast.error(errorMessage(error, "Failed to delete material"));
    }
  };

  const togglePendingMethod = (key: string, field: keyof Omit<PendingDamage, "key" | "name">) => {
    setPendingDamage((current) =>
      current.map((row) => (row.key === key ? { ...row, [field]: !row[field] } : row)),
    );
  };

  const createDamageType = async () => {
    const name = newDamageName.trim();
    if (!name) {
      toast.error("Name is a required field!");
      return;
    }
    if (damageNameTaken(name)) {
      toast.error("Provided survey damage type exists in this company!");
      return;
    }
    if (!elementId) {
      setPendingDamage((current) => [
        ...current,
        {
          key: `damage-${Date.now()}`,
          name,
          allow_count: false,
          allow_length: false,
          allow_width: false,
          allow_area: false,
        },
      ]);
      setNewDamageName("");
      return;
    }
    try {
      const res = await api.post("survey-damage-types/create", { name, element_id: elementId });
      if (!res.data?.IsSuccess) {
        toast.error(res.data?.message || "Failed to save damage type");
        return;
      }
      setNewDamageName("");
      await loadCatalogues();
      toast.success(res.data.message || "Damage type saved");
    } catch (error) {
      toast.error(errorMessage(error, "Failed to save damage type"));
    }
  };

  const createMaterial = async (category: "subbase" | "topwear", name: string, clear: () => void) => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name is a required field!");
      return;
    }
    if (materialNameTaken(trimmed)) {
      toast.error("Provided survey material exists in this company!");
      return;
    }
    if (!elementId) {
      setPendingMaterials((current) => [
        ...current,
        { key: `material-${Date.now()}`, name: trimmed, category },
      ]);
      clear();
      return;
    }
    try {
      const res = await api.post("survey-materials/create", {
        name: trimmed,
        category,
        element_id: elementId,
      });
      if (!res.data?.IsSuccess) {
        toast.error(res.data?.message || "Failed to save material");
        return;
      }
      const createdId = Number(res.data?.info?.id);
      clear();
      await loadCatalogues();
      if (createdId) {
        setForm((current) => ({
          ...current,
          materialIds: [...new Set([...current.materialIds, createdId])],
        }));
      }
      toast.success(res.data.message || "Material saved");
    } catch (error) {
      toast.error(errorMessage(error, "Failed to save material"));
    }
  };

  const materialsFor = (category: "subbase" | "topwear") =>
    materials.filter((item) => item.category === category);

  const selectedMaterials = (category: "subbase" | "topwear") =>
    materialsFor(category).filter((item) => form.materialIds.includes(item.id));

  const setCategoryMaterials = (category: "subbase" | "topwear", ids: number[]) => {
    setForm((current) => {
      const other = current.materialIds.filter(
        (id) => materials.find((item) => item.id === id)?.category !== category,
      );
      return { ...current, materialIds: [...other, ...ids] };
    });
  };

  const save = async (publish: boolean) => {
    if (!form.name.trim()) {
      toast.error("Name is a required field!");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        form_factor: form.form_factor,
        measurement_mode: form.measurement_mode,
        dimension_1_name: form.dimension_1_name.trim(),
        dimension_1_unit: form.dimension_1_unit.trim(),
        dimension_2_name: form.dimension_2_name.trim(),
        dimension_2_unit: form.dimension_2_unit.trim(),
        dimension_3_name: form.dimension_3_name.trim(),
        dimension_3_unit: form.dimension_3_unit.trim(),
        output_name: form.output_name.trim(),
        output_unit: form.output_unit.trim(),
        other_units: form.other_units.trim(),
        surface_photo_minimum: form.surface_photo_minimum,
        damage_types: form.damage.filter(hasMethod),
        material_ids: form.materialIds,
        owned_damage_types: pendingDamage.map((item) => ({
          name: item.name,
          allow_count: item.allow_count,
          allow_length: item.allow_length,
          allow_width: item.allow_width,
          allow_area: item.allow_area,
        })),
        owned_materials: pendingMaterials.map((item) => ({
          name: item.name,
          category: item.category,
        })),
        publish,
      };
      const res = elementId
        ? await api.put("survey-elements/update", { id: elementId, ...payload })
        : await api.post("survey-elements/create", payload);
      if (res.data?.IsSuccess) {
        toast.success(res.data.message || "Survey element saved");
        onSaved();
      } else {
        toast.error(res.data?.message || "Failed to save survey element");
      }
    } catch (error) {
      console.error(error);
      toast.error(errorMessage(error, "Failed to save survey element"));
    } finally {
      setSaving(false);
    }
  };

  const dimensionCount = form.form_factor === "volumetric" ? 3 : 2;
  const dimensionFields = useMemo(
    () =>
      [
        ["dimension_1_name", "dimension_1_unit", "Dimension 1"],
        ["dimension_2_name", "dimension_2_unit", "Dimension 2"],
        ["dimension_3_name", "dimension_3_unit", "Dimension 3"],
      ] as const,
    [],
  );

  return (
    <Box
      className="survey-element-form"
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        bgcolor: "#f8fafc",
        ...surveyInputAlignSx,
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "center" }}
        spacing={1.5}
        px={2}
        py={1.5}
        sx={{ bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton onClick={onClose} aria-label="Back to elements">
            <IconArrowLeft size={20} />
          </IconButton>
          <Typography fontWeight={700}>{elementId ? "Edit element" : "Create element"}</Typography>
          <Chip
            size="small"
            label={form.publish_status === "published" ? "Published" : "Draft"}
            color={form.publish_status === "published" ? "success" : "default"}
            variant={form.publish_status === "published" ? "filled" : "outlined"}
          />
          {latestVersion ? (
            <Chip size="small" label={`Version ${latestVersion}`} variant="outlined" />
          ) : null}
        </Stack>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          {elementId ? (
            <Button
              variant="outlined"
              startIcon={<IconHistory size={18} />}
              onClick={() => setHistoryOpen(true)}
            >
              History
            </Button>
          ) : null}
          <Button variant="outlined" disabled={saving || loading} onClick={() => void save(false)}>
            Save draft
          </Button>
          <Button variant="contained" disabled={saving || loading} onClick={() => void save(true)}>
            {saving ? "Saving..." : "Publish"}
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: 2 }}>
        <Stack spacing={2} sx={{ maxWidth: 1100, mx: "auto" }}>
          <Paper elevation={0} sx={sectionSx}>
            <SectionTitle
              step="1"
              title="Element details"
              caption="Name the element and choose whether it is a flat surface or a volume."
            />
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              <CustomTextField
                size="small"
                label="Element name"
                value={form.name}
                onChange={(event) => setField("name", event.target.value)}
                fullWidth
              />
              <CustomTextField
                size="small"
                label="Description (optional)"
                value={form.description}
                onChange={(event) => setField("description", event.target.value)}
                fullWidth
              />
            </Box>
            <Typography variant="body2" fontWeight={600} mt={2} mb={1}>
              Form factor
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <ChoiceCard
                selected={form.form_factor === "flat"}
                title="Flat"
                caption="Area from height and length, such as a wall or floor."
                onClick={() => chooseFactor("flat")}
              />
              <ChoiceCard
                selected={form.form_factor === "volumetric"}
                title="Volumetric"
                caption="Volume from length, width and depth, such as a cupboard."
                onClick={() => chooseFactor("volumetric")}
              />
            </Stack>
          </Paper>

          <Paper elevation={0} sx={sectionSx}>
            <SectionTitle
              step="2"
              title="Measurement, units and photos"
              caption="Choose how the surveyor measures this element and how many surface photos are required."
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} mb={2}>
              <ChoiceCard
                selected={form.measurement_mode === "dimensions"}
                title="Dimensions"
                caption="Enter each side. The result is calculated."
                onClick={() => setField("measurement_mode", "dimensions")}
              />
              <ChoiceCard
                selected={form.measurement_mode === "direct"}
                title="Direct area / volume"
                caption="Enter the finished area or volume."
                onClick={() => setField("measurement_mode", "direct")}
              />
            </Stack>

            {form.measurement_mode === "dimensions" && (
              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                  mb: 2,
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: dimensionCount === 3 ? "1fr 1fr 1fr" : "1fr 1fr",
                  },
                }}
              >
                {dimensionFields.slice(0, dimensionCount).map(([nameKey, unitKey, label]) => (
                  <Stack key={nameKey} direction="row" spacing={1}>
                    <CustomTextField
                      size="small"
                      label={label}
                      value={form[nameKey]}
                      onChange={(event) => setField(nameKey, event.target.value)}
                      fullWidth
                    />
                    <CustomTextField
                      size="small"
                      label="Unit"
                      value={form[unitKey]}
                      onChange={(event) => setField(unitKey, event.target.value)}
                      sx={{ width: 120, flexShrink: 0 }}
                    />
                  </Stack>
                ))}
              </Box>
            )}

            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: { xs: "1fr", md: "1fr 160px" },
              }}
            >
              <CustomTextField
                size="small"
                label="Output measurement"
                value={form.output_name}
                onChange={(event) => setField("output_name", event.target.value)}
                fullWidth
              />
              <CustomTextField
                size="small"
                label="Output unit"
                value={form.output_unit}
                onChange={(event) => setField("output_unit", event.target.value)}
                fullWidth
              />
              <CustomTextField
                size="small"
                label="Other units available"
                value={form.other_units}
                onChange={(event) => setField("other_units", event.target.value)}
                placeholder="cm, mm, cm²"
                fullWidth
              />
              <CustomTextField
                size="small"
                label="Surface photos minimum"
                type="number"
                value={form.surface_photo_minimum}
                onChange={(event) => setField("surface_photo_minimum", event.target.value)}
                fullWidth
              />
            </Box>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mt: 2, px: 1.5, py: 1, borderRadius: 1.5, bgcolor: "#f8fafc" }}
            >
              <IconLock size={16} />
              <Typography variant="body2">
                Each damage needs a minimum of 1 photo. This rule is locked.
              </Typography>
            </Stack>
          </Paper>

          <Paper elevation={0} sx={sectionSx}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              spacing={1.5}
              alignItems={{ md: "flex-start" }}
            >
              <SectionTitle
                step="3"
                title="Applicable damage types"
                caption="Tick the measurement methods allowed for each damage type. Damage types created here stay on this element only."
              />
              <Stack direction="row" spacing={1} sx={{ minWidth: { md: 320 } }}>
                <CustomTextField
                  size="small"
                  label="New damage type"
                  value={newDamageName}
                  onChange={(event) => setNewDamageName(event.target.value)}
                  fullWidth
                />
                <Button variant="outlined" onClick={() => void createDamageType()} sx={{ flexShrink: 0 }}>
                  Create
                </Button>
              </Stack>
            </Stack>
            {form.damage.some((item) => !damageTypes.some((type) => type.id === item.id)) && (
              <Stack direction="row" flexWrap="wrap" gap={1} mb={1.5}>
                {form.damage
                  .filter((item) => !damageTypes.some((type) => type.id === item.id))
                  .map((item) => (
                    <Chip
                      key={item.id}
                      label={`${item.name || "Damage type"} (archived)`}
                      onDelete={() =>
                        setForm((current) => ({
                          ...current,
                          damage: current.damage.filter((row) => row.id !== item.id),
                        }))
                      }
                    />
                  ))}
              </Stack>
            )}
            {damageTypes.length === 0 && pendingDamage.length === 0 ? (
              <Typography color="text.secondary">No active damage types.</Typography>
            ) : (
              <Table size="small" sx={{ tableLayout: "fixed" }}>
                <TableHead>
                  <TableRow>
                    {["Damage type", "Count", "Length", "Width", "Area", ""].map((heading, index) => (
                      <TableCell
                        key={heading || "actions"}
                        align={index === 0 ? "left" : "center"}
                        sx={{
                          width: index === 0 ? "36%" : index === 5 ? "10%" : "13.5%",
                          bgcolor: "#f8fafc",
                          fontWeight: 600,
                        }}
                      >
                        {heading}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {damageTypes.map((type) => {
                    const selected = damageFor(type.id);
                    const owned = Boolean(type.element_id);
                    return (
                      <TableRow key={type.id} hover>
                        <TableCell>
                          <Typography>{type.name}</Typography>
                          {owned ? (
                            <Typography variant="caption" color="text.secondary">
                              Only this element
                            </Typography>
                          ) : null}
                        </TableCell>
                        {(["allow_count", "allow_length", "allow_width", "allow_area"] as const).map(
                          (key) => (
                            <TableCell key={key} align="center">
                              <CustomCheckbox
                                checked={selected[key]}
                                onChange={() => toggleMethod(type.id, key)}
                              />
                            </TableCell>
                          ),
                        )}
                        <TableCell align="center">
                          {owned ? (
                            <Stack direction="row" justifyContent="center">
                              <IconButton
                                size="small"
                                aria-label="Edit damage type"
                                onClick={() =>
                                  openRename({ kind: "damage", id: type.id, name: type.name })
                                }
                              >
                                <IconEdit size={16} />
                              </IconButton>
                              {type.locked ? (
                                <Tooltip title="Used on a published version">
                                  <span>
                                    <IconButton size="small" disabled aria-label="Used on a published version">
                                      <IconLock size={16} />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              ) : (
                                <IconButton
                                  size="small"
                                  aria-label="Delete damage type"
                                  onClick={() => void deleteOwnedDamage(type)}
                                >
                                  <IconTrash size={16} />
                                </IconButton>
                              )}
                            </Stack>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {pendingDamage.map((item) => (
                    <TableRow key={item.key} hover>
                      <TableCell>
                        <Typography>{item.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Only this element
                        </Typography>
                      </TableCell>
                      {(["allow_count", "allow_length", "allow_width", "allow_area"] as const).map(
                        (key) => (
                          <TableCell key={key} align="center">
                            <CustomCheckbox
                              checked={item[key]}
                              onChange={() => togglePendingMethod(item.key, key)}
                            />
                          </TableCell>
                        ),
                      )}
                      <TableCell align="center">
                        <Stack direction="row" justifyContent="center">
                          <IconButton
                            size="small"
                            aria-label="Edit damage type"
                            onClick={() => openRename({ kind: "damage", key: item.key, name: item.name })}
                          >
                            <IconEdit size={16} />
                          </IconButton>
                          <IconButton
                            size="small"
                            aria-label="Delete damage type"
                            onClick={() =>
                              setPendingDamage((current) => current.filter((row) => row.key !== item.key))
                            }
                          >
                            <IconTrash size={16} />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>

          <Paper elevation={0} sx={sectionSx}>
            <SectionTitle
              step="4"
              title="Materials"
              caption="Choose the substrate and the visible finish the surveyor can record. Materials created here stay on this element only."
            />
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              }}
            >
              {([
                ["subbase", "Subbase / substrate", newSubbaseName, setNewSubbaseName],
                ["topwear", "Topwear / visible finish", newTopwearName, setNewTopwearName],
              ] as const).map(([category, label, draftName, setDraftName]) => (
                <Box
                  key={category}
                  sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}
                >
                  <Typography fontWeight={600} mb={1.5}>
                    {label}
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1} mb={1.5}>
                    {knownMaterials
                      .filter(
                        (item) =>
                          item.category === category &&
                          form.materialIds.includes(item.id) &&
                          !materials.some((active) => active.id === item.id),
                      )
                      .map((item) => (
                        <Chip
                          key={item.id}
                          label={`${item.name} (archived)`}
                          onDelete={() =>
                            setForm((current) => ({
                              ...current,
                              materialIds: current.materialIds.filter((id) => id !== item.id),
                            }))
                          }
                        />
                      ))}
                  </Stack>
                  <Stack spacing={0.5} mb={1.5}>
                    {materialsFor(category)
                      .filter((item) => item.element_id)
                      .map((item) => (
                        <Stack key={item.id} direction="row" alignItems="center" spacing={0.5}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography noWrap>{item.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Only this element
                            </Typography>
                          </Box>
                          <IconButton
                            size="small"
                            aria-label="Edit material"
                            onClick={() =>
                              openRename({
                                kind: "material",
                                id: item.id,
                                name: item.name,
                                category: item.category,
                              })
                            }
                          >
                            <IconEdit size={16} />
                          </IconButton>
                          {item.locked ? (
                            <Tooltip title="Used on a published version">
                              <span>
                                <IconButton size="small" disabled aria-label="Used on a published version">
                                  <IconLock size={16} />
                                </IconButton>
                              </span>
                            </Tooltip>
                          ) : (
                            <IconButton
                              size="small"
                              aria-label="Delete material"
                              onClick={() => void deleteOwnedMaterial(item)}
                            >
                              <IconTrash size={16} />
                            </IconButton>
                          )}
                        </Stack>
                      ))}
                    {pendingMaterials
                      .filter((item) => item.category === category)
                      .map((item) => (
                        <Stack key={item.key} direction="row" alignItems="center" spacing={0.5}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography noWrap>{item.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Only this element
                            </Typography>
                          </Box>
                          <IconButton
                            size="small"
                            aria-label="Edit material"
                            onClick={() =>
                              openRename({
                                kind: "material",
                                key: item.key,
                                name: item.name,
                                category: item.category,
                              })
                            }
                          >
                            <IconEdit size={16} />
                          </IconButton>
                          <IconButton
                            size="small"
                            aria-label="Delete material"
                            onClick={() =>
                              setPendingMaterials((current) =>
                                current.filter((row) => row.key !== item.key),
                              )
                            }
                          >
                            <IconTrash size={16} />
                          </IconButton>
                        </Stack>
                      ))}
                  </Stack>
                  <Autocomplete
                    multiple
                    options={materialsFor(category)}
                    value={selectedMaterials(category)}
                    getOptionLabel={(option) =>
                      option.element_id ? `${option.name} (this element)` : option.name
                    }
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    onChange={(_, value) =>
                      setCategoryMaterials(
                        category,
                        value.map((item) => item.id),
                      )
                    }
                    renderInput={(params) => (
                      <CustomTextField
                        {...params}
                        size="small"
                        placeholder={
                          materialsFor(category).length
                            ? "Select active materials"
                            : "No active materials"
                        }
                      />
                    )}
                  />
                  <Stack direction="row" spacing={1} mt={1.5}>
                    <CustomTextField
                      size="small"
                      label="New material"
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      fullWidth
                    />
                    <Button
                      variant="outlined"
                      onClick={() => void createMaterial(category, draftName, () => setDraftName(""))}
                      sx={{ flexShrink: 0 }}
                    >
                      Create
                    </Button>
                  </Stack>
                </Box>
              ))}
            </Box>
          </Paper>

          <Typography variant="body2" color="text.secondary" px={0.5}>
            Publish saves a version and makes this element available for new groups. Save draft does not create a version.
          </Typography>
        </Stack>
      </Box>
      <Dialog
        open={Boolean(renameTarget)}
        onClose={() => setRenameTarget(null)}
        fullWidth
        maxWidth="xs"
        sx={surveyInputAlignSx}
      >
        <DialogTitle>{renameTarget?.kind === "material" ? "Edit material" : "Edit damage type"}</DialogTitle>
        <DialogContent>
          <CustomTextField
            autoFocus
            size="small"
            label="Name"
            value={renameName}
            onChange={(event) => setRenameName(event.target.value)}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameTarget(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => void saveRename()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
      <ElementHistoryDialog
        open={historyOpen}
        elementId={elementId}
        elementName={form.name}
        onClose={() => setHistoryOpen(false)}
        onRestored={() => {
          setRefreshKey((current) => current + 1);
          onRestored?.();
        }}
      />
    </Box>
  );
};

export default SurveyElementForm;
