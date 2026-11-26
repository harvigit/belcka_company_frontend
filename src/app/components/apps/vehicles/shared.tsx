"use client";
import React, { useState } from "react";
import { Autocomplete, Avatar, Box, Chip, Stack, Typography } from "@mui/material";
import PhotoViewer, { fileNameOf, SafeImage } from "./photo-viewer";
import { IconCamera } from "@tabler/icons-react";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { DueItem, DUE_CHIP, formatDate } from "./types";
import { DriverOption } from "./useVehicles";

export const RegPlate: React.FC<{ registration: string; size?: "small" | "medium" }> = ({
  registration,
  size = "small",
}) => (
  <Box
    component="span"
    sx={{
      display: "inline-block",
      px: size === "small" ? 1 : 1.5,
      py: size === "small" ? 0.25 : 0.5,
      borderRadius: 1,
      border: "1px solid",
      borderColor: "grey.300",
      backgroundColor: "#FFD43B",
      color: "#1a1a1a",
      fontWeight: 700,
      fontSize: size === "small" ? 13 : 16,
      letterSpacing: 1,
      whiteSpace: "nowrap",
      lineHeight: 1.4,
    }}
  >
    {registration}
  </Box>
);

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

export const DriverName: React.FC<{ name: string; image?: string | null }> = ({
  name,
  image,
}) => (
  <Stack direction="row" spacing={1} alignItems="center">
    <Avatar src={image ?? undefined} sx={{ width: 28, height: 28, fontSize: 12 }}>
      {initials(name)}
    </Avatar>
    <Typography className="f-14" noWrap>
      {name}
    </Typography>
  </Stack>
);

export const DueCell: React.FC<{ item: DueItem | null }> = ({ item }) => {
  if (!item) return <Typography className="f-14">-</Typography>;
  const chip = DUE_CHIP[item.state];
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Chip size="small" color={chip.color} label={chip.label} />
      <Box>
        <Typography className="f-14" fontWeight={600} lineHeight={1.2}>
          {item.label}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          {formatDate(item.date)}
        </Typography>
      </Box>
    </Stack>
  );
};

export const DriverPicker: React.FC<{
  drivers: DriverOption[];
  value: number | null;
  onChange: (driver: DriverOption | null) => void;
  busyDriverIds?: Map<number, string>;
  error?: string;
}> = ({ drivers, value, onChange, busyDriverIds, error }) => (
  <Autocomplete
    size="small"
    options={drivers}
    value={drivers.find((d) => d.id === value) ?? null}
    onChange={(_, driver) => onChange(driver)}
    getOptionLabel={(o) => o.name}
    isOptionEqualToValue={(o, v) => o.id === v.id}
    noOptionsText="No employees found"
    renderOption={(props, option) => {
      const { key, ...rest } = props as any;
      const busy = busyDriverIds?.get(option.id);
      return (
        <Box component="li" key={key} {...rest}>
          <Stack direction="row" justifyContent="space-between" width="100%" spacing={1}>
            <DriverName name={option.name} image={option.image} />
            {busy && (
              <Typography variant="caption" color="textSecondary" noWrap>
                Drives {busy}
              </Typography>
            )}
          </Stack>
        </Box>
      );
    }}
    renderInput={(params) => (
      <CustomTextField {...params} placeholder="Search employee..." error={!!error} helperText={error} />
    )}
  />
);

export const NoCompany: React.FC = () => (
  <Box sx={{ py: 8, px: 2, textAlign: "center" }}>
    <Typography variant="h6" mb={1}>
      No company selected
    </Typography>
    <Typography color="textSecondary">
      Vehicles belong to a company. Join or switch to a company to see its vehicles.
    </Typography>
  </Box>
);

const isLink = (p: string) => /^https?:\/\//.test(p);

export const isImageFile = (name?: string | null) => !!name && /\.(jpe?g|png|gif|webp|heic|bmp)(\?|$)/i.test(name);

// Photos open in a popup with previous / next and download. Non-link values (no photo file) show as plain tiles.
export const PhotoThumbs: React.FC<{ photos: string[]; size?: number }> = ({ photos, size = 72 }) => {
  const [openAt, setOpenAt] = useState<number | null>(null);
  const links = photos.filter(isLink);

  if (!photos.length) {
    return (
      <Typography variant="caption" color="warning.dark">
        No photo sent
      </Typography>
    );
  }

  const tile = {
    width: size,
    height: size,
    borderRadius: 1.5,
    border: "1px solid",
    borderColor: "grey.300",
    backgroundColor: "grey.100",
  } as const;

  return (
    <>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {photos.map((p, i) =>
          isLink(p) ? (
            <Box
              key={`${p}${i}`}
              component="button"
              type="button"
              title={`Photo ${i + 1}`}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                setOpenAt(links.indexOf(p));
              }}
              sx={{ ...tile, p: 0, overflow: "hidden", display: "block", cursor: "zoom-in" }}
            >
              <SafeImage src={p} alt={`Photo ${i + 1}`} iconSize={Math.max(16, Math.round(size * 0.45))} />
            </Box>
          ) : (
            <Box
              key={`${p}${i}`}
              title={p}
              sx={{
                ...tile,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "text.secondary",
                gap: 0.25,
              }}
            >
              <IconCamera size={20} />
              <Typography variant="caption">Photo {i + 1}</Typography>
            </Box>
          ),
        )}
      </Stack>
      <PhotoViewer photos={links.map((src) => ({ src, name: fileNameOf(src) }))} index={openAt} onClose={() => setOpenAt(null)} />
    </>
  );
};

// An attached file: an image opens in the photo popup, anything else (PDF...) in a new tab.
export const FileLink: React.FC<{ url: string; name: string }> = ({ url, name }) => {
  const [open, setOpen] = useState(false);

  if (!isImageFile(name) && !isImageFile(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        {name}
      </a>
    );
  }

  return (
    <>
      <a
        href={url}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {name}
      </a>
      <PhotoViewer photos={[{ src: url, name: name || fileNameOf(url) }]} index={open ? 0 : null} onClose={() => setOpen(false)} />
    </>
  );
};
