"use client";
import React, { useState } from "react";
import { Alert, Box, Button, Chip, IconButton, MenuItem, Stack, Tooltip, Typography } from "@mui/material";
import { IconFileText, IconPlus, IconTrash } from "@tabler/icons-react";
import toast from "react-hot-toast";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import FormDrawer from "../../inventory-new/shared/FormDrawer";
import FormField from "../../inventory-new/shared/FormField";
import ConfirmDialog from "../../inventory-new/shared/ConfirmDialog";
import { DOCUMENT_KINDS, dueState, DUE_CHIP, formatDate, Vehicle, VehicleDocument } from "../types";
import { NewDocument } from "../useVehicles";
import { RecordTable, Section } from "./common";

const MAX_MB = 5;

interface DocumentsTabProps {
  vehicle: Vehicle;
  documents: VehicleDocument[];
  readOnly: boolean;
  onAdd: (doc: NewDocument) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
}

const empty = { kind: DOCUMENT_KINDS[0] as string, number: "", date: "", expires_on: "", note: "", file_name: "" };

const DocumentsTab: React.FC<DocumentsTabProps> = ({ vehicle, documents, readOnly, onAdd, onRemove }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [fileError, setFileError] = useState("");
  const [toRemove, setToRemove] = useState<VehicleDocument | null>(null);

  const has = (kind: string) => documents.some((d) => d.kind === kind);
  const missing = ["V5C registration certificate (logbook)", "Insurance certificate"].filter((k) => !has(k));
  const rows = [...documents].sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));

  const openAdd = (kind?: string) => {
    setForm({ ...empty, kind: kind ?? empty.kind });
    setFileError("");
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.file_name) {
      setFileError("Choose a photo or PDF.");
      return;
    }
    await onAdd({ ...form, vehicle_id: vehicle.id, number: form.number.trim(), note: form.note.trim() });
    toast.success(`${form.kind} added.`);
    setOpen(false);
  };

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {missing.length > 0 && !readOnly && (
        <Alert
          severity="warning"
          action={
            <Button color="inherit" size="small" onClick={() => openAdd(missing[0])}>
              Upload
            </Button>
          }
        >
          Missing: {missing.join(" and ")}. Upload them first.
        </Alert>
      )}
      <Section
        title="Documents"
        subtitle="Logbook, insurance, MOT certificates and lease papers for this vehicle."
        actions={
          !readOnly && (
            <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={() => openAdd()}>
              Upload document
            </Button>
          )
        }
      >
        <RecordTable
          rows={rows}
          empty="No documents yet."
          columns={[
            {
              header: "Document",
              render: (d) => (
                <Stack direction="row" spacing={1} alignItems="center">
                  <IconFileText size={18} />
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {d.kind}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {d.file_name}
                    </Typography>
                  </Box>
                </Stack>
              ),
            },
            { header: "Number", render: (d) => d.number || "-" },
            { header: "Dated", render: (d) => formatDate(d.date) },
            {
              header: "Expires",
              render: (d) => {
                if (!d.expires_on) return "-";
                const chip = DUE_CHIP[dueState(d.expires_on)];
                return (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <span>{formatDate(d.expires_on)}</span>
                    {chip.color !== "success" && <Chip size="small" color={chip.color} label={chip.label} />}
                  </Stack>
                );
              },
            },
            {
              header: "Uploaded",
              render: (d) => (
                <Typography variant="body2" color="textSecondary">
                  {formatDate(d.uploaded_at)} · {d.uploaded_by}
                </Typography>
              ),
            },
            {
              header: "",
              align: "right",
              render: (d) =>
                readOnly ? null : (
                  <Tooltip title="Remove">
                    <IconButton color="error" size="small" onClick={() => setToRemove(d)}>
                      <IconTrash size={16} />
                    </IconButton>
                  </Tooltip>
                ),
            },
          ]}
        />
      </Section>

      <FormDrawer
        open={open}
        title={`Upload document · ${vehicle.registration}`}
        onClose={() => setOpen(false)}
        onSubmit={submit}
        isSaving={false}
        submitLabel="Upload"
      >
        <FormField label="Document">
          <CustomTextField
            select
            value={form.kind}
            onChange={(e: any) => setForm((f) => ({ ...f, kind: e.target.value }))}
            fullWidth
            size="small"
          >
            {DOCUMENT_KINDS.map((k) => (
              <MenuItem key={k} value={k}>
                {k}
              </MenuItem>
            ))}
          </CustomTextField>
        </FormField>
        <FormField label="File *" hint={`Photo or PDF, up to ${MAX_MB} MB`}>
          <Button variant="outlined" component="label" fullWidth sx={{ justifyContent: "flex-start" }}>
            {form.file_name || "Choose file..."}
            <input
              hidden
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > MAX_MB * 1024 * 1024) {
                  setFileError(`The file is larger than ${MAX_MB} MB.`);
                  return;
                }
                setFileError("");
                setForm((f) => ({ ...f, file_name: file.name }));
              }}
            />
          </Button>
          {fileError && (
            <Typography variant="caption" color="error">
              {fileError}
            </Typography>
          )}
        </FormField>
        <FormField label="Document number" hint="Optional, e.g. policy number">
          <CustomTextField
            value={form.number}
            onChange={(e: any) => setForm((f) => ({ ...f, number: e.target.value.slice(0, 40) }))}
            fullWidth
          />
        </FormField>
        <Stack direction="row" spacing={2}>
          <Box flex={1}>
            <FormField label="Date on the document">
              <CustomTextField
                type="date"
                value={form.date}
                onChange={(e: any) => setForm((f) => ({ ...f, date: e.target.value }))}
                fullWidth
              />
            </FormField>
          </Box>
          <Box flex={1}>
            <FormField label="Expires on" hint="Optional">
              <CustomTextField
                type="date"
                value={form.expires_on}
                onChange={(e: any) => setForm((f) => ({ ...f, expires_on: e.target.value }))}
                fullWidth
              />
            </FormField>
          </Box>
        </Stack>
        <FormField label="Note" hint="Optional">
          <CustomTextField
            value={form.note}
            onChange={(e: any) => setForm((f) => ({ ...f, note: e.target.value.slice(0, 200) }))}
            fullWidth
          />
        </FormField>
      </FormDrawer>

      <ConfirmDialog
        open={!!toRemove}
        title="Remove document"
        message={toRemove ? `Remove ${toRemove.kind} (${toRemove.file_name})?` : ""}
        onClose={() => setToRemove(null)}
        onConfirm={async () => {
          if (!toRemove) return;
          await onRemove(toRemove.id);
          toast.success("Document removed.");
          setToRemove(null);
        }}
      />
    </Box>
  );
};

export default DocumentsTab;
