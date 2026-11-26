"use client";
import React, { useEffect, useState } from "react";
import { Box, Dialog, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { IconChevronLeft, IconChevronRight, IconDownload, IconPhoto, IconX } from "@tabler/icons-react";

export type ViewerPhoto = { src: string; name?: string };

export const fileNameOf = (url: string, fallback = "photo.jpg") =>
  decodeURIComponent(url.split("?")[0].split("/").pop() || "") || fallback;

// The image, or an image icon when the file can't be loaded.
export const SafeImage: React.FC<{ src: string; alt?: string; iconSize?: number; label?: string; fit?: "cover" | "contain" }> = ({
  src,
  alt = "",
  iconSize = 20,
  label,
  fit = "cover",
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (failed) {
    return (
      <Box
        title={label ?? "Image not available"}
        sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, color: "grey.500", bgcolor: "grey.100" }}
      >
        <IconPhoto size={iconSize} stroke={1.5} />
        {label && <Typography variant="body2" color="textSecondary">{label}</Typography>}
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      sx={fit === "cover" ? { width: "100%", height: "100%", objectFit: "cover", display: "block" } : { maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }}
    />
  );
};

// Saves the file; if the server doesn't allow it to be read, it opens in a new tab instead.
const download = async (photo: ViewerPhoto) => {
  const name = photo.name || fileNameOf(photo.src);

  try {
    const res = await fetch(photo.src);
    if (!res.ok) throw new Error();
    const url = URL.createObjectURL(await res.blob());
    const link = document.createElement("a");

    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch {
    window.open(photo.src, "_blank", "noopener,noreferrer");
  }
};

// Photos in a popup: previous / next (also with the arrow keys), download and thumbnails.
const PhotoViewer: React.FC<{ photos: ViewerPhoto[]; index: number | null; onClose: () => void }> = ({ photos, index, onClose }) => {
  const [current, setCurrent] = useState(0);
  const open = index !== null && photos.length > 0;
  const count = photos.length;
  const photo = photos[current];

  useEffect(() => {
    if (index !== null) setCurrent(Math.min(Math.max(index, 0), Math.max(count - 1, 0)));
  }, [index, count]);

  const go = (step: number) => setCurrent((c) => (c + step + count) % count);

  if (!open || !photo) return null;

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="md"
      fullWidth
      onKeyDown={(e) => {
        if (count < 2) return;
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} px={2} py={1.25} borderBottom="1px solid" borderColor="divider">
        <Typography variant="subtitle1" fontWeight={600} noWrap sx={{ flex: 1, minWidth: 0 }}>
          {photo.name || `Photo ${current + 1}`}
        </Typography>
        {count > 1 && (
          <Typography variant="body2" color="textSecondary" sx={{ flexShrink: 0 }}>
            {current + 1} / {count}
          </Typography>
        )}
        <Tooltip title="Download">
          <IconButton onClick={() => download(photo)} aria-label="Download photo">
            <IconDownload size={20} />
          </IconButton>
        </Tooltip>
        <IconButton onClick={onClose} aria-label="Close">
          <IconX size={20} />
        </IconButton>
      </Stack>

      <Box position="relative" display="flex" alignItems="center" justifyContent="center" bgcolor="grey.100" sx={{ height: { xs: "55vh", sm: "65vh" } }}>
        <SafeImage key={photo.src} src={photo.src} alt={photo.name || `Photo ${current + 1}`} fit="contain" iconSize={64} label="Image not available" />
        {count > 1 && (
          <>
            <IconButton
              onClick={() => go(-1)}
              aria-label="Previous photo"
              sx={{ position: "absolute", left: 12, bgcolor: "background.paper", boxShadow: 2, "&:hover": { bgcolor: "background.paper" } }}
            >
              <IconChevronLeft size={22} />
            </IconButton>
            <IconButton
              onClick={() => go(1)}
              aria-label="Next photo"
              sx={{ position: "absolute", right: 12, bgcolor: "background.paper", boxShadow: 2, "&:hover": { bgcolor: "background.paper" } }}
            >
              <IconChevronRight size={22} />
            </IconButton>
          </>
        )}
      </Box>

      {count > 1 && (
        <Stack direction="row" spacing={1} px={2} py={1.5} justifyContent="center" sx={{ overflowX: "auto" }}>
          {photos.map((p, i) => (
            <Box
              key={`${p.src}${i}`}
              component="button"
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`Photo ${i + 1}`}
              sx={{
                width: 56,
                height: 56,
                p: 0,
                flexShrink: 0,
                borderRadius: 1,
                overflow: "hidden",
                cursor: "pointer",
                border: "2px solid",
                borderColor: i === current ? "primary.main" : "transparent",
                opacity: i === current ? 1 : 0.6,
              }}
            >
              <SafeImage src={p.src} />
            </Box>
          ))}
        </Stack>
      )}
    </Dialog>
  );
};

export default PhotoViewer;
