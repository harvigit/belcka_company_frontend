"use client";
import React from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { IconTrash } from "@tabler/icons-react";
import Image from "next/image";

type ImportConflictDialogProps = {
  open: boolean;
  products: any[];
  loading?: boolean;
  onClose: () => void;
  onKeepAll: () => void;
  onDelete: (productId: number, type: "original" | "imported") => void;
};

const ProductCard = ({
  title,
  color,
  product,
  loading,
  onDelete,
}: {
  title: string;
  color: string;
  product: any;
  loading?: boolean;
  onDelete: () => void;
}) => (
  <Box
    sx={{
      border: "1px solid #f1f1f1",
      borderRadius: 2,
      p: 2,
      backgroundColor: title === "Imported Product" ? "#fff8f0" : "#fafafa",
    }}
  >
    <Typography fontWeight={700} color={color} mb={1} fontSize="14px">
      {title}
    </Typography>
    <Stack direction="row" spacing={2} alignItems="center">
      <Image
        src={product.image || "/images/products/product.svg"}
        alt={title}
        width={60}
        height={60}
      />
      <Box flex={1}>
        <Typography fontWeight={700}>
          {product.short_name || product.name}
        </Typography>
        <Typography variant="body2">ID: {product.id}</Typography>
        <Typography variant="body2">UUID: {product.uuid || "-"}</Typography>
      </Box>
      <IconButton color="error" disabled={loading} onClick={onDelete}>
        <IconTrash size={20} />
      </IconButton>
    </Stack>
  </Box>
);

const ImportConflictDialog: React.FC<ImportConflictDialogProps> = ({
  open,
  products,
  loading = false,
  onClose,
  onKeepAll,
  onDelete,
}) => (
  <Dialog
    open={open}
    maxWidth="md"
    fullWidth
    onClose={(_event, reason) => {
      if (reason === "backdropClick" || reason === "escapeKeyDown") return;
      onClose();
    }}
    disableEscapeKeyDown
  >
    <DialogTitle>
      <Stack direction="row" spacing={1} alignItems="center">
        <WarningAmberIcon color="warning" />
        <Typography variant="h6" fontWeight={700}>
          Duplicate product found
        </Typography>
      </Stack>
    </DialogTitle>
    <DialogContent dividers>
      <Stack spacing={2}>
        {products.map((item: any, index: number) => (
          <Box
            key={index}
            sx={{
              border: "1px solid #e0e0e0",
              borderRadius: 2,
              p: 2,
              backgroundColor: "#fff",
            }}
          >
            <Stack spacing={2}>
              {item.original_product && (
                <ProductCard
                  title="Existing Product"
                  color="primary"
                  product={item.original_product}
                  loading={loading}
                  onDelete={() =>
                    onDelete(item.original_product.id, "original")
                  }
                />
              )}
              {item.imported_product && (
                <ProductCard
                  title="Imported Product"
                  color="warning.main"
                  product={item.imported_product}
                  loading={loading}
                  onDelete={() =>
                    onDelete(item.imported_product.id, "imported")
                  }
                />
              )}
            </Stack>
          </Box>
        ))}
      </Stack>
    </DialogContent>
    <DialogActions sx={{ p: 2 }}>
      <Button
        variant="outlined"
        color="primary"
        onClick={onKeepAll}
        disabled={loading}
      >
        Keep All
      </Button>
    </DialogActions>
  </Dialog>
);

export default ImportConflictDialog;
