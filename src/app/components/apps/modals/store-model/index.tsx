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
  onConfirm: (storeId: number) => void;
};

export default function StoreModal({ open, stores, onConfirm }: Props) {
  const [selected, setSelected] = useState<number | null>(null);

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
      <DialogTitle>Select Store</DialogTitle>

      <DialogContent>
        <RadioGroup
          value={selected}
          onChange={(e) => setSelected(Number(e.target.value))}
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

      <DialogActions>
        <Button
          variant="contained"
          fullWidth
          disabled={!selected}
          onClick={() => selected && onConfirm(selected)}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}
