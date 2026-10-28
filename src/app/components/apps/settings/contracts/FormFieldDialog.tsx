"use client";

import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { buildFormToken, FORM_FIELD_TYPES, toFormKey } from "./contracts-api";
import type { ContractFormField, ContractFormFieldType } from "./contracts-api";

interface Props {
  open: boolean;
  /** Keys already used in the wording, so a new field doesn't clash. */
  usedKeys: string[];
  onClose: () => void;
  onInsert: (token: string) => void;
}

/** Builds a {{form:...}} field: an input the user fills in on the sign screen. */
const FormFieldDialog = ({ open, usedKeys, onClose, onInsert }: Props) => {
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [type, setType] = useState<ContractFormFieldType>("text");
  const [options, setOptions] = useState("");
  const [required, setRequired] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLabel("");
    setKey("");
    setKeyTouched(false);
    setType("text");
    setOptions("");
    setRequired(false);
  }, [open]);

  const optionList = options
    .split("\n")
    .map((o) => o.trim())
    .filter(Boolean);

  const keyError = !key
    ? "Required"
    : !/^[a-z][a-z0-9_]{0,59}$/.test(key)
      ? "Lowercase letters, numbers and _ only, starting with a letter"
      : usedKeys.includes(key)
        ? "Already used in this contract"
        : "";
  const optionsError = type === "select" && optionList.length < 2 ? "Add at least two options" : "";
  const canInsert = label.trim() && !keyError && !optionsError;

  const insert = () => {
    const field: ContractFormField = { key, type, label: label.trim(), options: optionList, required };
    onInsert(buildFormToken(field));
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add a form field</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="textSecondary">
            The user fills this in on the sign screen. Their answer is printed in the signed contract and saved
            with it.
          </Typography>
          <TextField
            label="Question / label"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              if (!keyTouched) setKey(toFormKey(e.target.value));
            }}
            placeholder="e.g. CSCS card expiry date"
            fullWidth
            required
            autoFocus
            inputProps={{ maxLength: 190 }}
          />
          <TextField select label="Answer type" value={type} onChange={(e) => setType(e.target.value as ContractFormFieldType)}>
            {FORM_FIELD_TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </TextField>
          {type === "select" && (
            <TextField
              label="Options (one per line)"
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              multiline
              minRows={4}
              error={Boolean(options) && Boolean(optionsError)}
              helperText={optionsError || `${optionList.length} options`}
            />
          )}
          <TextField
            label="Key"
            value={key}
            onChange={(e) => {
              setKey(e.target.value.trim());
              setKeyTouched(true);
            }}
            error={Boolean(label) && Boolean(keyError)}
            helperText={keyError || "Saved answers are stored under this name. Don’t change it after publishing."}
            size="small"
          />
          <FormControlLabel
            control={<Checkbox checked={required} onChange={(e) => setRequired(e.target.checked)} />}
            label={type === "checkbox" ? "Must be ticked to sign" : "Required to sign"}
          />
          {canInsert && (
            <Alert severity="info" icon={false} sx={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all" }}>
              {buildFormToken({ key, type, label: label.trim(), options: optionList, required })}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!canInsert} onClick={insert}>
          Insert
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FormFieldDialog;
