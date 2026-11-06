"use client";

import { Chip, Tooltip } from "@mui/material";
import { IconMapPinPlus } from "@tabler/icons-react";

// Marks a room or element the surveyor added during the inspection, so the QS can tell it apart
// from what the template set up.
export default function AddedOnSiteChip() {
  return (
    <Tooltip title="Added by the surveyor during the inspection">
      <Chip
        size="small"
        color="info"
        variant="outlined"
        icon={<IconMapPinPlus size={14} />}
        label="Added on site"
        sx={{ fontWeight: 600, fontSize: "0.7rem", height: 22 }}
      />
    </Tooltip>
  );
}
