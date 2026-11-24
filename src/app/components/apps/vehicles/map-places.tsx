"use client";
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  ButtonBase,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import {
  IconAlertTriangle,
  IconBuilding,
  IconBuildingWarehouse,
  IconCamera,
  IconFirstAidKit,
  IconGasStation,
  IconHelmet,
  IconMapPin,
  IconParking,
  IconTool,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import FormField from "../inventory-new/shared/FormField";
import { FleetPlace, PLACE_KIND, PlaceKind } from "./types";

export const PLACE_ICON: Record<PlaceKind, React.ElementType> = {
  office: IconBuilding,
  depot: IconBuildingWarehouse,
  site: IconHelmet,
  fuel: IconGasStation,
  garage: IconTool,
  parking: IconParking,
  hospital: IconFirstAidKit,
  photo: IconCamera,
  accident: IconAlertTriangle,
  other: IconMapPin,
};

/** Square badge, so places differ from the round driver pins. */
export const PlaceBadge: React.FC<{ kind: PlaceKind; size?: number }> = ({ kind, size = 28 }) => {
  const Icon = PLACE_ICON[kind];
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: `${Math.round(size * 0.28)}px`,
        backgroundColor: PLACE_KIND[kind].color,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon size={Math.round(size * 0.6)} stroke={2} />
    </Box>
  );
};

export const PlacePin: React.FC<{ place: FleetPlace; active: boolean; onClick: () => void }> = ({ place, active, onClick }) => (
  <Box sx={{ position: "relative", pb: "6px", transform: active ? "scale(1.15)" : undefined, transformOrigin: "bottom center" }}>
    <ButtonBase
      onClick={onClick}
      title={`${PLACE_KIND[place.kind].label} · ${place.name}`}
      sx={{ borderRadius: "9px", border: "2px solid #fff", boxShadow: active ? 4 : 2 }}
    >
      <PlaceBadge kind={place.kind} size={30} />
    </ButtonBase>
    <Box
      sx={{
        position: "absolute",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: 0,
        height: 0,
        borderLeft: "5px solid transparent",
        borderRight: "5px solid transparent",
        borderTop: `7px solid ${PLACE_KIND[place.kind].color}`,
      }}
    />
  </Box>
);

export type PlaceDraft = { lat: number; lng: number; address: string };

export const PlaceDialog: React.FC<{
  draft: PlaceDraft | null;
  onClose: () => void;
  onSave: (place: Omit<FleetPlace, "id" | "created_by" | "created_at">) => Promise<void>;
}> = ({ draft, onClose, onSave }) => {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<PlaceKind>("office");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!draft) return;
    setName("");
    setKind("office");
    setAddress(draft.address);
    setNote("");
    setTried(false);
  }, [draft]);

  if (!draft) return null;

  const save = async () => {
    setTried(true);
    if (!name.trim()) {
      toast.error("Enter a name for the place.");
      return;
    }
    await onSave({ name: name.trim(), kind, address: address.trim(), lat: draft.lat, lng: draft.lng, note: note.trim() });
    toast.success(`${name.trim()} added to the map.`);
    onClose();
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add place</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <FormField label="Icon">
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(5, 1fr)" }, gap: 1 }}>
              {(Object.keys(PLACE_KIND) as PlaceKind[]).map((k) => {
                const active = kind === k;
                return (
                  <ButtonBase
                    key={k}
                    onClick={() => setKind(k)}
                    title={PLACE_KIND[k].hint}
                    aria-pressed={active}
                    sx={{
                      flexDirection: "column",
                      gap: 0.5,
                      p: 1,
                      borderRadius: 2,
                      border: "2px solid",
                      borderColor: active ? PLACE_KIND[k].color : "divider",
                      backgroundColor: active ? "action.selected" : "transparent",
                    }}
                  >
                    <PlaceBadge kind={k} size={30} />
                    <Typography variant="caption" fontWeight={active ? 700 : 500} textAlign="center" lineHeight={1.2}>
                      {PLACE_KIND[k].label}
                    </Typography>
                  </ButtonBase>
                );
              })}
            </Box>
          </FormField>
          <FormField label="Name *">
            <CustomTextField
              autoFocus
              fullWidth
              value={name}
              placeholder={`e.g. ${kind === "hospital" ? "North Middlesex Hospital (A&E)" : kind === "fuel" ? "Shell Holloway Road" : "Head office"}`}
              onChange={(e: any) => setName(e.target.value.slice(0, 80))}
              error={tried && !name.trim()}
              helperText={tried && !name.trim() ? "Enter a name." : undefined}
            />
          </FormField>
          <FormField label="Address" hint={`Position: ${draft.lat.toFixed(5)}, ${draft.lng.toFixed(5)}`}>
            <CustomTextField fullWidth value={address} onChange={(e: any) => setAddress(e.target.value.slice(0, 160))} />
          </FormField>
          <FormField label="Note">
            <CustomTextField
              fullWidth
              value={note}
              placeholder="e.g. opening hours, gate code, fuel card accepted"
              onChange={(e: any) => setNote(e.target.value.slice(0, 160))}
            />
          </FormField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" onClick={save}>
          Add place
        </Button>
      </DialogActions>
    </Dialog>
  );
};
