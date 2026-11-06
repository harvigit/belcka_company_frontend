import React from "react";
import { Stack, TextField, Typography } from "@mui/material";

interface QtyInputProps {
  // sub qty: packs + loose units; otherwise packs only (PO) or units only (issue)
  mode: "packs+units" | "packs" | "units";
  packs: string;
  units: string;
  onChange: (value: { packs: string; units: string }) => void;
  packLabel?: string;
  unitLabel?: string;
  disabled?: boolean;
}

const inputSx = { width: 84, "& input": { textAlign: "right", py: "7px" } };

// Packs + loose units inputs used on PO lines, deliveries and internal order lines.
const QtyInput: React.FC<QtyInputProps> = ({
  mode,
  packs,
  units,
  onChange,
  packLabel = "pack",
  unitLabel = "unit",
  disabled,
}) => (
  <Stack direction="row" alignItems="center" spacing={0.75}>
    {mode !== "units" && (
      <>
        <TextField
          size="small"
          type="number"
          value={packs}
          disabled={disabled}
          onChange={(e) => onChange({ packs: e.target.value, units })}
          slotProps={{ htmlInput: { min: 0, step: 1 } }}
          sx={inputSx}
        />
        <Typography variant="body2" color="textSecondary" whiteSpace="nowrap">
          {packLabel}
        </Typography>
      </>
    )}
    {mode === "packs+units" && (
      <Typography variant="body2" color="textSecondary">
        +
      </Typography>
    )}
    {mode !== "packs" && (
      <>
        <TextField
          size="small"
          type="number"
          value={units}
          disabled={disabled}
          onChange={(e) => onChange({ packs, units: e.target.value })}
          slotProps={{ htmlInput: { min: 0, step: "any" } }}
          sx={inputSx}
        />
        <Typography variant="body2" color="textSecondary" whiteSpace="nowrap">
          {unitLabel}
        </Typography>
      </>
    )}
  </Stack>
);

export default QtyInput;
