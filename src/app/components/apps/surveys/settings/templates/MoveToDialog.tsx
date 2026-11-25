"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, List, ListItemButton, ListItemIcon, ListItemText, Radio, TextField, Typography } from "@mui/material";
import { IconDoor, IconFolder, IconSearch } from "@tabler/icons-react";
import { allPlaces } from "./MultiAddDialog";
import { TemplateDetail, TplNode, pathOf } from "./types";

/** "Move to…": pick the area or group that the selected elements / group go into. */
const MoveToDialog: React.FC<{
  open: boolean;
  template: TemplateDetail;
  label: string;
  /** Groups being moved: they and their sub-groups cannot be the target. */
  groupIds: number[];
  onClose: () => void;
  onMove: (targetId: number) => Promise<unknown>;
}> = ({ open, template, label, groupIds, onClose, onMove }) => {
  const [target, setTarget] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setTarget(null);
      setQ("");
    }
  }, [open]);

  const blocked = useMemo(() => {
    const out = new Set<number>();
    const add = (n: TplNode) => {
      out.add(n.id);
      n.children.forEach(add);
    };
    groupIds.forEach((g) => {
      const n = pathOf(template.rooms, g).slice(-1)[0];
      if (n) add(n);
    });
    return out;
  }, [template, groupIds]);
  const places = allPlaces(template.rooms).filter((p) => !blocked.has(p.id) && (!q.trim() || p.label.toLowerCase().includes(q.trim().toLowerCase())));

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle component="div">
        <Typography variant="h5">Move {label}</Typography>
        <Typography variant="body2" color="textSecondary">Choose the area or group to move it to.</Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <Box sx={{ p: 2, pb: 1 }}>
          <TextField
            size="small"
            fullWidth
            autoFocus
            placeholder="Search areas and groups..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            slotProps={{ input: { endAdornment: <InputAdornment position="end"><IconSearch size={16} /></InputAdornment> } }}
          />
        </Box>
        <List dense sx={{ maxHeight: 420, overflowY: "auto", pb: 1 }}>
          {places.map((p) => (
            <ListItemButton key={p.id} selected={target === p.id} onClick={() => setTarget(p.id)} sx={{ pl: 2 + (q.trim() ? 0 : p.depth * 2.5) }}>
              <Radio size="small" checked={target === p.id} sx={{ p: 0.5, mr: 0.5 }} />
              <ListItemIcon sx={{ minWidth: 28 }}>{p.kind === "room" ? <IconDoor size={17} /> : <IconFolder size={17} color="#7D92A9" />}</ListItemIcon>
              <ListItemText primary={q.trim() ? p.label : p.label.split(" › ").slice(-1)[0]} slotProps={{ primary: { fontWeight: p.kind === "room" ? 600 : 400, className: "f-14" } }} />
            </ListItemButton>
          ))}
          {!places.length && <Typography className="f-14" color="textSecondary" sx={{ px: 2, py: 2 }}>No area or group matches.</Typography>}
        </List>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button color="inherit" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!target || busy}
          onClick={async () => {
            if (!target) return;
            setBusy(true);
            await onMove(target);
            setBusy(false);
          }}
        >
          Move here
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MoveToDialog;
