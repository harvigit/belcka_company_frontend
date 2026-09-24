"use client";
import React, { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import { IconTrash } from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";
import api from "@/utils/axios";
import toast from "react-hot-toast";

type ProductImage = { id: number; url: string; isMain: boolean };

type ProductImageManagerDialogProps = {
  open: boolean;
  onClose: () => void;
  product: any | null;
  onUpdated: (productId: number, imageUrl: string | null) => void;
};

const ProductImageManagerDialog: React.FC<ProductImageManagerDialogProps> = ({
  open,
  onClose,
  product,
  onUpdated,
}) => {
  const [uploadedImages, setUploadedImages] = useState<ProductImage[]>([]);
  const [originalUploadedImages, setOriginalUploadedImages] = useState<any[]>(
    [],
  );
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newMainImage, setNewMainImage] = useState<File | null>(null);
  const [mainImageId, setMainImageId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open || !product) return;

    const existingImages = [
      product.image_url ? { id: 0, image_url: product.image_url } : null,
      ...(product.product_images || []),
    ]
      .filter((img): img is { id: number; image_url: string } => !!img)
      .map((img) => ({
        id: img.id,
        url: img.image_url,
        isMain: img.image_url === product.image_url,
      }));

    setUploadedImages(existingImages);
    setOriginalUploadedImages(product.product_images || []);
    const mainIdx = existingImages.findIndex((img) => img.isMain);
    setMainImageId(mainIdx >= 0 ? existingImages[mainIdx].id : null);
    setNewImages([]);
    setNewMainImage(null);
  }, [open, product]);

  useEffect(() => {
    if (!open) return;

    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image")) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        setNewImages((prev) => [...prev, ...imageFiles]);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [open]);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "image/*": [".jpg", ".jpeg", ".png", ".webp"],
    },
    onDrop: (acceptedFiles: File[]) => {
      setNewImages((prev) => [...prev, ...acceptedFiles]);
    },
  });

  const handleSetMainExisting = (id: number) => {
    setUploadedImages((prev) =>
      prev.map((img) => ({
        ...img,
        isMain: img.id === id,
      })),
    );
    setMainImageId(id);
    setNewMainImage(null);
  };

  const handleSetMainNew = (file: File) => {
    setNewMainImage(file);
    setMainImageId(null);
    setUploadedImages((prev) => prev.map((img) => ({ ...img, isMain: false })));
  };

  const handleSaveImages = async () => {
    if (!product) return;
    setIsSaving(true);

    const formData = new FormData();
    formData.append("id", String(product.id));
    const originalMainImage = product.image_url;

    originalUploadedImages
      .filter((orig: any) => !uploadedImages.some((u) => u.id === orig.id))
      .forEach((img: any) => {
        formData.append("removed_image_ids[]", String(img.id));
      });

    if (newMainImage) {
      formData.append("image", newMainImage);
      newImages
        .filter((file) => file !== newMainImage)
        .forEach((file) => formData.append("files", file));
    } else {
      if (mainImageId !== null) {
        formData.append("main_image_id", String(mainImageId));
      }
      newImages.forEach((file) => formData.append("files", file));
      const mainStillExists = uploadedImages.some(
        (img) => img.url === originalMainImage,
      );
      if (!mainStillExists && originalMainImage) {
        formData.append("remove_image", "1");
      }
    }

    try {
      const res = await api.post(`products/new-images`, formData, {
        headers: { "Content-Type": undefined },
      });

      if (res.data.IsSuccess) {
        toast.success(res.data.message);

        let newImageUrl = product.image_url;
        if (res.data.data?.image_url) {
          newImageUrl = res.data.data.image_url;
        } else if (res.data.image_url) {
          newImageUrl = res.data.image_url;
        } else if (newMainImage) {
          newImageUrl = URL.createObjectURL(newMainImage);
        } else if (mainImageId !== null) {
          const selectedImg = uploadedImages.find(
            (img) => img.id === mainImageId,
          );
          if (selectedImg) newImageUrl = selectedImg.url;
        } else {
          const mainStillExists = uploadedImages.some(
            (img) => img.url === originalMainImage,
          );
          if (!mainStillExists && originalMainImage) {
            newImageUrl = null;
          }
        }

        onUpdated(product.id, newImageUrl);
        onClose();
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      console.error("Upload failed:", err);
    }

    setIsSaving(false);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Image</DialogTitle>
      <DialogContent>
        <div
          {...getRootProps()}
          style={{
            border: "2px dashed #1976d2",
            borderRadius: 8,
            padding: 40,
            textAlign: "center",
            cursor: "pointer",
            marginBottom: 20,
          }}
        >
          <input {...getInputProps()} />
          <Typography>Drag & drop or paste images</Typography>
        </div>

        <Grid container spacing={2}>
          {uploadedImages.map((img) => (
            <Grid key={img.id} style={{ position: "relative" }}>
              <img
                src={img.url}
                width={80}
                height={80}
                style={{ objectFit: "cover", borderRadius: 4 }}
              />
              <button
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  background: img.isMain ? "#1976d2" : "rgba(0,0,0,0.4)",
                  color: "white",
                  fontSize: 12,
                  border: "none",
                  borderRadius: "0 4px 0 0",
                  padding: "2px 4px",
                  cursor: "pointer",
                }}
                onClick={() => handleSetMainExisting(img.id)}
              >
                {img.isMain ? "Primary" : "Images"}
              </button>
              <IconButton
                color="error"
                size="small"
                sx={{
                  position: "absolute",
                  top: -10,
                  right: -10,
                  backgroundColor: "#fff",
                  zIndex: 2,
                  "&:hover": {
                    backgroundColor: "#fff",
                    color: "red",
                  },
                }}
                onClick={() =>
                  setUploadedImages(
                    uploadedImages.filter((i) => i.id !== img.id),
                  )
                }
              >
                <IconTrash size={16} />
              </IconButton>
            </Grid>
          ))}

          {newImages.map((file, index) => (
            <Grid key={index} style={{ position: "relative" }}>
              <img
                src={URL.createObjectURL(file)}
                width={80}
                height={80}
                style={{ objectFit: "cover", borderRadius: 4 }}
              />
              <button
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  background:
                    newMainImage === file ? "#1976d2" : "rgba(0,0,0,0.4)",
                  color: "white",
                  fontSize: 12,
                  border: "none",
                  borderRadius: "0 4px 0 0",
                  padding: "2px 4px",
                  cursor: "pointer",
                }}
                onClick={() => handleSetMainNew(file)}
              >
                Primary
              </button>
              <IconButton
                size="small"
                color="error"
                sx={{
                  position: "absolute",
                  top: -10,
                  right: -10,
                  backgroundColor: "#fff",
                  zIndex: 2,
                  "&:hover": {
                    backgroundColor: "#fff",
                    color: "red",
                  },
                }}
                onClick={() =>
                  setNewImages(newImages.filter((_, i) => i !== index))
                }
              >
                <IconTrash size={16} />
              </IconButton>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSaveImages}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductImageManagerDialog;
