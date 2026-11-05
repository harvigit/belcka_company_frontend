"use client";
import React, { useEffect, useState } from "react";
import {
  Box,
  Divider,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { IconCheck, IconX } from "@tabler/icons-react";
import Image from "next/image";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import ConfirmDialog from "../shared/ConfirmDialog";
import FilterButton from "../shared/FilterButton";
import { InventoryOptions, qty } from "../shared/useInventoryOptions";
import { dateText, StatusText } from "../shared/orderUtils";

interface AdjustmentsListProps {
  companyId?: number | null;
  options: InventoryOptions;
  onChanged: () => void;
}

const STATUS: Record<
  string,
  { label: string; tone: "warning" | "success" | "error" }
> = {
  pending: { label: "Waiting for admin", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "error" },
};

const TYPE_TEXT: Record<string, string> = {
  missing: "Missing",
  damaged: "Damaged",
  found: "Found",
};

const headCell = { fontWeight: 600, whiteSpace: "nowrap" } as const;

// Missing / damaged / found reports. Stock only changes once an admin approves a report.
const AdjustmentsList: React.FC<AdjustmentsListProps> = ({
  companyId,
  options,
  onChanged,
}) => {
  const [rows, setRows] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "pending", store_id: "" });
  const [rejecting, setRejecting] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      let url = `inventory-new/stock/adjustments?company_id=${companyId}&page=1&limit=200`;
      if (filters.status) url += `&status=${filters.status}`;
      if (filters.store_id) url += `&store_id=${filters.store_id}`;
      const res = await api.get(url);
      setRows(res.data?.info ?? []);
      setIsAdmin(!!res.data?.is_admin);
    } catch (err) {
      console.error("Failed to fetch stock adjustments", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, filters]);

  const decide = async (row: any, approve: boolean, reason?: string) => {
    try {
      const result = await api.post(
        `inventory-new/stock/adjustments/${approve ? "approve" : "reject"}`,
        {
          company_id: companyId,
          id: row.id,
          reject_reason: reason,
        },
      );
      toast.success(result.data.message);
      load();
      onChanged();
      return true;
    } catch (error) {
      // the api interceptor already shows the error message
      return false;
    }
  };

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
    >
      <Stack mx={2} mb={2} direction="row" spacing={1} alignItems="center">
        <FilterButton
          value={filters}
          onApply={(v) =>
            setFilters({ status: v.status ?? "", store_id: v.store_id ?? "" })
          }
          fields={[
            {
              key: "status",
              label: "Status",
              options: Object.entries(STATUS).map(([value, s]) => ({
                value,
                label: s.label,
              })),
            },
            {
              key: "store_id",
              label: "Store",
              options: options.stores.map((s) => ({
                value: s.id,
                label: s.name,
              })),
            },
          ]}
        />
        <Typography variant="body2" color="textSecondary">
          {isAdmin
            ? "Approve a report to change the stock."
            : "Reports wait for an admin before the stock changes."}
        </Typography>
      </Stack>
      <Divider />

      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {loading ? (
          <SkeletonLoader
            columns={[{ name: "" }, { name: "" }, { name: "" }, { name: "" }]}
            rowCount={5}
          />
        ) : !rows.length ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "calc(50vh - 100px)",
            }}
          >
            <Image
              src="/images/no-data.png"
              alt="No data"
              width={200}
              height={200}
            />
          </Box>
        ) : (
          <TableContainer>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={headCell}>Date</TableCell>
                  <TableCell sx={headCell}>Item</TableCell>
                  <TableCell sx={headCell}>Store</TableCell>
                  <TableCell sx={headCell}>Type</TableCell>
                  <TableCell sx={headCell}>Qty</TableCell>
                  <TableCell sx={headCell}>Reason</TableCell>
                  <TableCell sx={headCell}>Reported by</TableCell>
                  <TableCell sx={headCell}>Status</TableCell>
                  {isAdmin && <TableCell sx={headCell}>Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => {
                  const status = STATUS[r.status] ?? STATUS.pending;
                  return (
                    <TableRow key={r.id} hover>
                      <TableCell>
                        <Typography className="f-14">
                          {dateText(r.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography className="f-14" fontWeight={600}>
                          {r.uuid} · {r.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography className="f-14">
                          {r.store_name ?? "-"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography className="f-14">
                          {TYPE_TEXT[r.type] ?? r.type}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          className="f-14"
                          color={
                            r.type === "found" ? "success.main" : "error.main"
                          }
                        >
                          {r.type === "found" ? "+" : "-"}
                          {qty(r.qty)} {r.unit_name ?? ""}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography className="f-14">
                          {r.reason ?? "-"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography className="f-14">
                          {r.reported_by_name ?? "-"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip
                          title={
                            r.status === "rejected" && r.reject_reason
                              ? `Reason: ${r.reject_reason}`
                              : ""
                          }
                        >
                          <span>
                            <StatusText
                              label={status.label}
                              tone={status.tone}
                            />
                          </span>
                        </Tooltip>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          {r.status === "pending" && (
                            <Stack direction="row" spacing={0.5}>
                              <Tooltip title="Approve">
                                <IconButton
                                  color="success"
                                  onClick={() => decide(r, true)}
                                >
                                  <IconCheck size={18} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reject">
                                <IconButton
                                  color="error"
                                  onClick={() => setRejecting(r)}
                                >
                                  <IconX size={18} />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <ConfirmDialog
        open={!!rejecting}
        title="Reject report"
        message={
          rejecting
            ? `Reject ${qty(rejecting.qty)} ${rejecting.name} reported as ${rejecting.type}?`
            : ""
        }
        confirmLabel="Reject"
        onClose={() => {
          setRejecting(null);
          setRejectReason("");
        }}
        onConfirm={async () => {
          if (!rejectReason.trim()) {
            toast.error("Please add a reason for rejecting!");
            return;
          }
          if (await decide(rejecting, false, rejectReason.trim())) {
            setRejecting(null);
            setRejectReason("");
          }
        }}
      >
        <CustomTextField
          autoFocus
          fullWidth
          multiline
          minRows={2}
          placeholder="Reason..."
          value={rejectReason}
          onChange={(e: any) => setRejectReason(e.target.value)}
          sx={{ mt: 2 }}
        />
      </ConfirmDialog>
    </Box>
  );
};

export default AdjustmentsList;
