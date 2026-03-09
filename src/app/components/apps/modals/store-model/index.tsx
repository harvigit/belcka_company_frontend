"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
} from "@mui/material";
import { useState } from "react";

type Store = {
  id: number;
  name: string;
};

type Props = {
  open: boolean;
  stores: Store[];
  onConfirm: (store: Store) => void;
};

export default function StoreModal({ open, stores, onConfirm }: Props) {
  const [selected, setSelected] = useState<Store | null>(null);

  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth="sm"
      disableEscapeKeyDown
      onClose={(event, reason) => {
        if (reason === "backdropClick" || reason === "escapeKeyDown") return;
      }}
    >
      <DialogTitle variant="h1">Select Store</DialogTitle>

      <DialogContent>
        <RadioGroup
          value={selected?.id || ""}
          onChange={(e) => {
            const store = stores.find((s) => s.id === Number(e.target.value));
            if (store) setSelected(store);
          }}
        >
          {stores.map((store) => (
            <FormControlLabel
              key={store.id}
              value={store.id}
              control={<Radio />}
              label={store.name}
            />
          ))}
        </RadioGroup>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button
          fullWidth
          variant="contained"
          disabled={!selected}
          onClick={() => selected && onConfirm(selected)}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}
