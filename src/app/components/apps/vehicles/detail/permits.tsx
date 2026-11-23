"use client";
import React, { useState } from "react";
import { Alert, Box, Button, Chip, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { IconCheck, IconPlus, IconTrash, IconX } from "@tabler/icons-react";
import toast from "react-hot-toast";
import ConfirmDialog from "../../inventory-new/shared/ConfirmDialog";
import { formatDate, ParkingPermit, PERMIT_STATE, permitState, Vehicle } from "../types";
import { NewPermit } from "../useVehicles";
import { PERMIT_ORDER, PermitDrawer, PermitRejectDialog } from "../permit-forms";
import { RecordTable, Section } from "./common";

interface PermitsTabProps {
  vehicle: Vehicle;
  permits: ParkingPermit[];
  readOnly: boolean;
  onAdd: (permit: NewPermit) => Promise<void>;
  onDecide: (id: number, approve: boolean, reason?: string) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
}

const PermitsTab: React.FC<PermitsTabProps> = ({ vehicle, permits, readOnly, onAdd, onDecide, onRemove }) => {
  const [open, setOpen] = useState(false);
  const [toReject, setToReject] = useState<ParkingPermit | null>(null);
  const [toRemove, setToRemove] = useState<ParkingPermit | null>(null);

  const rows = [...permits].sort(
    (a, b) => PERMIT_ORDER[permitState(a)] - PERMIT_ORDER[permitState(b)] || b.valid_until.localeCompare(a.valid_until),
  );
  const pending = permits.filter((p) => p.status === "pending");

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
              onClick={() => setOpen(true)}
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
                              try {
                                await onDecide(p.id, true);
                              } catch {
                                return; // the API's message is already shown
                              }
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
                            onClick={() => setToReject(p)}
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

      <PermitDrawer open={open} vehicle={vehicle} onClose={() => setOpen(false)} onAdd={onAdd} />

      <PermitRejectDialog
        permit={toReject}
        onClose={() => setToReject(null)}
        onReject={(id, reason) => onDecide(id, false, reason)}
      />

      <ConfirmDialog
        open={!!toRemove}
        title="Remove permit"
        message={toRemove ? `Remove ${toRemove.zone} from ${vehicle.registration}?` : ""}
        onClose={() => setToRemove(null)}
        onConfirm={async () => {
          if (!toRemove) return;
          try {
            await onRemove(toRemove.id);
          } catch {
            return; // the API's message is already shown
          }
          toast.success("Permit removed.");
          setToRemove(null);
        }}
      />
    </Box>
  );
};

export default PermitsTab;
