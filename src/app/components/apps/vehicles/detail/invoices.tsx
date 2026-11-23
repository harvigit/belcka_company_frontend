"use client";
import React, { useState } from "react";
import { Box, Button, Chip, Grid, Link, MenuItem, Stack, Typography } from "@mui/material";
import { IconFileText, IconPaperclip, IconPlus } from "@tabler/icons-react";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import FormDrawer from "../../inventory-new/shared/FormDrawer";
import FormField from "../../inventory-new/shared/FormField";
import { countsAsCost, EventKind, EVENT_KINDS, formatDate, INVOICE_KINDS, money, Vehicle, VehicleEvent } from "../types";
import { NewEvent } from "../useVehicles";
import { RecordTable, Section, StatTile } from "./common";

const MAX_MB = 5;

interface InvoicesTabProps {
  vehicle: Vehicle;
  events: VehicleEvent[];
  readOnly: boolean;
  onAdd: (event: NewEvent) => Promise<void>;
  onAttach: (eventId: number, file: File) => Promise<void>;
  onOpenTab: (tab: string) => void;
  // fuel, MOT, service, tyres and repairs open the record form on the vehicle page
}

const blank = () => ({
  kind: "repair" as EventKind,
  date: dayjs().format("YYYY-MM-DD"),
  supplier: "",
  invoice_no: "",
  cost: "",
  note: "",
  file_name: "",
  file: null as File | null,
});

// Picks a photo or PDF (uploaded with the cost, or straight away for "Attach").
const FilePicker: React.FC<{ label: string; onPick: (file: File) => void; onError: (msg: string) => void }> = ({
  label,
  onPick,
  onError,
}) => (
  <Button variant="outlined" component="label" size="small" startIcon={<IconPaperclip size={16} />}>
    {label}
    <input
      hidden
      type="file"
      accept="image/*,application/pdf"
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        if (file.size > MAX_MB * 1024 * 1024) return onError(`The file is larger than ${MAX_MB} MB.`);
        onPick(file);
      }}
    />
  </Button>
);

const InvoicesTab: React.FC<InvoicesTabProps> = ({ vehicle, events, readOnly, onAdd, onAttach, onOpenTab }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [showErrors, setShowErrors] = useState(false);

  const costs = events
    .filter(countsAsCost)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  const yearStart = dayjs().startOf("year").format("YYYY-MM-DD");
  const total = costs.reduce((s, e) => s + (e.cost ?? 0), 0);
  const thisYear = costs.filter((e) => e.date >= yearStart).reduce((s, e) => s + (e.cost ?? 0), 0);
  const withFile = costs.filter((e) => e.file_name).length;

  const errors = {
    cost: showErrors && !(Number(form.cost) > 0) ? "Enter the amount." : "",
    date: form.date > dayjs().format("YYYY-MM-DD") ? "The date can't be in the future." : "",
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    if (!(Number(form.cost) > 0) || !form.date || errors.date) {
      toast.error("Please check the highlighted fields.");
      return;
    }
    const fields = {
      kind: form.kind,
      date: form.date,
      cost: Number(form.cost),
      supplier: form.supplier.trim(),
      invoice_no: form.invoice_no.trim(),
      note: form.note.trim(),
    };
    try {
      await onAdd({ ...fields, vehicle_id: vehicle.id, mileage: null, file: form.file });
    } catch {
      return; // the API's message is already shown
    }
    toast.success(`${EVENT_KINDS[form.kind].label} invoice added.`);
    setOpen(false);
  };

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatTile tone="blue" label="All costs" value={money(total)} sub={`${costs.length} records`} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <StatTile tone="purple" label="This year" value={money(thisYear)} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <StatTile tone="green"
            label="With an invoice file"
            value={`${withFile} / ${costs.length}`}
            sub={costs.length > withFile ? "Attach the missing files below" : "All costs have a file"}
          />
        </Grid>
      </Grid>

      <Section
        title="Invoices and costs"
        subtitle="Every cost of this vehicle in one place, including fuel, MOT, service and tyres."
        actions={
          !readOnly && (
            <Button
              variant="contained"
              startIcon={<IconPlus size={16} />}
              onClick={() => {
                setForm(blank());
                setShowErrors(false);
                setOpen(true);
              }}
            >
              Upload invoice
            </Button>
          )
        }
      >
        <RecordTable
          rows={costs}
          empty="No costs recorded yet."
          columns={[
            { header: "Date", render: (e) => formatDate(e.date) },
            {
              header: "Type",
              render: (e) => (
                <Chip size="small" variant="outlined" color={EVENT_KINDS[e.kind].color} label={EVENT_KINDS[e.kind].label} />
              ),
            },
            { header: "Supplier", render: (e) => e.supplier || "-" },
            { header: "Invoice", render: (e) => e.invoice_no || "-" },
            {
              header: "Note",
              render: (e) => (
                <Typography variant="body2" sx={{ maxWidth: 240 }}>
                  {e.note || "-"}
                </Typography>
              ),
            },
            {
              header: "File",
              render: (e) =>
                e.file_name ? (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <IconFileText size={16} />
                    <Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>
                      {e.file_url ? (
                        <a href={e.file_url} target="_blank" rel="noopener noreferrer">
                          {e.file_name}
                        </a>
                      ) : (
                        e.file_name
                      )}
                    </Typography>
                  </Stack>
                ) : readOnly ? (
                  "-"
                ) : (
                  <FilePicker
                    label="Attach"
                    onError={(msg) => toast.error(msg)}
                    onPick={async (file) => {
                      try {
                        await onAttach(e.id, file);
                      } catch {
                        return; // the API's message is already shown
                      }
                      toast.success("File attached.");
                    }}
                  />
                ),
            },
            { header: "Amount", align: "right", render: (e) => <b>{money(e.cost)}</b> },
          ]}
        />
      </Section>

      <FormDrawer
        open={open}
        title={`Upload invoice · ${vehicle.registration}`}
        onClose={() => setOpen(false)}
        onSubmit={submit}
        isSaving={false}
        submitLabel="Save invoice"
      >
        <Typography variant="body2" color="textSecondary">
          For fuel, MOT, service and tyres use their own tabs, because they also update the mileage and due dates.{" "}
          <Link
            component="button"
            type="button"
            variant="body2"
            onClick={() => {
              setOpen(false);
              onOpenTab("maintenance");
            }}
          >
            Go to MOT &amp; Service
          </Link>
        </Typography>
        <Stack direction="row" spacing={2}>
          <Box flex={1}>
            <FormField label="Type">
              <CustomTextField
                select
                size="small"
                fullWidth
                value={form.kind}
                onChange={(e: any) => setForm((f) => ({ ...f, kind: e.target.value }))}
              >
                {INVOICE_KINDS.map((k) => (
                  <MenuItem key={k} value={k}>
                    {EVENT_KINDS[k].label}
                  </MenuItem>
                ))}
              </CustomTextField>
            </FormField>
          </Box>
          <Box flex={1}>
            <FormField label="Date *">
              <CustomTextField
                type="date"
                fullWidth
                value={form.date}
                onChange={(e: any) => setForm((f) => ({ ...f, date: e.target.value }))}
                error={!!errors.date}
                helperText={errors.date}
              />
            </FormField>
          </Box>
        </Stack>
        <Stack direction="row" spacing={2}>
          <Box flex={1}>
            <FormField label="Supplier">
              <CustomTextField
                fullWidth
                value={form.supplier}
                onChange={(e: any) => setForm((f) => ({ ...f, supplier: e.target.value.slice(0, 80) }))}
              />
            </FormField>
          </Box>
          <Box flex={1}>
            <FormField label="Invoice number">
              <CustomTextField
                fullWidth
                value={form.invoice_no}
                onChange={(e: any) => setForm((f) => ({ ...f, invoice_no: e.target.value.slice(0, 40) }))}
              />
            </FormField>
          </Box>
        </Stack>
        <FormField label="Amount incl. VAT (£) *">
          <CustomTextField
            fullWidth
            value={form.cost}
            onChange={(e: any) => /^\d{0,7}(\.\d{0,2})?$/.test(e.target.value) && setForm((f) => ({ ...f, cost: e.target.value }))}
            error={!!errors.cost}
            helperText={errors.cost}
            slotProps={{ htmlInput: { inputMode: "decimal" } }}
          />
        </FormField>
        <FormField label="Note">
          <CustomTextField
            fullWidth
            multiline
            minRows={2}
            value={form.note}
            onChange={(e: any) => setForm((f) => ({ ...f, note: e.target.value.slice(0, 300) }))}
          />
        </FormField>
        <FormField label="Invoice file" hint={`Photo or PDF, up to ${MAX_MB} MB`}>
          <Stack direction="row" spacing={1} alignItems="center">
            <FilePicker
              label={form.file_name ? "Change file" : "Choose file"}
              onError={(msg) => toast.error(msg)}
              onPick={(file) => setForm((f) => ({ ...f, file_name: file.name, file }))}
            />
            {form.file_name && (
              <Typography variant="body2" noWrap>
                {form.file_name}
              </Typography>
            )}
          </Stack>
        </FormField>
      </FormDrawer>
    </Box>
  );
};

export default InvoicesTab;
