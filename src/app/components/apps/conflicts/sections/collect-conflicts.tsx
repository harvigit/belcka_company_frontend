"use client";

import {
  Box,
  Button,
  CircularProgress,
  Drawer,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useCallback, useState } from "react";
import {
  IconChevronRight,
  IconEdit,
  IconReceipt,
  IconX,
} from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import CollectAddEdit from "@/app/components/apps/collect/list/create-edit";

export interface CollectConflict {
  conflict_type: string;
  id: number;
  project_id?: number;
  project_name?: string | null;
  invoice_number?: string | null;
  address_name?: string | null;
  supplier_name?: string | null;
  created_by_name?: string | null;
  inc_tax?: number;
  formatted_inc_tax?: string;
  receipt_date?: string | null;
  created_at?: string | null;
  message?: string;
}

type CollectConflictListProps = {
  data: CollectConflict[];
  onResolved: () => void | Promise<void>;
  onEdit?: (id: number) => void;
};

const useCollectConflictActions = (onResolved: () => void | Promise<void>) => {
  const [savingId, setSavingId] = useState<number | null>(null);

  const handleResolve = async (id: number) => {
    setSavingId(id);
    try {
      const res = await api.post("po-collect/resolve-conflict", { id });
      if (res.data?.IsSuccess) {
        toast.success(res.data.message || "Conflict resolved");
        await onResolved();
      } else {
        toast.error(res.data?.message || "Failed to resolve conflict");
      }
    } catch {
      toast.error("Failed to resolve conflict");
    } finally {
      setSavingId(null);
    }
  };

  return {
    savingId,
    handleResolve,
  };
};

const DetailRow = ({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) => (
  <Stack direction="row" justifyContent="space-between" sx={{ py: 0.6 }}>
    <Typography sx={{ fontSize: "0.78rem", color: "#6B7280" }}>
      {label}
    </Typography>
    <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#111827" }}>
      {value || "-"}
    </Typography>
  </Stack>
);

export const CollectConflictRow = React.memo(
  ({
    item,
    onClick,
    onEdit,
  }: {
    item: CollectConflict;
    onClick: () => void;
    onEdit?: (id: number) => void;
  }) => (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        px: 2,
        py: 1.5,
        borderBottom: "1px solid #F3F4F6",
        cursor: "pointer",
        transition: "background 0.15s",
        "&:hover": { bgcolor: "#F9FAFB" },
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: "10px",
          bgcolor: "#F9FAFB",
          border: "1px solid #E5E7EB",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <IconReceipt size={18} color="#6B7280" />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#111827" }}
          noWrap
        >
          {item.invoice_number || `Collect #${item.id}`}
        </Typography>
        <Typography sx={{ fontSize: "0.72rem", color: "#6B7280" }} noWrap>
          {[item.project_name, item.created_by_name, item.created_at]
            .filter(Boolean)
            .join(" · ")}
        </Typography>
      </Box>
      <Typography
        sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#111827", mr: 0.5 }}
      >
        {item.formatted_inc_tax ?? "0"}
      </Typography>
      <IconChevronRight size={16} color="#D1D5DB" style={{ flexShrink: 0 }} />
    </Box>
  ),
);
CollectConflictRow.displayName = "CollectConflictRow";

const StickyActionBar = ({
  isSaving,
  onEdit,
  onResolve,
}: {
  isSaving: boolean;
  onEdit: () => void;
  onResolve: () => void;
}) => (
  <Box
    sx={{
      flexShrink: 0,
      px: 2.5,
      py: 1.75,
      borderTop: "1px solid #E5E7EB",
      bgcolor: "#fff",
      zIndex: 2,
      boxShadow: "0 -4px 16px rgba(17, 24, 39, 0.06)",
    }}
  >
    <Stack direction="row" spacing={1.25} flexWrap="nowrap">
      <Button
        variant="outlined"
        disabled={isSaving}
        onClick={onEdit}
        startIcon={<IconEdit size={16} />}
        sx={{
          flex: 1,
          minWidth: 0,
          whiteSpace: "nowrap",
          textTransform: "none",
          fontWeight: 600,
          borderRadius: "8px",
        }}
      >
        Edit
      </Button>
      <Button
        variant="contained"
        color="error"
        disabled={isSaving}
        onClick={onResolve}
        startIcon={
          isSaving ? <CircularProgress size={14} color="inherit" /> : null
        }
        sx={{
          flex: 1,
          minWidth: 0,
          whiteSpace: "nowrap",
          textTransform: "none",
          fontWeight: 600,
          borderRadius: "8px",
        }}
      >
        Resolve
      </Button>
    </Stack>
  </Box>
);

const CollectDetailPanel = ({
  conflict,
  onClose,
  onResolved,
  onEdit,
}: {
  conflict: CollectConflict;
  onClose: () => void;
  onResolved: () => void | Promise<void>;
  onEdit: (id: number) => void;
}) => {
  const { savingId, handleResolve } = useCollectConflictActions(onResolved);
  const isSaving = savingId === conflict.id;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        flex: 1,
        minHeight: 0,
        bgcolor: "#fff",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2.5,
          py: 2,
          borderBottom: "1px solid #E5E7EB",
          bgcolor: "#FAFAFA",
          flexShrink: 0,
        }}
      >
        <Box>
          <Typography
            sx={{ fontSize: "0.92rem", fontWeight: 700, color: "#111827" }}
          >
            {conflict.invoice_number || `Collect #${conflict.id}`}
          </Typography>
          <Typography sx={{ fontSize: "0.7rem", color: "#6B7280" }}>
            Collect amount conflict
          </Typography>
        </Box>
        <Tooltip title="Close">
          <Box
            component="span"
            onClick={onClose}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              bgcolor: "#F3F4F6",
              borderRadius: "8px",
              cursor: "pointer",
              "&:hover": { bgcolor: "#E5E7EB" },
            }}
          >
            <IconX size={15} />
          </Box>
        </Tooltip>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", p: 2.5 }}>
        <Typography
          sx={{
            fontSize: "0.7rem",
            fontWeight: 700,
            color: "#6B7280",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            mb: 1.5,
          }}
        >
          Details
        </Typography>
        <Box
          sx={{
            p: 2,
            borderRadius: "12px",
            bgcolor: "#F9FAFB",
            border: "1px solid #E5E7EB",
          }}
        >
          <DetailRow
            label="Invoice"
            value={conflict.invoice_number || `#${conflict.id}`}
          />
          <DetailRow label="Project" value={conflict.project_name} />
          <DetailRow label="Address" value={conflict.address_name} />
          <DetailRow label="Supplier" value={conflict.supplier_name} />
          <DetailRow label="Created by" value={conflict.created_by_name} />
          <DetailRow label="Created at" value={conflict.created_at} />
          <DetailRow label="Amount" value={conflict.formatted_inc_tax ?? "0"} />
        </Box>
      </Box>

      <StickyActionBar
        isSaving={isSaving}
        onEdit={() => onEdit(conflict.id)}
        onResolve={() => handleResolve(conflict.id)}
      />
    </Box>
  );
};

export const CollectConflictList: React.FC<CollectConflictListProps> = ({
  data,
  onResolved,
  onEdit,
}) => {
  const [selectedConflict, setSelectedConflict] =
    useState<CollectConflict | null>(null);

  if (!data.length && !selectedConflict) {
    return (
      <Box sx={{ px: 2, py: 3, textAlign: "center" }}>
        <Typography sx={{ fontSize: "0.8rem", color: "#9CA3AF" }}>
          No collect amount conflicts
        </Typography>
      </Box>
    );
  }

  if (selectedConflict) {
    const current =
      data.find((item) => item.id === selectedConflict.id) ?? selectedConflict;
    return (
      <Box
        sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
      >
        <CollectDetailPanel
          conflict={current}
          onClose={() => setSelectedConflict(null)}
          onResolved={async () => {
            setSelectedConflict(null);
            await onResolved();
          }}
          onEdit={(id) => {
            setSelectedConflict(null);
            onEdit?.(id);
          }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, overflowY: "auto" }}>
      {data.map((item) => (
        <CollectConflictRow
          key={item.id}
          item={item}
          onClick={() => setSelectedConflict(item)}
          onEdit={onEdit}
        />
      ))}
    </Box>
  );
};

const CollectConflicts = ({ data, onResolved }: CollectConflictListProps) => {
  const session = useSession();
  const user = session?.data?.user as User & { company_id: number };
  const [openConflict, setOpenConflict] = useState<CollectConflict | null>(
    null,
  );
  const [editCollectId, setEditCollectId] = useState<number | null>(null);

  const handleResolved = useCallback(async () => {
    setOpenConflict(null);
    await onResolved();
  }, [onResolved]);

  const handleEdit = useCallback((id: number) => {
    setOpenConflict(null);
    setEditCollectId(id);
  }, []);

  return (
    <>
      {data.map((item) => (
        <CollectConflictRow
          key={item.id}
          item={item}
          onClick={() => setOpenConflict(item)}
          onEdit={handleEdit}
        />
      ))}

      <Drawer
        anchor="right"
        open={!!openConflict}
        onClose={() => setOpenConflict(null)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 480 },
            borderTopLeftRadius: 18,
            borderBottomLeftRadius: 18,
            overflow: "hidden",
          },
        }}
      >
        {openConflict && (
          <CollectDetailPanel
            conflict={openConflict}
            onClose={() => setOpenConflict(null)}
            onResolved={handleResolved}
            onEdit={handleEdit}
          />
        )}
      </Drawer>

      <CollectAddEdit
        open={editCollectId != null}
        onClose={() => setEditCollectId(null)}
        companyId={user?.company_id || null}
        isEdit
        collectId={editCollectId}
        onSuccess={async () => {
          setEditCollectId(null);
          await onResolved();
        }}
      />
    </>
  );
};

export default CollectConflicts;
