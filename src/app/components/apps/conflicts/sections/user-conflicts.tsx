"use client";

import {
  Box,
  Button,
  Divider,
  Drawer,
  Stack,
  TextField,
  Tooltip,
  Typography,
  IconButton,
} from "@mui/material";
import React, { useCallback, useState } from "react";
import {
  IconEdit,
  IconUsers,
  IconX,
  IconPhone,
  IconMail,
  IconBuilding,
  IconCheck,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

import api from "@/utils/axios";
import { Avatar } from "@mui/material";

// Types
export interface UserConflictDetails {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  image: string | null;
  user_code: string | null;
}

export interface UserConflict {
  conflict_type: string;
  users: UserConflictDetails[];
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
    color = "#5D87FF",
    bg = "#EEF2FF",
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
            bgcolor: "#EEF2FF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconUsers size={20} color="#5D87FF" />
        </Box>
        <Box>
          <Typography
            sx={{ fontSize: "0.92rem", fontWeight: 700, color: "#111827" }}
          >
            {title}
          </Typography>
          <Typography sx={{ fontSize: "0.7rem", color: "#6B7280" }}>
            Resolve duplicate user names
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

export const UserConflictRow = React.memo(
  ({ item, onClick }: { item: UserConflict; onClick: () => void }) => {
    // Determine the name that is duplicate
    const duplicateName = item.users[0]
      ? `${item.users[0].first_name} ${item.users[0].last_name}`
      : "Unknown";

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
            bgcolor: "#EEF2FF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconUsers size={20} color="#5D87FF" />
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
              Duplicate Name: {duplicateName}
            </Typography>
            <LabelPill
              label={`${item.users.length} Users Found`}
              color="#5D87FF"
              bg="#EEF2FF"
              border="#C7D2FE"
            />
          </Stack>
          <Typography sx={{ fontSize: "0.75rem", color: "#6B7280", mt: 0.3 }}>
            Review to ensure distinct users by updating their names
          </Typography>
        </Box>
        <IconChevronRight size={16} color="#D1D5DB" style={{ flexShrink: 0 }} />
      </Box>
    );
  },
);
UserConflictRow.displayName = "UserConflictRow";

const UserDetailPanel = React.memo(
  ({
    conflict,
    isLoading,
    onClose,
    onResolved,
  }: {
    conflict: UserConflict;
    isLoading: boolean;
    onClose: () => void;
    onResolved: () => void;
  }) => {
    const [editingUserId, setEditingUserId] = useState<number | null>(null);
    const [editFirstName, setEditFirstName] = useState("");
    const [editLastName, setEditLastName] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const handleEditClick = (user: UserConflictDetails) => {
      setEditingUserId(user.user_id);
      setEditFirstName(user.first_name);
      setEditLastName(user.last_name);
    };

    const handleSave = async (user_id: number) => {
      if (!editFirstName.trim() || !editLastName.trim()) {
        toast.error("First and Last name are required");
        return;
      }

      setIsSaving(true);
      try {
        const res = await api.post("/user/resolve-user-conflict", {
          user_id,
          first_name: editFirstName,
          last_name: editLastName,
        });

        if (res.data.IsSuccess) {
          toast.success(res.data.message || "User updated successfully");
          setEditingUserId(null);
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
          title="Duplicate Users Found"
          onClose={onClose}
          badge={
            <LabelPill
              label="Duplicate Name"
              color="#5D87FF"
              bg="#EEF2FF"
              border="#C7D2FE"
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
              <Box
                key={user.user_id}
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
                    {editingUserId === user.user_id ? (
                      <Box
                        sx={{
                          mb: 1.5,
                          p: 2,
                          borderRadius: "8px",
                          border: "1px solid #E5E7EB",
                          bgcolor: "#F9FAFB",
                        }}
                      >
                        <Stack spacing={2} sx={{ mb: 2 }}>
                          <CustomTextField
                            size="small"
                            label="First Name"
                            value={editFirstName}
                            onChange={(e: any) =>
                              setEditFirstName(e.target.value)
                            }
                            fullWidth
                            sx={{
                              bgcolor: "#fff",
                            }}
                            inputProps={{ style: { textAlign: 'left' } }}
                          />
                          <CustomTextField
                            size="small"
                            label="Last Name"
                            value={editLastName}
                            onChange={(e: any) =>
                              setEditLastName(e.target.value)
                            }
                            fullWidth
                            sx={{
                              bgcolor: "#fff",
                            }}
                            inputProps={{ style: { textAlign: 'left' } }}
                          />
                        </Stack>
                        <Stack
                          direction="row"
                          spacing={1}
                          justifyContent="flex-end"
                        >
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => setEditingUserId(null)}
                            color="error"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            disabled={isSaving}
                            onClick={() => handleSave(user.user_id)}
                          >
                            Save
                          </Button>
                        </Stack>
                      </Box>
                    ) : (
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
                        <IconButton
                          size="small"
                          onClick={() => handleEditClick(user)}
                          sx={{ color: "#6366F1" }}
                        >
                          <IconEdit size={16} />
                        </IconButton>
                      </Stack>
                    )}
                    <Divider sx={{ my: 1.5 }} />
                    <Stack spacing={1.5}>
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
            ))}
          </Stack>

          <Box
            sx={{
              mt: 3,
              p: 2,
              borderRadius: "8px",
              bgcolor: "#EEF2FF",
              border: "1px solid #C7D2FE",
            }}
          >
            <Typography
              sx={{ fontSize: "0.75rem", color: "#4338CA", fontWeight: 500 }}
            >
              Tip: Edit the first name or last name of the users to
              differentiate them. Once the names are unique, the conflict will
              be resolved.
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  },
);
UserDetailPanel.displayName = "UserDetailPanel";

// Main Export
interface UserConflictsProps {
  data: UserConflict[];
  onResolved: () => void;
}

export default function UserConflicts({
  data,
  onResolved,
}: UserConflictsProps) {
  const [openConflict, setOpenConflict] = useState<UserConflict | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const handleResolved = useCallback(async () => {
    setOpenConflict(null);
    onResolved();
  }, [onResolved]);

  return (
    <>
      {data.map((item, i) => (
        <UserConflictRow
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
          <UserDetailPanel
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
