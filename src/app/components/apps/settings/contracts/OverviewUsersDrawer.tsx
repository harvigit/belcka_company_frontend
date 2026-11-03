"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { IconChevronRight, IconSearch, IconX } from "@tabler/icons-react";
import api from "@/utils/axios";
import { getUserDetailsHref } from "@/utils/userDetailsRoute";

export type OverviewType = "signed" | "waiting" | "details_missing" | "expiring";

interface OverviewContract {
  contract_id: number;
  template_id: number | null;
  template_title: string | null;
  version_no: number | null;
  change_note: string | null;
  signed_at: string | null;
  expires_at: string | null;
  requested_at: string | null;
  reminded_at: string | null;
}

interface OverviewUser {
  user_id: number;
  name: string | null;
  user_image: string | null;
  user_thumb_image: string | null;
  contracts: OverviewContract[];
}

interface Props {
  type: OverviewType | null;
  title: string;
  color: string;
  companyId: number;
  onClose: () => void;
}

const contractDetail = (type: OverviewType, c: OverviewContract) => {
  if (type === "signed" || type === "expiring") {
    return [
      c.signed_at ? `Signed ${c.signed_at}` : null,
      c.expires_at ? `expires ${c.expires_at}` : type === "signed" ? "no expiry" : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  return [c.requested_at ? `Requested ${c.requested_at}` : null, c.reminded_at ? `reminded ${c.reminded_at}` : null]
    .filter(Boolean)
    .join(" · ");
};

const OverviewUsersDrawer = ({ type, title, color, companyId, onClose }: Props) => {
  const router = useRouter();
  const [users, setUsers] = useState<OverviewUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!type || !companyId) return;
    setUsers([]);
    setSearch("");
    setLoading(true);
    api
      .get("contracts/overview/users", { params: { company_id: companyId, type } })
      .then((res) => setUsers(Array.isArray(res.data?.info) ? res.data.info : []))
      .catch((error) => console.error(error))
      .finally(() => setLoading(false));
  }, [type, companyId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (u) =>
        (u.name ?? "").toLowerCase().includes(term) ||
        u.contracts.some((c) => (c.template_title ?? "").toLowerCase().includes(term)),
    );
  }, [users, search]);

  const openUser = (userId: number) => {
    onClose();
    router.push(getUserDetailsHref(userId, { tab: "contracts" }));
  };

  return (
    <Drawer
      anchor="right"
      open={Boolean(type)}
      onClose={onClose}
      sx={{ "& .MuiDrawer-paper": { width: { xs: "100%", sm: 420 } } }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2.5, borderBottom: 1, borderColor: "divider" }}>
        <Box>
          <Typography variant="h6">{title}</Typography>
          <Typography variant="body2" color="textSecondary">
            {loading ? "Loading..." : `${users.length} user${users.length === 1 ? "" : "s"}`}
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close">
          <IconX size={20} />
        </IconButton>
      </Stack>

      <Box sx={{ px: 2.5, pt: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search user or template"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconSearch size={16} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", px: 2.5, py: 2 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={24} />
          </Box>
        ) : !filtered.length ? (
          <Typography color="textSecondary" textAlign="center" py={4}>
            {users.length ? "No users match your search." : "No users here."}
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {filtered.map((u) => (
              <Box
                key={u.user_id}
                role="button"
                tabIndex={0}
                aria-label={`Open contracts for ${u.name ?? `user ${u.user_id}`}`}
                onClick={() => openUser(u.user_id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openUser(u.user_id);
                  }
                }}
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 2,
                  p: 1.5,
                  cursor: "pointer",
                  transition: "border-color .2s, background-color .2s",
                  "& .user-arrow": { transition: "transform .2s, color .2s", color: "text.secondary" },
                  "&:hover, &:focus-visible": {
                    borderColor: color,
                    bgcolor: "action.hover",
                    outline: "none",
                    "& .user-arrow": { transform: "translateX(3px)", color },
                  },
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Avatar
                    src={u.user_thumb_image || u.user_image || "/images/users/user.png"}
                    alt={u.name ?? ""}
                    sx={{ width: 36, height: 36 }}
                  />
                  <Box minWidth={0} flex={1}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {u.name ?? `User ${u.user_id}`}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {u.contracts.length} contract{u.contracts.length === 1 ? "" : "s"}
                    </Typography>
                  </Box>
                  <Box className="user-arrow" display="flex">
                    <IconChevronRight size={18} />
                  </Box>
                </Stack>
                <Stack spacing={0.75} mt={1.25} pl={{ xs: 0, sm: 6 }}>
                  {u.contracts.map((c) => (
                    <Box key={c.contract_id}>
                      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography variant="body2">{c.template_title ?? "Contract"}</Typography>
                        {c.version_no != null && <Chip size="small" variant="outlined" label={`v${c.version_no}`} />}
                      </Stack>
                      {c.change_note && (
                        <Typography variant="caption" display="block" sx={{ whiteSpace: "pre-line", wordBreak: "break-word" }}>
                          <b>What changed:</b> {c.change_note}
                        </Typography>
                      )}
                      <Typography variant="caption" color="textSecondary">
                        {type ? contractDetail(type, c) : ""}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Drawer>
  );
};

export default OverviewUsersDrawer;
