import React from "react";
import { Autocomplete, Avatar, Box, Typography } from "@mui/material";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";

export type ProjectAssignedUser = {
  id: number;
  name: string;
  user_image?: string | null;
  user_thumb_image?: string | null;
};

type ProjectUserMultiSelectProps = {
  id: string;
  label: string;
  placeholder: string;
  options: ProjectAssignedUser[];
  selectedIds: string;
  onChange: (ids: string) => void;
  helperText?: string;
  hideLabel?: boolean;
  size?: "small" | "medium";
  limitTags?: number;
  labelMt?: number;
};

const selectedIdSet = (selectedIds?: string) =>
  new Set(
    String(selectedIds || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );

const ProjectUserMultiSelect: React.FC<ProjectUserMultiSelectProps> = ({
  id,
  label,
  placeholder,
  options,
  selectedIds,
  onChange,
  helperText,
  hideLabel = false,
  size = "medium",
  limitTags,
  labelMt = 2,
}) => {
  const selected = options.filter((item) =>
    selectedIdSet(selectedIds).has(String(item.id)),
  );

  return (
    <>
      {!hideLabel && (
        <Typography variant="h5" mt={labelMt}>
          {label}
        </Typography>
      )}
      {helperText ? (
        <Typography variant="body2" color="text.secondary" mt={0.5} mb={0.5}>
          {helperText}
        </Typography>
      ) : null}
      <Autocomplete
        fullWidth
        multiple
        size={size}
        limitTags={limitTags}
        id={id}
        options={options}
        value={selected}
        sx={
          size === "small"
            ? {
                "& .MuiOutlinedInput-root": {
                  borderRadius: 1,
                  bgcolor: "#fff",
                  py: 0.25,
                },
                "& .MuiChip-root": {
                  height: 24,
                  "& .MuiChip-label": { px: 0.75 },
                },
              }
            : undefined
        }
        onChange={(_, newValue) => {
          onChange(
            newValue
              .map((item) => item.id)
              .filter(Boolean)
              .join(","),
          );
        }}
        getOptionLabel={(option) => option.name}
        getOptionKey={(option) => option.id}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        renderOption={(props, option) => {
          const { key, ...optionProps } = props as typeof props & {
            key?: React.Key;
          };
          return (
            <Box
              component="li"
              key={option.id ?? key}
              {...optionProps}
              sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
            >
              <Avatar
                src={
                  option.user_thumb_image ||
                  option.user_image ||
                  "/images/users/user.png"
                }
                alt={option.name}
                sx={{ width: 28, height: 28, fontSize: "12px" }}
              >
                {option.name?.[0]?.toUpperCase()}
              </Avatar>
              <Typography component="span" variant="body2">
                {option.name}
              </Typography>
            </Box>
          );
        }}
        renderInput={(params) => (
          <CustomTextField
            {...params}
            placeholder={placeholder}
            size={size}
          />
        )}
      />
    </>
  );
};

export default ProjectUserMultiSelect;
