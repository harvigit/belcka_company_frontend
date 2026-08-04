"use client";

import React from "react";
import {
  Box,
  Button,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputAdornment,
  Popover,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material";
import {
  IconEye,
  IconFilter,
  IconSearch,
  IconSettings,
} from "@tabler/icons-react";
import DateRangePickerBox from "@/app/components/common/DateRangePickerBox";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";

type ColumnToggle = {
  id: string;
  label: string;
  visible: boolean;
  onToggle: () => void;
};

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  startDate: Date | null;
  endDate: Date | null;
  onDateRangeChange: (range: { from: Date | null; to: Date | null }) => void;
  onFiltersClick: () => void;
  onSettingsClick?: () => void;
  columnToggles?: ColumnToggle[];
};

const ExpenseSearchHeader = ({
  search,
  onSearchChange,
  startDate,
  endDate,
  onDateRangeChange,
  onFiltersClick,
  onSettingsClick,
  columnToggles = [],
}: Props) => {
  const [columnMenuAnchor, setColumnMenuAnchor] =
    React.useState<null | HTMLElement>(null);

  return (
    <Stack
      mr={2}
      ml={2}
      mb={1}
      mt={1}
      justifyContent="space-between"
      direction={{ xs: "column", sm: "row" }}
      spacing={{ xs: 1, sm: 2, md: 4 }}
      alignItems={{ sm: "center" }}
    >
      <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
        <DateRangePickerBox
          from={startDate}
          to={endDate}
          onChange={onDateRangeChange}
        />
        <TextField
          size="small"
          placeholder="Search..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconSearch size={16} />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: "100%", sm: 180 } }}
        />
        <Button
          variant="contained"
          color="primary"
          size="small"
          onClick={onFiltersClick}
          sx={{ minWidth: "40px", px: 1 }}
          aria-label="Open filters"
        >
          <IconFilter width={18} />
        </Button>
      </Box>

      <Box display="flex" justifyContent="flex-end" alignItems="center">
        <Tooltip title="Column visibility">
          <IconButton
            onClick={(e) => setColumnMenuAnchor(e.currentTarget)}
            color="primary"
            size="small"
          >
            <IconEye size={20} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Settings">
          <IconButton onClick={onSettingsClick} color="primary" size="small">
            <IconSettings size={20} />
          </IconButton>
        </Tooltip>

        {columnToggles.length > 0 ? (
          <Popover
            open={Boolean(columnMenuAnchor)}
            anchorEl={columnMenuAnchor}
            onClose={() => setColumnMenuAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <FormGroup sx={{ p: 2 }}>
              {columnToggles.map((column) => (
                <FormControlLabel
                  key={column.id}
                  control={
                    <CustomCheckbox
                      checked={column.visible}
                      onChange={column.onToggle}
                    />
                  }
                  label={column.label}
                />
              ))}
            </FormGroup>
          </Popover>
        ) : null}
      </Box>
    </Stack>
  );
};

export default ExpenseSearchHeader;
