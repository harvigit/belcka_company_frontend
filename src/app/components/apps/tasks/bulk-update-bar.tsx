"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { IconDeviceFloppy, IconX } from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";

const SHIFT_OPTIONS = [
  { id: "daywork", name: "Daywork" },
  { id: "pricework", name: "Pricework" },
  { id: "both", name: "Both" },
];
const STATUS_OPTIONS = [
  { id: true, name: "Active" },
  { id: false, name: "Inactive" },
];
const ALL_PROJECTS = { id: "ALL", name: "All Projects" };

type Option = { id: any; name: string };

type Props = {
  companyId: number;
  selectedIds: number[];
  selectedTasks: any[];
  units: Option[];
  onClear: () => void;
  onSaved: () => void | Promise<void>;
};

const fieldSx = {
  width: 140,
  flexShrink: 0,
  "& .MuiOutlinedInput-root": {
    borderRadius: "8px",
    fontSize: 13,
    flexWrap: "nowrap",
  },
  "& .MuiAutocomplete-input": { minWidth: "0 !important" },
};

// Bottom bar shown while tasks are ticked: sets the same shift, unit, status and/or
// projects on every selected task. Fields left empty are not changed.
const TaskBulkUpdateBar = ({
  companyId,
  selectedIds,
  selectedTasks,
  units,
  onClear,
  onSaved,
}: Props) => {
  const [projects, setProjects] = useState<Option[]>([]);
  const [shift, setShift] = useState<Option | null>(null);
  const [unit, setUnit] = useState<Option | null>(null);
  const [status, setStatus] = useState<Option | null>(null);
  const [projectValue, setProjectValue] = useState<Option[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    api
      .get(`tasks/get-resources?company_id=${companyId}`)
      .then((res) => setProjects(res.data?.projects || []))
      .catch(() => setProjects([]));
  }, [companyId]);

  const hasChanges = Boolean(shift || unit || status || projectValue.length);

  // Pricework/both tasks need a unit; flag selected tasks that would end up without one.
  const missingUnitCount = useMemo(() => {
    if (unit) return 0;
    return selectedTasks.filter((task) => {
      const finalShift = shift?.id ?? task?.shift_type;
      return (
        (finalShift === "pricework" || finalShift === "both") && !task?.unit_id
      );
    }).length;
  }, [selectedTasks, shift, unit]);

  const reset = () => {
    setShift(null);
    setUnit(null);
    setStatus(null);
    setProjectValue([]);
  };

  const handleClear = () => {
    reset();
    onClear();
  };

  const handleProjectChange = (value: Option[], clicked?: Option) => {
    if (clicked?.id === ALL_PROJECTS.id) {
      setProjectValue(
        value.some((item) => item.id === ALL_PROJECTS.id) ? [ALL_PROJECTS] : [],
      );
      return;
    }
    setProjectValue(value.filter((item) => item.id !== ALL_PROJECTS.id));
  };

  const handleSave = async () => {
    if (!hasChanges) {
      toast.error("Choose a shift, unit, status or project to update");
      return;
    }
    if (missingUnitCount) {
      toast.error(
        `Select a unit of measure: ${missingUnitCount} selected pricework task(s) have no unit`,
      );
      return;
    }

    const payload: Record<string, any> = { ids: selectedIds };
    if (shift) payload.shift_type = shift.id;
    if (unit) payload.unit_id = unit.id;
    if (status) payload.is_show = status.id;
    if (projectValue.length) {
      const isAll = projectValue.some((item) => item.id === ALL_PROJECTS.id);
      payload.project = isAll ? "All" : "Part";
      payload.project_ids = isAll ? [] : projectValue.map((item) => item.id);
    }

    setSaving(true);
    try {
      const res = await api.post("tasks/bulk-update", payload);
      if (res.data?.IsSuccess) {
        toast.success(res.data.message || "Tasks updated");
        reset();
        await onSaved();
      } else {
        toast.error(res.data?.message || "Failed to update tasks");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update tasks");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        px: 2,
        py: 1.25,
        zIndex: 1000,
        width: "max-content",
        maxWidth: "calc(100vw - 32px)",
        overflowX: "auto",
        border: "1px solid #e0e0e0",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.25}
        flexWrap="nowrap"
      >
        <IconButton
          size="small"
          onClick={handleClear}
          disabled={saving}
          sx={{ color: "#666", "&:hover": { bgcolor: "grey.100" } }}
        >
          <IconX size={16} />
        </IconButton>

        <Typography
          variant="body2"
          fontWeight={600}
          color="text.primary"
          whiteSpace="nowrap"
          pr={0.5}
        >
          {selectedIds.length} selected
        </Typography>

        <Autocomplete
          size="small"
          options={SHIFT_OPTIONS}
          value={shift}
          getOptionLabel={(option) => option.name}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          onChange={(_, value) => setShift(value)}
          renderInput={(params) => (
            <TextField {...params} placeholder="Shift" />
          )}
          sx={fieldSx}
          disabled={saving}
        />

        <Autocomplete
          size="small"
          options={units}
          value={unit}
          getOptionLabel={(option) => option.name}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          onChange={(_, value) => setUnit(value)}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Unit"
              error={missingUnitCount > 0}
            />
          )}
          sx={fieldSx}
          disabled={saving}
        />

        <Autocomplete
          size="small"
          options={STATUS_OPTIONS}
          value={status}
          getOptionLabel={(option) => option.name}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          onChange={(_, value) => setStatus(value)}
          renderInput={(params) => (
            <TextField {...params} placeholder="Status" />
          )}
          sx={fieldSx}
          disabled={saving}
        />

        <Autocomplete
          multiple
          size="small"
          disableCloseOnSelect
          options={[ALL_PROJECTS, ...projects]}
          value={projectValue}
          getOptionLabel={(option) => option.name}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          onChange={(_, value, __, details) =>
            handleProjectChange(value, details?.option)
          }
          // One-line summary instead of chips so the bar keeps a single row.
          renderTags={(value) => (
            <Typography
              variant="body2"
              noWrap
              sx={{ fontSize: 13, pl: 0.75, maxWidth: 120 }}
              title={value.map((item) => item.name).join(", ")}
            >
              {value.length === 1 ? value[0].name : `${value.length} projects`}
            </Typography>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={projectValue.length ? "" : "Project"}
            />
          )}
          sx={{ ...fieldSx, width: 180 }}
          disabled={saving}
        />

        <Button
          variant="contained"
          color="primary"
          size="small"
          onClick={handleSave}
          disabled={saving || !hasChanges}
          startIcon={
            saving ? (
              <CircularProgress size={15} color="inherit" />
            ) : (
              <IconDeviceFloppy size={15} />
            )
          }
          sx={{
            px: 2.5,
            flexShrink: 0,
            height: 38,
            textTransform: "none",
            fontWeight: 600,
            borderRadius: "8px",
            boxShadow: "none",
            "&:hover": { boxShadow: "none" },
          }}
        >
          Save
        </Button>
      </Stack>
      {missingUnitCount > 0 && (
        <Typography
          variant="caption"
          color="error"
          display="block"
          mt={0.5}
          ml={4.5}
        >
          {missingUnitCount} selected pricework task(s) have no unit, so choose
          a unit of measure.
        </Typography>
      )}
    </Box>
  );
};

export default TaskBulkUpdateBar;
