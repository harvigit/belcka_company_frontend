"use client";
import React, { useState } from "react";
import { Alert, Box, Button, Chip, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { IconCheck, IconPlus, IconTrash, IconX } from "@tabler/icons-react";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import FormDrawer from "../../inventory-new/shared/FormDrawer";
import FormField from "../../inventory-new/shared/FormField";
import ConfirmDialog from "../../inventory-new/shared/ConfirmDialog";
import { formatDate, ParkingPermit, PERMIT_STATE, permitState, Vehicle } from "../types";
import { NewPermit } from "../useVehicles";
import { RecordTable, Section } from "./common";

interface PermitsTabProps {
  vehicle: Vehicle;
  permits: ParkingPermit[];
  readOnly: boolean;
  onAdd: (permit: NewPermit) => Promise<void>;
  onDecide: (id: number, approve: boolean, reason?: string) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
}

const blank = () => ({
  zone: "",
  issuer: "",
  reference: "",
  valid_from: dayjs().format("YYYY-MM-DD"),
  valid_until: dayjs().add(1, "year").subtract(1, "day").format("YYYY-MM-DD"),
});

const PermitsTab: React.FC<PermitsTabProps> = ({ vehicle, permits, readOnly, onAdd, onDecide, onRemove }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [showErrors, setShowErrors] = useState(false);
  const [toReject, setToReject] = useState<ParkingPermit | null>(null);
  const [reason, setReason] = useState("");
  const [toRemove, setToRemove] = useState<ParkingPermit | null>(null);

  const order = { pending: 0, expiring: 1, active: 2, upcoming: 3, expired: 4, rejected: 5 } as const;
  const rows = [...permits].sort(
    (a, b) => order[permitState(a)] - order[permitState(b)] || b.valid_until.localeCompare(a.valid_until),
  );
  const pending = permits.filter((p) => p.status === "pending");

  const errors = {
    zone: showErrors && !form.zone.trim() ? "Enter the zone or car park." : "",
    issuer: showErrors && !form.issuer.trim() ? "Enter who issued it." : "",
    valid_until:
      form.valid_until && form.valid_from && form.valid_until < form.valid_from
        ? "Must be after the start date."
        : showErrors && !form.valid_until
          ? "Choose the end date."
          : "",
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    if (!form.zone.trim() || !form.issuer.trim() || !form.valid_from || !form.valid_until || form.valid_until < form.valid_from) {
      toast.error("Please check the highlighted fields.");
      return;
    }
    await onAdd({
      vehicle_id: vehicle.id,
      zone: form.zone.trim(),
      issuer: form.issuer.trim(),
      reference: form.reference.trim(),
      valid_from: form.valid_from,
      valid_until: form.valid_until,
    });
    toast.success(`Permit ${form.zone.trim()} added.`);
    setOpen(false);
  };

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {pending.length > 0 && !readOnly && (
        <Alert severity="warning">
          {pending.length} permit request{pending.length > 1 ? "s" : ""} from the driver app {pending.length > 1 ? "are" : "is"} waiting for your approval.
        </Alert>
      )}
      <Section
        title="Parking permits"
        subtitle="Council, workplace or resident permits for this registration. A renewal reminder shows 30 days before a permit ends."
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
              Add permit
            </Button>
          )
        }
      >
        <RecordTable
          rows={rows}
          empty="No parking permits for this vehicle."
          columns={[
            {
              header: "Zone / car park",
              render: (p) => (
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {p.zone}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {p.issuer}
                  </Typography>
                </Box>
              ),
            },
            { header: "Reference", render: (p) => p.reference || "-" },
            { header: "Valid", render: (p) => `${formatDate(p.valid_from)} – ${formatDate(p.valid_until)}` },
            {
              header: "Status",
              render: (p) => {
                const s = PERMIT_STATE[permitState(p)];
                return (
                  <Tooltip title={p.status === "rejected" && p.reject_reason ? `Reason: ${p.reject_reason}` : ""}>
                    <Chip size="small" color={s.color} label={s.label} />
                  </Tooltip>
                );
              },
            },
            {
              header: "Requested / approved",
              render: (p) => (
                <Typography variant="body2" color="textSecondary">
                  {p.status === "pending"
                    ? `Requested by ${p.requested_by}`
                    : `${p.status === "approved" ? "Approved" : "Rejected"} by ${p.decided_by} · ${formatDate(p.decided_at)}`}
                </Typography>
              ),
            },
            {
              header: "",
              align: "right",
              render: (p) =>
                readOnly ? null : (
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    {p.status === "pending" && (
                      <>
                        <Tooltip title="Approve">
                          <IconButton
                            color="success"
                            size="small"
                            onClick={async () => {
                              await onDecide(p.id, true);
                              toast.success(`${p.zone} approved.`);
                            }}
                          >
                            <IconCheck size={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject">
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => {
                              setReason("");
                              setToReject(p);
                            }}
                          >
                            <IconX size={18} />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    <Tooltip title="Remove">
                      <IconButton color="error" size="small" onClick={() => setToRemove(p)}>
                        <IconTrash size={16} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                ),
            },
          ]}
        />
      </Section>

      <FormDrawer
        open={open}
        title={`Add parking permit · ${vehicle.registration}`}
        onClose={() => setOpen(false)}
        onSubmit={submit}
        isSaving={false}
        submitLabel="Add permit"
      >
        <Typography variant="body2" color="textSecondary">
          A vehicle can have more than one permit. Permits you add here are active straight away.
        </Typography>
        <FormField label="Zone or car park *">
          <CustomTextField
            value={form.zone}
            onChange={(e: any) => setForm((f) => ({ ...f, zone: e.target.value.slice(0, 80) }))}
            placeholder="Camden CA-F"
            fullWidth
            error={!!errors.zone}
            helperText={errors.zone}
          />
        </FormField>
        <Stack direction="row" spacing={2}>
          <Box flex={1}>
            <FormField label="Issued by *">
              <CustomTextField
                value={form.issuer}
                onChange={(e: any) => setForm((f) => ({ ...f, issuer: e.target.value.slice(0, 80) }))}
                placeholder="Camden Council"
                fullWidth
                error={!!errors.issuer}
                helperText={errors.issuer}
              />
            </FormField>
          </Box>
          <Box flex={1}>
            <FormField label="Permit reference">
              <CustomTextField
                value={form.reference}
                onChange={(e: any) => setForm((f) => ({ ...f, reference: e.target.value.slice(0, 40) }))}
                fullWidth
              />
            </FormField>
          </Box>
        </Stack>
        <Stack direction="row" spacing={2}>
          <Box flex={1}>
            <FormField label="Valid from *">
              <CustomTextField
                type="date"
                value={form.valid_from}
                onChange={(e: any) => setForm((f) => ({ ...f, valid_from: e.target.value }))}
                fullWidth
              />
            </FormField>
          </Box>
          <Box flex={1}>
            <FormField label="Valid until *">
              <CustomTextField
                type="date"
                value={form.valid_until}
                onChange={(e: any) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
                fullWidth
                error={!!errors.valid_until}
                helperText={errors.valid_until}
              />
            </FormField>
          </Box>
        </Stack>
      </FormDrawer>

      <ConfirmDialog
        open={!!toReject}
        title="Reject permit request"
        message={toReject ? `Reject ${toReject.zone}? The driver sees your reason in the app.` : ""}
        confirmLabel="Reject"
        onClose={() => setToReject(null)}
        onConfirm={async () => {
          if (!toReject) return;
          if (!reason.trim()) {
            toast.error("Please add a reason for rejecting!");
            return;
          }
          await onDecide(toReject.id, false, reason.trim());
          toast.success(`${toReject.zone} rejected.`);
          setToReject(null);
        }}
      >
        <CustomTextField
          autoFocus
          fullWidth
          multiline
          minRows={2}
          placeholder="Reason..."
          value={reason}
          onChange={(e: any) => setReason(e.target.value.slice(0, 200))}
          sx={{ mt: 2 }}
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={!!toRemove}
        title="Remove permit"
        message={toRemove ? `Remove ${toRemove.zone} from ${vehicle.registration}?` : ""}
        onClose={() => setToRemove(null)}
        onConfirm={async () => {
          if (!toRemove) return;
          await onRemove(toRemove.id);
          toast.success("Permit removed.");
          setToRemove(null);
        }}
      />
    </Box>
  );
};

export default PermitsTab;
