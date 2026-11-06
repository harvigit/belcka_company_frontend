"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import { IconSearch } from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { Survey } from "../types";

interface LibraryElement {
  id: number;
  name: string;
  output_name?: string | null;
  output_unit?: string | null;
}

interface RoomType {
  id: number;
  name: string;
  status: boolean;
  elements: (LibraryElement & { is_available?: boolean })[];
}

// "Area · m²" style hint shown under an element's name.
const unitHint = (el: LibraryElement) =>
  [el.output_name, el.output_unit].filter(Boolean).join(" · ");

// Published, active library elements and the company's room types, loaded once per dialog opening.
function useLibrary(open: boolean) {
  const [elements, setElements] = useState<LibraryElement[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      api.get("/survey-elements/get?publish_status=published"),
      api.get("/survey-groups/get"),
    ])
      .then(([resElements, resGroups]) => {
        if (cancelled) return;
        if (resElements.status === "fulfilled") {
          setElements(
            (resElements.value.data?.info || []).filter(
              (el: any) => el.status !== false,
            ),
          );
        }
        if (resGroups.status === "fulfilled") {
          setRoomTypes(
            (resGroups.value.data?.info || []).filter(
              (g: RoomType) => g.status,
            ),
          );
        }
        if (resElements.status === "rejected")
          toast.error("Couldn't load the element library.");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open]);

  return { elements, roomTypes, loading };
}

function ElementRow({
  el,
  checked,
  inRoom,
  onToggle,
}: {
  el: LibraryElement;
  checked: boolean;
  inRoom?: boolean;
  onToggle: () => void;
}) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      onClick={inRoom ? undefined : onToggle}
      sx={{
        px: 1,
        py: 0.75,
        borderRadius: "6px",
        cursor: inRoom ? "default" : "pointer",
        "&:hover": { bgcolor: inRoom ? "transparent" : "grey.50" },
      }}
    >
      <Box minWidth={0}>
        <Typography
          variant="body2"
          fontWeight={600}
          color={inRoom ? "text.secondary" : "text.primary"}
        >
          {el.name}
        </Typography>
        {unitHint(el) && (
          <Typography variant="caption" color="text.secondary">
            {unitHint(el)}
          </Typography>
        )}
      </Box>
      {inRoom ? (
        <Chip
          size="small"
          variant="outlined"
          label="In room"
          sx={{ height: 22, fontSize: "0.7rem" }}
        />
      ) : (
        <Checkbox size="small" checked={checked} sx={{ p: 0.5 }} />
      )}
    </Stack>
  );
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <Typography
    variant="caption"
    fontWeight={700}
    color="text.secondary"
    textTransform="uppercase"
    display="block"
    sx={{ mt: 1.5, mb: 0.5, px: 1, letterSpacing: "0.04em" }}
  >
    {children}
  </Typography>
);

interface DialogProps {
  open: boolean;
  survey: Survey;
  onClose: () => void;
  onAdded: () => Promise<void> | void;
}

/** Adds library elements to a room of the survey during the inspection. */
export function AddElementDialog({
  open,
  survey,
  defaultRoomId,
  onClose,
  onAdded,
}: DialogProps & { defaultRoomId?: string | number | null }) {
  const { elements, roomTypes, loading } = useLibrary(open);
  const [roomId, setRoomId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRoomId(String(defaultRoomId ?? survey.rooms[0]?.id ?? ""));
    setSearch("");
    setSelected([]);
  }, [open, defaultRoomId, survey.rooms]);

  const room = survey.rooms.find((r) => String(r.id) === roomId);
  const inRoom = useMemo(
    () => new Set((room?.items || []).map((i) => Number(i.element_id))),
    [room],
  );
  const suggestedIds = useMemo(() => {
    const type = roomTypes.find((t) => t.id === room?.group_id);
    return new Set((type?.elements || []).map((e) => e.id));
  }, [roomTypes, room]);

  const term = search.trim().toLowerCase();
  const matches = elements.filter(
    (el) => !term || el.name.toLowerCase().includes(term),
  );
  const suggested = matches.filter((el) => suggestedIds.has(el.id));
  const others = matches.filter((el) => !suggestedIds.has(el.id));

  const toggle = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handleSubmit = async () => {
    if (!room || !selected.length) return;
    setSaving(true);
    try {
      const res = await api.post(`surveys/${survey.id}/items`, {
        room_id: Number(room.id),
        element_ids: selected,
      });
      if (res.data?.IsSuccess) {
        toast.success(
          `${res.data.info?.items?.length ?? selected.length} element(s) added to ${room.name}`,
        );
        await onAdded();
        onClose();
      } else {
        toast.error(res.data?.message || "Failed to add elements");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to add elements");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ pb: 0.5 }}>
        Add element
        <Typography variant="body2" color="text.secondary">
          Choose the room, then pick from the element library.
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <CustomTextField
          select
          size="small"
          fullWidth
          label="Room"
          value={roomId}
          onChange={(e: any) => {
            setRoomId(e.target.value);
            setSelected([]);
          }}
          sx={{ mb: 1.5 }}
        >
          {survey.rooms.map((r) => (
            <MenuItem key={r.id} value={String(r.id)}>
              {r.name}
            </MenuItem>
          ))}
        </CustomTextField>
        <CustomTextField
          size="small"
          fullWidth
          placeholder="Search elements"
          value={search}
          onChange={(e: any) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconSearch size={16} />
              </InputAdornment>
            ),
          }}
        />
        {loading ? (
          <Box py={4} textAlign="center">
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Box sx={{ maxHeight: 380, overflowY: "auto", mt: 0.5 }}>
            {suggested.length > 0 && (
              <>
                <SectionLabel>Suggested for {room?.name}</SectionLabel>
                {suggested.map((el) => (
                  <ElementRow
                    key={el.id}
                    el={el}
                    checked={selected.includes(el.id)}
                    inRoom={inRoom.has(el.id)}
                    onToggle={() => toggle(el.id)}
                  />
                ))}
              </>
            )}
            {others.length > 0 && (
              <>
                <SectionLabel>
                  {suggested.length ? "All elements" : "Element library"}
                </SectionLabel>
                {others.map((el) => (
                  <ElementRow
                    key={el.id}
                    el={el}
                    checked={selected.includes(el.id)}
                    inRoom={inRoom.has(el.id)}
                    onToggle={() => toggle(el.id)}
                  />
                ))}
              </>
            )}
            {!matches.length && (
              <Typography
                variant="body2"
                color="text.secondary"
                textAlign="center"
                py={3}
              >
                No elements match your search.
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || !room || !selected.length}
          startIcon={
            saving ? <CircularProgress size={14} color="inherit" /> : undefined
          }
        >
          {selected.length
            ? `Add ${selected.length} element${selected.length === 1 ? "" : "s"} to ${room?.name ?? "room"}`
            : "Add elements"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// "Bedroom" becomes "Bedroom 2" when the survey already has a room of that name.
const nextRoomName = (base: string, taken: string[]) => {
  const names = new Set(taken.map((n) => n.trim().toLowerCase()));
  if (!names.has(base.trim().toLowerCase())) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base} ${n}`;
    if (!names.has(candidate.toLowerCase())) return candidate;
  }
};

/** Adds a room, with the room type's default elements, to the survey during the inspection. */
export function AddRoomDialog({ open, survey, onClose, onAdded }: DialogProps) {
  const { roomTypes, loading } = useLibrary(open);
  const [typeId, setTypeId] = useState<string>("");
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTypeId("");
    setName("");
    setSelected([]);
  }, [open]);

  const roomType = roomTypes.find((t) => String(t.id) === typeId);
  const typeElements = (roomType?.elements || []).filter(
    (el) => el.is_available !== false,
  );

  const handleTypeChange = (value: string) => {
    setTypeId(value);
    const type = roomTypes.find((t) => String(t.id) === value);
    setName(
      type
        ? nextRoomName(
            type.name,
            survey.rooms.map((r) => r.name),
          )
        : "",
    );
    setSelected(
      (type?.elements || [])
        .filter((el) => el.is_available !== false)
        .map((el) => el.id),
    );
  };

  const toggle = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await api.post(`surveys/${survey.id}/rooms`, {
        ...(roomType && { group_id: roomType.id }),
        name: name.trim(),
        element_ids: selected,
      });
      if (res.data?.IsSuccess) {
        toast.success(`${res.data.info?.name ?? name.trim()} added`);
        await onAdded();
        onClose();
      } else {
        toast.error(res.data?.message || "Failed to add room");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to add room");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ pb: 0.5 }}>
        Add room
        <Typography variant="body2" color="text.secondary">
          Choose a room type; its default elements are added with it.
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box py={4} textAlign="center">
            <CircularProgress size={24} />
          </Box>
        ) : (
          <>
            <CustomTextField
              select
              size="small"
              fullWidth
              label="Room type"
              value={typeId}
              onChange={(e: any) => handleTypeChange(e.target.value)}
              sx={{ mb: 1.5 }}
            >
              <MenuItem value="">
                <em>Custom room (no default elements)</em>
              </MenuItem>
              {roomTypes.map((t) => (
                <MenuItem key={t.id} value={String(t.id)}>
                  {t.name}
                </MenuItem>
              ))}
            </CustomTextField>
            <CustomTextField
              size="small"
              fullWidth
              label="Room name"
              value={name}
              onChange={(e: any) => setName(e.target.value)}
              inputProps={{ maxLength: 191 }}
            />
            {roomType && (
              <>
                <SectionLabel>Elements added with this room</SectionLabel>
                {typeElements.length ? (
                  typeElements.map((el) => (
                    <ElementRow
                      key={el.id}
                      el={el}
                      checked={selected.includes(el.id)}
                      onToggle={() => toggle(el.id)}
                    />
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary" px={1}>
                    This room type has no published elements.
                  </Typography>
                )}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  px={1}
                  mt={1}
                >
                  Untick anything that isn&apos;t in the room. More can be added
                  later with Add element.
                </Typography>
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || loading || !name.trim()}
          startIcon={
            saving ? <CircularProgress size={14} color="inherit" /> : undefined
          }
        >
          {name.trim()
            ? `Add ${name.trim()}${selected.length ? ` with ${selected.length} element${selected.length === 1 ? "" : "s"}` : ""}`
            : "Add room"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
