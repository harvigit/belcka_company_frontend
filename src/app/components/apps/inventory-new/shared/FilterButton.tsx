"use client";
import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { IconFilter, IconX } from "@tabler/icons-react";

export interface FilterField {
  key: string;
  label: string;
  options: { value: string | number; label: string }[];
}

export type FilterValues = Record<string, string>;

interface FilterButtonProps {
  fields: FilterField[];
  value: FilterValues;
  onApply: (values: FilterValues) => void;
}

const ALL = "All";

// Filter icon button, clear button and "Filters" dialog, same as the Stock list.
const FilterButton: React.FC<FilterButtonProps> = ({
  fields,
  value,
  onApply,
}) => {
  const [open, setOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState<FilterValues>(value);

  const hasActiveFilters = Object.values(value).some(
    (v) => v !== "" && v !== undefined,
  );
  const cleared = Object.fromEntries(fields.map((f) => [f.key, ""]));

  return (
    <>
      <Button
        variant="contained"
        onClick={() => {
          setTempFilters(value);
          setOpen(true);
        }}
        sx={{ mt: { xs: 1, sm: 0 }, minWidth: "40px", px: 1 }}
      >
        <IconFilter width={18} />
      </Button>
      {hasActiveFilters && (
        <Button
          color="error"
          variant="outlined"
          onClick={() => onApply(cleared)}
          sx={{
            mt: { xs: 1, sm: 0 },
            minHeight: 34,
            height: 34,
            minWidth: 64,
            px: 1.5,
          }}
          aria-label="Clear filters"
        >
          <IconX size={18} />
        </Button>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ m: 0, position: "relative", overflow: "visible" }}>
          Filters
          <IconButton
            aria-label="close"
            onClick={() => setOpen(false)}
            size="large"
            sx={{
              position: "absolute",
              right: 12,
              top: 8,
              color: (theme) => theme.palette.grey[900],
              backgroundColor: "transparent",
              zIndex: 10,
              width: 50,
              height: 50,
            }}
          >
            <IconX size={40} style={{ width: 40, height: 40 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {fields.map((field) => (
              <TextField
                key={field.key}
                select
                label={field.label}
                value={tempFilters[field.key] || ALL}
                onChange={(e) =>
                  setTempFilters({
                    ...tempFilters,
                    [field.key]:
                      e.target.value === ALL ? "" : String(e.target.value),
                  })
                }
                fullWidth
              >
                <MenuItem value={ALL}>All</MenuItem>
                {field.options.map((option) => (
                  <MenuItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            ))}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => {
              onApply(cleared);
              setOpen(false);
            }}
            color="inherit"
          >
            Clear
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              onApply(tempFilters);
              setOpen(false);
            }}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FilterButton;
