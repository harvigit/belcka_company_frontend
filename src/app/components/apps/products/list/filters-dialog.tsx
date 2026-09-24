"use client";
import React from "react";
import { Autocomplete, MenuItem, TextField } from "@mui/material";
import ListFiltersDialog from "@/app/components/common/ListFiltersDialog";

export type ProductProjectFilter = {
  id: string;
  name: string;
};

export type ProductFilters = {
  supplier: string;
  category: string;
  projects: ProductProjectFilter[];
  status: string;
};

type ProductFiltersDialogProps = {
  open: boolean;
  onClose: () => void;
  tempFilters: ProductFilters;
  setTempFilters: React.Dispatch<React.SetStateAction<ProductFilters>>;
  suppliers: any[];
  categories: any[];
  projects: any[];
  onClear: () => void;
  onApply: () => void;
  normalizeFilterValue: (value?: string | number | null) => string;
  normalizeProjects: (projects?: any[]) => ProductProjectFilter[];
};

const ProductFiltersDialog: React.FC<ProductFiltersDialogProps> = ({
  open,
  onClose,
  tempFilters,
  setTempFilters,
  suppliers,
  categories,
  projects,
  onClear,
  onApply,
  normalizeFilterValue,
  normalizeProjects,
}) => (
  <ListFiltersDialog
    open={open}
    onClose={onClose}
    onClear={onClear}
    onApply={onApply}
  >
    <TextField
      select
      label="Suppliers"
      value={tempFilters.supplier || "All"}
      onChange={(e) => {
        setTempFilters({
          ...tempFilters,
          supplier: normalizeFilterValue(e.target.value),
        });
      }}
      fullWidth
    >
      <MenuItem value="All">All</MenuItem>
      {tempFilters.supplier &&
        tempFilters.supplier !== "All" &&
        !suppliers.some((item) => item.name === tempFilters.supplier) && (
          <MenuItem value={tempFilters.supplier}>
            {tempFilters.supplier}
          </MenuItem>
        )}
      {suppliers.map((item, i) => (
        <MenuItem key={i} value={item.name}>
          {item.name}
        </MenuItem>
      ))}
    </TextField>

    <TextField
      select
      label="Category"
      value={tempFilters.category || "All"}
      onChange={(e) =>
        setTempFilters({
          ...tempFilters,
          category: normalizeFilterValue(e.target.value),
        })
      }
      fullWidth
    >
      <MenuItem value="All">All</MenuItem>
      {tempFilters.category &&
        tempFilters.category !== "All" &&
        !categories.some((item) => item.name === tempFilters.category) && (
          <MenuItem value={tempFilters.category}>{tempFilters.category}</MenuItem>
        )}
      {categories.map((item, i) => (
        <MenuItem key={i} value={item.name}>
          {item.name}
        </MenuItem>
      ))}
    </TextField>

    <Autocomplete
      multiple
      options={projects || []}
      getOptionLabel={(option) => option.name || ""}
      isOptionEqualToValue={(option, selected) =>
        String(option.id) === String(selected.id)
      }
      value={(tempFilters.projects || []).map(
        (stored) =>
          (projects || []).find(
            (project) => String(project.id) === String(stored.id),
          ) || stored,
      )}
      onChange={(_, newValue) => {
        setTempFilters({
          ...tempFilters,
          projects: normalizeProjects(newValue),
        });
      }}
      renderInput={(params) => <TextField {...params} label="Projects" />}
    />

    <TextField
      select
      label="Status"
      value={tempFilters.status || "All"}
      onChange={(e) =>
        setTempFilters({
          ...tempFilters,
          status: normalizeFilterValue(e.target.value),
        })
      }
      fullWidth
    >
      <MenuItem value="All">All</MenuItem>
      {tempFilters.status &&
        tempFilters.status !== "All" &&
        !["1", "2", "4", "5"].includes(tempFilters.status) && (
          <MenuItem value={tempFilters.status}>{tempFilters.status}</MenuItem>
        )}
      <MenuItem value="5">In Stock</MenuItem>
      <MenuItem value="4">Out of Stock</MenuItem>
      <MenuItem value="2">Minus Stock</MenuItem>
      <MenuItem value="1">Low Stock</MenuItem>
    </TextField>
  </ListFiltersDialog>
);

export default ProductFiltersDialog;
