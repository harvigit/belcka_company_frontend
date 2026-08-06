"use client";

import React from "react";
import { Box, Button, IconButton, Stack, Typography } from "@mui/material";
import {
  IconCheck,
  IconChevronDown,
  IconSend,
  IconTrash,
  IconX,
} from "@tabler/icons-react";

type Props = {
  selectedCount: number;
  selectedTotalLabel?: string;
  onClearSelection?: () => void;
  onApprove?: () => void;
  onSendToBookkeeper?: () => void;
  onExport?: () => void;
  onDelete?: () => void;
};

const buttonSx = {
  px: 2.5,
  textTransform: "none" as const,
  fontWeight: 600,
  borderRadius: "8px",
};

const ExpenseBulkActionBar = ({
  selectedCount,
  selectedTotalLabel,
  onClearSelection,
  onApprove,
  onSendToBookkeeper,
  onExport,
  onDelete,
}: Props) => {
  if (selectedCount <= 0) return null;

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
        px: 3,
        py: 1.5,
        zIndex: 1000,
        minWidth: "fit-content",
        width: "max-content",
        maxWidth: "calc(100vw - 32px)",
        border: "1px solid #e0e0e0",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        sx={{ flexWrap: "nowrap", whiteSpace: "nowrap" }}
      >
        <IconButton
          size="small"
          onClick={onClearSelection}
          sx={{ color: "#666", "&:hover": { bgcolor: "grey.100" }, flexShrink: 0 }}
        >
          <IconX size={16} />
        </IconButton>

        <Box sx={{ flexShrink: 0 }}>
          <Typography variant="body2" fontWeight={600} color="text.primary">
            {selectedCount} Selected
          </Typography>
          {selectedTotalLabel ? (
            <Typography variant="caption" color="text.secondary">
              {selectedTotalLabel}
            </Typography>
          ) : null}
        </Box>

        <Box sx={{ flexGrow: 1, minWidth: 16 }} />

        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ flexWrap: "nowrap", flexShrink: 0 }}
        >
          <Button
            startIcon={<IconCheck size={15} />}
            variant="outlined"
            color="success"
            size="small"
            onClick={onApprove}
            sx={buttonSx}
          >
            Approve Selected
          </Button>

          <Button
            startIcon={<IconSend size={15} />}
            variant="contained"
            color="primary"
            size="small"
            onClick={onSendToBookkeeper}
            sx={{
              ...buttonSx,
              boxShadow: "none",
              "&:hover": { boxShadow: "none" },
            }}
          >
            Send to Bookkeeper
          </Button>

          <Button
            size="small"
            variant="outlined"
            color="primary"
            onClick={onExport}
            endIcon={<IconChevronDown size={18} />}
            sx={buttonSx}
          >
            Export Selected
          </Button>

          <Button
            startIcon={<IconTrash size={15} />}
            variant="outlined"
            color="error"
            size="small"
            onClick={onDelete}
            sx={buttonSx}
          >
            Delete Selected
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};

export default ExpenseBulkActionBar;
