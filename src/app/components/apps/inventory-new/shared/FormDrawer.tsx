import React from "react";
import { Drawer, Box, IconButton, Typography, Button } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

interface FormDrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
  children: React.ReactNode;
  width?: number;
  submitLabel?: string;
  // second submit-style button, e.g. "Save & place order"
  secondaryAction?: { label: string; onClick: () => void };
}

// Right-hand drawer used by every Inventory New add / edit form, styled like the other inventory drawers.
const FormDrawer: React.FC<FormDrawerProps> = ({
  open,
  title,
  onClose,
  onSubmit,
  isSaving,
  children,
  width = 500,
  submitLabel = "Save",
  secondaryAction,
}) => (
  <Drawer
    anchor="right"
    open={open}
    onClose={onClose}
    sx={{
      width,
      flexShrink: 0,
      "& .MuiDrawer-paper": {
        width: { xs: "100%", sm: width },
        backgroundColor: "#f9f9f9",
      },
    }}
  >
    <Box display="flex" flexDirection="column" height="100%">
      <Box display="flex" alignItems="center" flexWrap="wrap" p={1}>
        <IconButton onClick={onClose} aria-label="close drawer">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" fontWeight={700}>
          {title}
        </Typography>
      </Box>

      <Box
        component="form"
        onSubmit={onSubmit}
        className="address-form"
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          p: 2,
        }}
      >
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {children}
        </Box>

        <Box sx={{ display: "flex", justifyContent: "start", gap: 2, pt: 2 }}>
          <Button
            color="primary"
            variant="contained"
            size="large"
            type="submit"
            disabled={isSaving}
            sx={{ borderRadius: 3 }}
            className="drawer_buttons"
          >
            {isSaving ? "Saving..." : submitLabel}
          </Button>
          {secondaryAction && (
            <Button
              color="primary"
              variant="outlined"
              size="large"
              disabled={isSaving}
              onClick={secondaryAction.onClick}
              sx={{ borderRadius: 3 }}
            >
              {secondaryAction.label}
            </Button>
          )}
          <Button
            color="inherit"
            onClick={onClose}
            variant="contained"
            size="large"
            sx={{
              backgroundColor: "transparent",
              borderRadius: 3,
              color: "GrayText",
            }}
          >
            Close
          </Button>
        </Box>
      </Box>
    </Box>
  </Drawer>
);

export default FormDrawer;
