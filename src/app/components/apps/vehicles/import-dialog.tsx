"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from "@mui/material";
import { IconFileUpload, IconFileText } from "@tabler/icons-react";
import toast from "react-hot-toast";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import FormField from "../inventory-new/shared/FormField";
import { parseCsv } from "./csv";
import { RecordTable } from "./detail/common";
import { RegPlate } from "./shared";
import { Connection, formatDate, money, Vehicle } from "./types";

export type PreviewStatus = "ready" | "unknown" | "unlinked_card" | "duplicate" | "invalid";

export interface PreviewRow {
  key: string;
  date: string;
  registration: string;
  amount: number;
  litres?: number;
  odometer?: number | null;
  card?: string;
  place?: string;
  reference?: string;
  vehicleId: number | null;
  status: PreviewStatus;
  reason?: string;
}

const STATUS: Record<PreviewStatus, { label: string; color: "success" | "warning" | "default" | "error" }> = {
  ready: { label: "Ready", color: "success" },
  unknown: { label: "Choose vehicle", color: "warning" },
  unlinked_card: { label: "Choose vehicle", color: "warning" },
  duplicate: { label: "Already imported", color: "default" },
  invalid: { label: "Can't read", color: "error" },
};

interface ImportDialogProps {
  open: boolean;
  title: string;
  // shown before the file is chosen
  columnsHint: string;
  sources: Connection[];
  vehicles: Vehicle[];
  sampleCsv: (source: Connection) => string;
  buildPreview: (rows: Record<string, string>[], source: Connection) => PreviewRow[];
  onApply: (source: Connection, fileName: string, rows: PreviewRow[], skipped: PreviewRow[]) => Promise<void>;
  onClose: () => void;
  onGoToConnections: () => void;
}

// Two steps: choose source and file, then review every row before saving.
const ImportDialog: React.FC<ImportDialogProps> = ({
  open,
  title,
  columnsHint,
  sources,
  vehicles,
  sampleCsv,
  buildPreview,
  onApply,
  onClose,
  onGoToConnections,
}) => {
  const [sourceId, setSourceId] = useState("");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSourceId(sources[0]?.id ?? "");
      setFileName("");
      setRows(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const source = sources.find((s) => s.id === sourceId);

  const load = (text: string, name: string) => {
    if (!source) return;
    const parsed = parseCsv(text);
    if (!parsed.length) {
      toast.error("No rows found. Use a CSV file with a header row.");
      return;
    }
    setFileName(name);
    setRows(buildPreview(parsed, source));
  };

  const counts = useMemo(() => {
    const r = rows ?? [];
    const willImport = r.filter((x) => x.vehicleId && (x.status === "ready" || x.status === "unknown" || x.status === "unlinked_card"));
    return {
      import: willImport,
      needVehicle: r.filter((x) => (x.status === "unknown" || x.status === "unlinked_card") && !x.vehicleId).length,
      duplicate: r.filter((x) => x.status === "duplicate").length,
      invalid: r.filter((x) => x.status === "invalid").length,
    };
  }, [rows]);

  const total = counts.import.reduce((s, r) => s + r.amount, 0);
  const isFuel = source?.target === "fuel";

  const apply = async () => {
    if (!source || !rows) return;
    setSaving(true);
    try {
      const skipped = rows.filter((x) => (x.status === "unknown" || x.status === "unlinked_card") && !x.vehicleId);
      await onApply(source, fileName, counts.import, skipped);
      onClose();
    } catch {
      // API error already shown
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth={rows ? "lg" : "sm"}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stepper activeStep={rows ? 1 : 0} sx={{ mb: 3 }}>
          <Step>
            <StepLabel>Choose file</StepLabel>
          </Step>
          <Step>
            <StepLabel>Check rows</StepLabel>
          </Step>
        </Stepper>

        {!rows && (
          <Stack spacing={2}>
            {sources.length === 0 ? (
              <Alert
                severity="warning"
                action={
                  <Button color="inherit" size="small" onClick={onGoToConnections}>
                    Connections
                  </Button>
                }
              >
                No service is connected yet. Connect one in Settings first.
              </Alert>
            ) : (
              <>
                <FormField label="From">
                  <CustomTextField select size="small" fullWidth value={sourceId} onChange={(e: any) => setSourceId(e.target.value)}>
                    {sources.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.name}
                        {s.account ? ` · ${s.account}` : ""}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                </FormField>
                <Alert severity="info">{columnsHint}</Alert>
                <Paper
                  variant="outlined"
                  sx={{ p: 3, borderRadius: 2, borderStyle: "dashed", textAlign: "center" }}
                >
                  <IconFileUpload size={32} />
                  <Typography mt={1} mb={2} color="textSecondary">
                    CSV file exported from {source?.name ?? "the service"}
                  </Typography>
                  <Stack direction="row" spacing={1} justifyContent="center">
                    <Button variant="contained" component="label" startIcon={<IconFileText size={16} />}>
                      Choose file
                      <input
                        hidden
                        type="file"
                        accept=".csv,text/csv"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) {
                            toast.error("The file is larger than 2 MB.");
                            return;
                          }
                          file.text().then((text) => load(text, file.name));
                        }}
                      />
                    </Button>
                    {source && (
                      <Button variant="outlined" onClick={() => load(sampleCsv(source), `sample-${source.id}.csv`)}>
                        Use a sample file
                      </Button>
                    )}
                  </Stack>
                </Paper>
              </>
            )}
          </Stack>
        )}

        {rows && (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
              <Typography variant="body2" color="textSecondary" mr={1}>
                {`${fileName} · ${rows.length} ${rows.length === 1 ? "row" : "rows"} in the file`}
              </Typography>
              <Chip size="small" color="success" label={`${counts.import.length} to import`} />
              {counts.needVehicle > 0 && <Chip size="small" color="warning" label={`${counts.needVehicle} need a vehicle`} />}
              {counts.duplicate > 0 && <Chip size="small" label={`${counts.duplicate} already imported`} />}
              {counts.invalid > 0 && <Chip size="small" color="error" label={`${counts.invalid} can't be read`} />}
            </Stack>
            {counts.needVehicle > 0 && (
              <Alert severity="warning">
                Choose the vehicle for the yellow rows, or leave them empty: they are skipped and listed under Conflicts so nothing is lost.
              </Alert>
            )}
            <Box sx={{ maxHeight: "50vh", overflow: "auto" }}>
              <RecordTable<PreviewRow & { id: string }>
                rows={rows.map((r) => ({ ...r, id: r.key }))}
                empty="No rows."
                columns={[
                  { header: "Date", render: (r) => (r.date ? formatDate(r.date) : "-") },
                  ...(isFuel
                    ? [
                        { header: "Card", render: (r: PreviewRow) => (r.card ? `•••• ${r.card}` : "-") },
                        { header: "Litres", render: (r: PreviewRow) => (r.litres ? `${r.litres.toFixed(1)} L` : "-") },
                      ]
                    : [{ header: "Place / reference", render: (r: PreviewRow) => [r.place, r.reference].filter(Boolean).join(" · ") || "-" }]),
                  { header: "Registration in file", render: (r) => r.registration || "-" },
                  {
                    header: "Vehicle",
                    render: (r) =>
                      r.status === "unknown" || r.status === "unlinked_card" ? (
                        <CustomTextField
                          select
                          size="small"
                          value={r.vehicleId ?? ""}
                          onChange={(e: any) =>
                            setRows((list) =>
                              (list ?? []).map((x) => (x.key === r.key ? { ...x, vehicleId: e.target.value ? Number(e.target.value) : null } : x)),
                            )
                          }
                          sx={{ minWidth: 170 }}
                          slotProps={{ select: { displayEmpty: true } }}
                        >
                          <MenuItem value="">Skip (add to conflicts)</MenuItem>
                          {vehicles.map((v) => (
                            <MenuItem key={v.id} value={v.id}>
                              {v.registration}
                            </MenuItem>
                          ))}
                        </CustomTextField>
                      ) : r.vehicleId ? (
                        <RegPlate registration={vehicles.find((v) => v.id === r.vehicleId)?.registration ?? "-"} />
                      ) : (
                        "-"
                      ),
                  },
                  {
                    header: "Status",
                    render: (r) => {
                      const s = r.vehicleId && (r.status === "unknown" || r.status === "unlinked_card") ? STATUS.ready : STATUS[r.status];
                      return (
                        <Box>
                          <Chip size="small" color={s.color} label={s.label} />
                          {r.reason && (
                            <Typography variant="caption" color="textSecondary" display="block">
                              {r.reason}
                            </Typography>
                          )}
                        </Box>
                      );
                    },
                  },
                  { header: "Amount", align: "right", render: (r) => (Number.isFinite(r.amount) ? money(r.amount) : "-") },
                ]}
              />
            </Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {rows ? (
          <>
            <Button onClick={() => setRows(null)} sx={{ mr: "auto" }}>
              Back
            </Button>
            <Button variant="outlined" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="contained" disabled={saving || (!counts.import.length && !counts.needVehicle)} onClick={apply}>
              {counts.import.length
                ? `Import ${counts.import.length} row${counts.import.length > 1 ? "s" : ""} · ${money(total)}`
                : "Save conflicts only"}
            </Button>
          </>
        ) : (
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ImportDialog;
