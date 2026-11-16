"use client";

import React, { useMemo } from "react";
import {
  Autocomplete,
  Grid,
  MenuItem,
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Alert,
} from "@mui/material";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import {
  IconBuilding,
  IconMapPin,
  IconUser,
  IconCalendar,
  IconFileText,
} from "@tabler/icons-react";
import { SurveyProjectOption, SurveyAddressOption, SurveyorOption } from "../../types";

interface Step1DetailsProps {
  formData: {
    reference: string;
    title: string;
    projectId: number | null;
    addressId: number | null;
    surveyorId: number | null;
    surveyDate: string;
    notes: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  projects: SurveyProjectOption[];
  addresses: SurveyAddressOption[];
  surveyors: SurveyorOption[];
  loadingResources: boolean;
  errors: Record<string, string>;
}

export default function Step1Details({
  formData,
  setFormData,
  projects,
  addresses,
  surveyors,
  loadingResources,
  errors,
}: Step1DetailsProps) {
  // Filter addresses by selected project
  const availableAddresses = useMemo(() => {
    if (!formData.projectId) return addresses;
    return addresses.filter((a) => a.project_id === formData.projectId);
  }, [addresses, formData.projectId]);

  if (loadingResources) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={8}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress size={36} />
          <Typography variant="body2" color="text.secondary">
            Loading active projects, property addresses, and surveyors...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={0.5}>
        Step 1: Survey Details
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Define project, property location, assigned surveyor, and scheduled inspection date.
      </Typography>

      <Grid container spacing={3}>
        {/* Reference & Title */}
        <Grid size={{ xs: 12, md: 4 }}>
          <CustomTextField
            fullWidth
            label="Survey Reference"
            placeholder="Auto-generated"
            value={formData.reference}
            onChange={(e: any) =>
              setFormData((prev: any) => ({ ...prev, reference: e.target.value }))
            }
            error={Boolean(errors.reference)}
            helperText={errors.reference || "Leave blank to number automatically"}
            InputProps={{
              startAdornment: (
                <Box mr={1} color="text.secondary" display="flex">
                  <IconFileText size={18} />
                </Box>
              ),
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <CustomTextField
            fullWidth
            required
            label="Survey Title / Description"
            placeholder="e.g. Comprehensive Condition Survey or Void Inspection"
            value={formData.title}
            onChange={(e: any) =>
              setFormData((prev: any) => ({ ...prev, title: e.target.value }))
            }
            error={Boolean(errors.title)}
            helperText={errors.title || "Clear purpose or brief description of survey"}
          />
        </Grid>

        {/* Project & Address */}
        <Grid size={{ xs: 12, md: 6 }}>
          <CustomTextField
            select
            fullWidth
            required
            label="Project"
            value={formData.projectId || ""}
            onChange={(e: any) => {
              const val = Number(e.target.value) || null;
              setFormData((prev: any) => ({
                ...prev,
                projectId: val,
                addressId: null, // Reset address when project changes
              }));
            }}
            error={Boolean(errors.projectId)}
            helperText={errors.projectId || "Select company project"}
            InputProps={{
              startAdornment: (
                <Box mr={1} color="text.secondary" display="flex">
                  <IconBuilding size={18} />
                </Box>
              ),
            }}
          >
            {projects.length === 0 ? (
              <MenuItem disabled value="">
                No active projects found
              </MenuItem>
            ) : (
              projects.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))
            )}
          </CustomTextField>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Autocomplete
            options={availableAddresses}
            value={addresses.find((a) => a.id === formData.addressId) || null}
            onChange={(_, addr) =>
              setFormData((prev: any) => ({
                ...prev,
                addressId: addr ? addr.id : null,
                // Picking an address without a project fills in the address's project.
                projectId: prev.projectId || (addr ? addr.project_id : null),
              }))
            }
            getOptionLabel={(addr) => addr.full_name || addr.name}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            // Search the full address and the parent address name.
            filterOptions={(options, { inputValue }) => {
              const words = inputValue.toLowerCase().split(/\s+/).filter(Boolean);
              if (!words.length) return options;
              return options.filter((addr) => {
                const text = `${addr.full_name || addr.name} ${addr.parent_name || ""}`.toLowerCase();
                return words.every((w) => text.includes(w));
              });
            }}
            noOptionsText={
              formData.projectId ? "No matching address in this project" : "No matching address"
            }
            ListboxProps={{ style: { maxHeight: 360 } }}
            // Keep long addresses clear of the clear (×) and open (▾) buttons.
            sx={{ "& .MuiAutocomplete-inputRoot": { paddingRight: "72px !important" } }}
            renderOption={(props, addr) => {
              const { key, ...optionProps } = props as any;
              return (
                <Box
                  component="li"
                  key={addr.id}
                  {...optionProps}
                  sx={{ display: "flex", alignItems: "flex-start", gap: 1.25, py: "10px !important" }}
                >
                  <Box color="text.secondary" display="flex" pt={0.25}>
                    <IconMapPin size={16} />
                  </Box>
                  <Box minWidth={0}>
                    <Typography variant="body2" fontWeight={600} sx={{ wordBreak: "break-word" }}>
                      {addr.full_name || addr.name}
                    </Typography>
                    {addr.parent_name && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {addr.parent_name}
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            }}
            renderInput={(params) => {
              const selected = addresses.find((a) => a.id === formData.addressId);
              return (
                <CustomTextField
                  {...params}
                  required
                  label="Property / Property Address"
                  placeholder="Search by street, postcode or building"
                  error={Boolean(errors.addressId)}
                  helperText={
                    errors.addressId ||
                    (selected?.parent_name
                      ? `Under ${selected.parent_name}`
                      : formData.projectId
                        ? `${availableAddresses.length} address(es) for selected project`
                        : "Select a project to narrow the list, or search all addresses")
                  }
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <Box ml={0.5} mr={0.5} color="text.secondary" display="flex">
                          <IconMapPin size={18} />
                        </Box>
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              );
            }}
          />
        </Grid>

        {/* Surveyor & Date */}
        <Grid size={{ xs: 12, md: 6 }}>
          <CustomTextField
            select
            fullWidth
            required
            label="Assigned Surveyor"
            value={formData.surveyorId || ""}
            onChange={(e: any) =>
              setFormData((prev: any) => ({
                ...prev,
                surveyorId: Number(e.target.value) || null,
              }))
            }
            error={Boolean(errors.surveyorId)}
            helperText={errors.surveyorId || "Designated surveyor responsible for inspection"}
            InputProps={{
              startAdornment: (
                <Box mr={1} color="text.secondary" display="flex">
                  <IconUser size={18} />
                </Box>
              ),
            }}
          >
            {surveyors.length === 0 ? (
              <MenuItem disabled value="">
                No users found
              </MenuItem>
            ) : (
              surveyors.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.name} {user.email ? `(${user.email})` : ""}
                </MenuItem>
              ))
            )}
          </CustomTextField>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <CustomTextField
            fullWidth
            required
            type="date"
            label="Scheduled Survey Date"
            value={formData.surveyDate}
            onChange={(e: any) =>
              setFormData((prev: any) => ({ ...prev, surveyDate: e.target.value }))
            }
            InputLabelProps={{ shrink: true }}
            error={Boolean(errors.surveyDate)}
            helperText={errors.surveyDate || "Target date for surveyor property visit"}
            InputProps={{
              startAdornment: (
                <Box mr={1} color="text.secondary" display="flex">
                  <IconCalendar size={18} />
                </Box>
              ),
            }}
          />
        </Grid>

        {/* Notes */}
        <Grid size={{ xs: 12 }}>
          <CustomTextField
            fullWidth
            multiline
            rows={3}
            label="Surveyor Instructions / Access Notes (Optional)"
            placeholder="e.g. Tenant contact details, key safe access code, parking restrictions, specific inspection focus areas..."
            value={formData.notes}
            onChange={(e: any) =>
              setFormData((prev: any) => ({ ...prev, notes: e.target.value }))
            }
          />
        </Grid>
      </Grid>
    </Box>
  );
}
