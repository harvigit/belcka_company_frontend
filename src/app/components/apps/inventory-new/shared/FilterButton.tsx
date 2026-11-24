"use client";
import React, { useState } from "react";
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { IconFilter, IconX } from "@tabler/icons-react";

export interface FilterOption {
  value: string | number;
  label: string;
  image?: string | null; // used when the field has avatar
}

export interface FilterField {
  key: string;
  label: string;
  options: FilterOption[];
  // Searchable dropdown (like the Expenses filters) instead of a plain select.
  searchable?: boolean;
  // Searchable dropdown with each user's photo (implies searchable).
  avatar?: boolean;
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
            {fields.map((field) =>
              field.searchable || field.avatar ? (
                <Autocomplete
                  key={field.key}
                  options={field.options}
                  getOptionLabel={(o) => o.label}
                  getOptionKey={(o) => String(o.value)}
                  isOptionEqualToValue={(o, v) => String(o.value) === String(v.value)}
                  value={field.options.find((o) => String(o.value) === tempFilters[field.key]) ?? null}
                  onChange={(_, o) => setTempFilters({ ...tempFilters, [field.key]: o ? String(o.value) : "" })}
                  renderOption={(props, o) => {
                    const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key: string };
                    return (
                      <Box component="li" key={key} {...rest}>
                        <Stack direction="row" alignItems="center" spacing={1.5} minWidth={0}>
                          {field.avatar && (
                            <Avatar src={o.image || "/images/users/user.png"} alt={o.label} sx={{ width: 36, height: 36 }} />
                          )}
                          <Typography component="span" className="f-14" noWrap>
                            {o.label}
                          </Typography>
                        </Stack>
                      </Box>
                    );
                  }}
                  renderInput={(params) => {
                    const selected = field.avatar
                      ? field.options.find((o) => String(o.value) === tempFilters[field.key])
                      : undefined;
                    return (
                      <TextField
                        {...params}
                        label={field.label}
                        placeholder={ALL}
                        fullWidth
                        InputLabelProps={{ ...params.InputLabelProps, shrink: true }}
                        InputProps={{
                            ...params.InputProps,
                            startAdornment: selected ? (
                              <Avatar
                                src={selected.image || "/images/users/user.png"}
                                alt={selected.label}
                                sx={{ width: 24, height: 24, ml: 0.5 }}
                              />
                            ) : (
                              params.InputProps.startAdornment
                            ),
                        }}
                      />
                    );
                  }}
                />
              ) : (
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
              ),
            )}
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
