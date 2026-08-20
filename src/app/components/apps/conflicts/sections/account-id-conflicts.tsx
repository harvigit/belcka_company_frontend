"use client";

import {
  Box,
  Button,
  Divider,
  Drawer,
  Stack,
  Tooltip,
  Typography,
  TextField,
  IconButton
} from "@mui/material";
import React, { useCallback, useState } from "react";
import {
  IconX,
  IconPhone,
  IconMail,
  IconBuilding,
  IconCreditCard,
  IconEdit,
  IconCheck
} from "@tabler/icons-react";
import toast from "react-hot-toast";

import api from "@/utils/axios";
import { Avatar } from "@mui/material";

// Types
export interface AccountIdConflictDetails {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  image: string | null;
  user_code: string | null;
  account_id: string | null;
}

export interface AccountIdConflict {
  conflict_type: string;
  account_id: string;
  users: AccountIdConflictDetails[];
}

// Helpers
const mkInitials = (name: string) =>
  (name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const UserAvatar = React.memo(
  ({
    name,
    image,
    size = 36,
    color = "#EC4899",
    bg = "#FDF2F8",
  }: {
    name: string;
    image?: string | null;
    size?: number;
    color?: string;
    bg?: string;
  }) => (
    <Avatar
      src={image || ""}
      alt={name}
      sx={{
        width: size,
        height: size,
        fontSize: `${size * 0.022}rem`,
        fontWeight: 700,
        bgcolor: bg,
        color,
        border: `2px solid ${bg}`,
        flexShrink: 0,
      }}
    >
      {!image && mkInitials(name)}
    </Avatar>
  ),
);
UserAvatar.displayName = "UserAvatar";

const LabelPill = React.memo(
  ({
    label,
    color,
    bg,
    border,
  }: {
    label: string;
    color: string;
    bg: string;
    border: string;
  }) => (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        px: 1.25,
        py: 0.25,
        borderRadius: "20px",
        fontSize: "0.68rem",
        fontWeight: 700,
        color,
        bgcolor: bg,
        border: `1px solid ${border}`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Box>
  ),
);
LabelPill.displayName = "LabelPill";

const DrawerHeader = React.memo(
  ({
    title,
    onClose,
    badge,
  }: {
    title: string;
    onClose: () => void;
    badge?: React.ReactNode;
  }) => (
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
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "8px",
            bgcolor: "#FDF2F8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconCreditCard size={20} color="#EC4899" />
        </Box>
        <Box>
          <Typography
            sx={{ fontSize: "0.92rem", fontWeight: 700, color: "#111827" }}
          >
            {title}
          </Typography>
          <Typography sx={{ fontSize: "0.7rem", color: "#6B7280" }}>
            Resolve duplicate account IDs
          </Typography>
        </Box>
      </Stack>
      <Stack direction="row" alignItems="center" spacing={1}>
        {badge}
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
      </Stack>
    </Box>
  ),
);
DrawerHeader.displayName = "DrawerHeader";

import { IconChevronRight } from "@tabler/icons-react";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";

export const AccountIdConflictRow = React.memo(
  ({ item, onClick }: { item: AccountIdConflict; onClick: () => void }) => {
    return (
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
            width: 36,
            height: 36,
            borderRadius: "8px",
            bgcolor: "#FDF2F8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconCreditCard size={20} color="#EC4899" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ mb: 0.5 }}
          >
            <Typography
              sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#111827" }}
            >
              Duplicate Account ID: {item.account_id}
            </Typography>
            <LabelPill
              label={`${item.users.length} Users Found`}
              color="#EC4899"
              bg="#FDF2F8"
              border="#FBCFE8"
            />
          </Stack>
          <Typography sx={{ fontSize: "0.75rem", color: "#6B7280", mt: 0.3 }}>
            Review to ensure distinct users by updating their account IDs
          </Typography>
        </Box>
        <IconChevronRight size={16} color="#D1D5DB" style={{ flexShrink: 0 }} />
      </Box>
    );
  },
);
AccountIdConflictRow.displayName = "AccountIdConflictRow";

const ConflictingUserCard = React.memo(({ user, isSaving, setIsSaving, onResolved }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [accountIdValue, setAccountIdValue] = useState(user.account_id || "");

  const handleUpdate = async () => {
    if (accountIdValue === user.account_id) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      const res = await api.post("/user/update-account-id", {
        user_id: user.user_id,
        account_id: accountIdValue,
      });

      if (res.data.IsSuccess) {
        toast.success(res.data.message || "Account ID updated");
        setIsEditing(false);
        user.account_id = accountIdValue;
        onResolved();
      } else {
        toast.error(res.data.message || "Failed to update Account ID");
      }
    } catch (error: any) {
      toast.error("Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: "12px",
        bgcolor: "#FFFFFF",
        border: "1px solid #E5E7EB",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      <Stack
        direction="row"
        spacing={2}
        alignItems="flex-start"
        sx={{ mb: 2 }}
      >
        <UserAvatar
          name={`${user.first_name} ${user.last_name}`}
          image={user.image}
          size={48}
        />
        <Box sx={{ flex: 1 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography
              sx={{
                fontSize: "1rem",
                fontWeight: 700,
                color: "#111827",
              }}
            >
              {user.first_name} {user.last_name}
            </Typography>
          </Stack>
          <Divider sx={{ my: 1.5 }} />
          <Stack spacing={1.5}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <IconCreditCard size={16} color="#9CA3AF" />
              {isEditing ? (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <CustomTextField
                    size="small"
                    type="text"
                    inputProps={{
                      maxLength: 5,
                      inputMode: "numeric",
                      pattern: "[0-9]*",
                    }}
                    value={accountIdValue}
                    onChange={(e: any) => {
                      if (/^\d{0,5}$/.test(e.target.value)) {
                        setAccountIdValue(e.target.value);
                      }
                    }}
                    sx={{ width: 150 }}
                  />
                  <IconButton onClick={handleUpdate} disabled={isSaving} size="small" color="primary">
                    <IconCheck size={18} />
                  </IconButton>
                  <IconButton onClick={() => { setIsEditing(false); setAccountIdValue(user.account_id || ""); }} disabled={isSaving} size="small" color="error">
                    <IconX size={18} />
                  </IconButton>
                </Stack>
              ) : (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography
                    sx={{ fontSize: "0.8rem", color: "#4B5563" }}
                  >
                    Account ID: {user.account_id || "N/A"}
                  </Typography>
                  <IconButton onClick={() => setIsEditing(true)} size="small" sx={{ ml: 1, p: 0.5 }}>
                    <IconEdit size={14} color="#6B7280" />
                  </IconButton>
                </Stack>
              )}
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <IconMail size={16} color="#9CA3AF" />
              <Typography
                sx={{ fontSize: "0.8rem", color: "#4B5563" }}
              >
                {user.email || "No email provided"}
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <IconPhone size={16} color="#9CA3AF" />
              <Typography
                sx={{ fontSize: "0.8rem", color: "#4B5563" }}
              >
                {user.phone || "No phone provided"}
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <IconBuilding size={16} color="#9CA3AF" />
              <Typography
                sx={{ fontSize: "0.8rem", color: "#4B5563" }}
              >
                Company Code: {user.user_code || ""}
              </Typography>
            </Stack>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
});
ConflictingUserCard.displayName = "ConflictingUserCard";

const AccountIdDetailPanel = React.memo(
  ({
    conflict,
    isLoading,
    onClose,
    onResolved,
  }: {
    conflict: AccountIdConflict;
    isLoading: boolean;
    onClose: () => void;
    onResolved: () => void;
  }) => {
    const [isSaving, setIsSaving] = useState(false);

    const handleAction = async (action: 'approve' | 'resolve') => {
      setIsSaving(true);
      try {
        const userIds = conflict.users.map(u => u.user_id);
        const res = await api.post("/user/resolve-account-id-conflict", {
          user_ids: userIds,
          account_id: conflict.account_id,
          action: action
        });

        if (res.data.IsSuccess) {
          toast.success(res.data.message || "Conflict resolved successfully");
          onResolved();
        } else {
          toast.error(res.data.message || "Failed to resolve conflict");
        }
      } catch (error: any) {
        toast.error("Something went wrong while resolving conflict");
      } finally {
        setIsSaving(false);
      }
    };

    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          bgcolor: "#fff",
        }}
      >
        <DrawerHeader
          title="Duplicate Account ID Found"
          onClose={onClose}
          badge={
            <LabelPill
              label="Duplicate Account ID"
              color="#EC4899"
              bg="#FDF2F8"
              border="#FBCFE8"
            />
          }
        />
        <Box sx={{ flex: 1, overflowY: "auto", p: 2.5, bgcolor: "#FAFAFA" }}>
          <Typography
            sx={{
              fontSize: "0.7rem",
              fontWeight: 700,
              color: "#6B7280",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              mb: 2,
            }}
          >
            Conflicting Users
          </Typography>

          <Stack spacing={3}>
            {conflict.users.map((user) => (
              <ConflictingUserCard 
                key={user.user_id} 
                user={user} 
                isSaving={isSaving} 
                setIsSaving={setIsSaving} 
                onResolved={onResolved}
              />
            ))}
          </Stack>

          </Box>
          <Box sx={{ m: 2, display: "flex", justifyContent: "flex-start", gap: 2 }}>
            <Button
              variant="contained"
              color="success"
              disabled={isSaving}
              onClick={() => handleAction('approve')}
            >
              {isSaving ? "Approving..." : "Approve"}
            </Button>
            <Button
              variant="outlined"
              color="primary"
              disabled={isSaving}
              onClick={() => handleAction('resolve')}
            >
              Resolve Conflict
            </Button>
        </Box>
      </Box>
    );
  },
);
AccountIdDetailPanel.displayName = "AccountIdDetailPanel";

// Main Export
interface AccountIdConflictsProps {
  data: AccountIdConflict[];
  onResolved: () => void;
}

export default function AccountIdConflicts({
  data,
  onResolved,
}: AccountIdConflictsProps) {
  const [openConflict, setOpenConflict] = useState<AccountIdConflict | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const handleResolved = useCallback(async () => {
    setOpenConflict(null);
    onResolved();
  }, [onResolved]);

  return (
    <>
      {data.map((item, i) => (
        <AccountIdConflictRow
          key={i}
          item={item}
          onClick={() => setOpenConflict(item)}
        />
      ))}

      <Drawer
        anchor="right"
        open={!!openConflict}
        onClose={() => setOpenConflict(null)}
        PaperProps={{
          sx: {
            width: 500,
            borderTopLeftRadius: 18,
            borderBottomLeftRadius: 18,
            overflow: "hidden",
          },
        }}
      >
        {openConflict && (
          <AccountIdDetailPanel
            conflict={openConflict}
            isLoading={isActionLoading}
            onClose={() => setOpenConflict(null)}
            onResolved={handleResolved}
          />
        )}
      </Drawer>
    </>
  );
}
