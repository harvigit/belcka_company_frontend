"use client";
import React, { useEffect, useState, useMemo } from "react";
import {
  TableContainer,
  Table,
  TableRow,
  TableCell,
  TableBody,
  TableHead,
  Typography,
  Box,
  Grid,
  Button,
  Divider,
  IconButton,
  Stack,
  TextField,
  InputAdornment,
  MenuItem,
  DialogActions,
  DialogTitle,
  DialogContent,
  Dialog,
  Chip,
  CircularProgress,
  CardContent,
} from "@mui/material";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  createColumnHelper,
} from "@tanstack/react-table";
import {
    IconChevronLeft,
    IconChevronRight,
    IconChevronsLeft,
    IconChevronsRight,
    IconFilter,
    IconMedal,
    IconSearch,
} from '@tabler/icons-react';
import api from "@/utils/axios";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Avatar } from "@mui/material";
import { useSearchParams } from "next/navigation";
import BlankCard from "@/app/components/shared/BlankCard";
import { useSession } from "next-auth/react";
import { User } from "next-auth";

import DigitalIDCard from "@/app/components/common/users-card/UserDigitalCard";

dayjs.extend(customParseFormat);

export interface TeamList {
  id: number;
  user_image: string | null;
  email: string | null;
  phone: string | null;
  team_name: string;
  name: string;
  image: string | null;
  status: boolean;
  trade_name: string | null;
  trade_id: number | null;
}

export interface TradeList {
  trade_id: number;
  name: string;
}

const TablePagination = () => {
  const [data, setData] = useState<TeamList[]>([]);
  const [trade, setTrade] = useState<TradeList[]>([]);
  const [columnFilters, setColumnFilters] = useState<any>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [searchTerm, setSearchTerm] = useState("");
  const rerender = React.useReducer(() => ({}), {})[1];
  const [user, setUser] = useState([]);

  const [openIdCard, setOpenIdCard] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const searchParams = useSearchParams();
  const userId = searchParams ? searchParams.get("user_id") : "";

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.get(`user/get-user-lists?user_id=${userId}`);
        if (res.data?.info) {
          setData(res.data.info);
        }
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch users", err);
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="300px"
      >
        <CircularProgress />
      </Box>
    );
  }
  return (
    <Grid container spacing={2} ml={4}>
      {/* Render the search and table */}
      <Grid
        display={"flex"}
        justifyContent={"center"}
        m={"auto"}
        size={{
          xs: 6,
          lg: 6,
        }}
      >
        <BlankCard>
          <CardContent>
            {data[0].status}
            <Chip
              size="small"
              label={data[0].status ? "Working" : "Not Working"}
              sx={{
                backgroundColor: (theme) =>
                  data[0].status
                    ? theme.palette.success.light
                    : theme.palette.error.light,
                color: (theme) =>
                  data[0].status
                    ? theme.palette.success.main
                    : theme.palette.error.main,
                fontWeight: 500,
                borderRadius: "6px",
                px: 1.5,
              }}
            />
            <Box textAlign="center" display="flex" justifyContent="center">
              <Box>
                <Avatar
                  src={
                    data[0].user_image
                      ? data[0].user_image
                      : "/images/users/user.png"
                  }
                  alt={"user1"}
                  sx={{ width: 120, height: 120, margin: "0 auto" }}
                />
                <Typography variant="subtitle1" color="textSecondary" mb={1}>
                  {data[0].name ?? null}
                </Typography>
                <Typography variant="h5" mb={1}>
                  {data[0].trade_name}
                </Typography>
              </Box>
            </Box>
            <Divider />
            <Stack direction="row" spacing={2} py={2} alignItems="center">
              <Box>
                <Typography variant="h6">Email</Typography>
              </Box>
              <Box sx={{ ml: "auto !important" }}>
                <Typography variant="h5" color="textSecondary">
                  {data[0].email ?? "-"}
                </Typography>
              </Box>
            </Stack>
            <Divider />
            <Divider />
            <Stack direction="row" spacing={2} py={2} alignItems="center">
              <Box>
                <Typography variant="h6">Phone</Typography>
              </Box>
              <Box sx={{ ml: "auto !important" }}>
                <Typography variant="h5" color="textSecondary">
                  {data[0].phone ?? "-"}
                </Typography>
              </Box>
            </Stack>
            <Divider />
              <Stack direction="row" spacing={2} py={2} alignItems="center">
              <Box>
                <Typography variant="h6">Digital Card</Typography>
              </Box>
              <Box sx={{ ml: "auto !important" }}>
                  <IconMedal
                      size={25}
                      color="#888"
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                          setSelectedUser(data[0]);
                          setOpenIdCard(true);
                      }}
                  />
              </Box>
            </Stack>
            <Divider />
          </CardContent>
        </BlankCard>
      </Grid>
        
      {openIdCard && (
        <DigitalIDCard
            open={openIdCard}
            onClose={() => setOpenIdCard(false)}
            user={selectedUser}
        />
      )}
    </Grid>
  );
};

export default TablePagination;
