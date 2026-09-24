"use client";
import React from "react";
import { Box, Dialog, IconButton } from "@mui/material";
import { IconX } from "@tabler/icons-react";

type ImagePreviewDialogProps = {
  open: boolean;
  src?: string | null;
  onClose: () => void;
};

const ImagePreviewDialog: React.FC<ImagePreviewDialogProps> = ({
  open,
  src,
  onClose,
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    fullScreen
    PaperProps={{
      sx: {
        backgroundColor: "transparent",
        boxShadow: "none",
      },
    }}
  >
    <IconButton
      onClick={onClose}
      color="primary"
      sx={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 1301,
        backgroundColor: "#fff",
        "&:hover": {
          backgroundColor: "#eee",
          color: "#1e4db7",
        },
      }}
    >
      <IconX />
    </IconButton>
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <img
        src={src || ""}
        alt="Preview"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "90% !important",
          height: "50%",
          objectFit: "contain",
        }}
      />
    </Box>
  </Dialog>
);

export default ImagePreviewDialog;
