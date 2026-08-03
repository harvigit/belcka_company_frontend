"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
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
  Menu,
  ListItemIcon,
  Tooltip,
  Popover,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { flexRender, createColumnHelper } from "@tanstack/react-table";
import {
  IconEye,
  IconFilter,
  IconNotes,
  IconRotate,
  IconSearch,
  IconTrash,
  IconUsersGroup,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Avatar } from "@mui/material";
import Link from "next/link";
import { IconDotsVertical } from "@tabler/icons-react";
import { IconX } from "@tabler/icons-react";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import { IconPlus } from "@tabler/icons-react";
import toast from "react-hot-toast";
import { TradeList } from "../team";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import GenerateCodeDialog from "../../modals/generate-code";
import { IconEdit } from "@tabler/icons-react";
import { useRouter, useSearchParams } from "next/navigation";
import ArchiveTeam from "../archive";
import PermissionGuard from "@/app/auth/PermissionGuard";
import CreateTeam from "../create";
import TeamMembersLimit from "../team-members-limit";
import EditTeam from "../edit";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import Image from "next/image";

dayjs.extend(customParseFormat);

export type TeamList = {
  id: number;
  team_id: number;
  team_member_ids: number[];
  supervisor_id: number;
  supervisor_name?: string;
  supervisor_image?: string;
  supervisor_email?: string;
  supervisor_phone?: string;
  max_members?: number;
  team_member_count?: number;
  working_member_count?: number;
  subcontractor_company_name?: string;
  is_subcontractor?: boolean;
  company_id?: number;
  subcontractor_company_id?: number;
  team_name?: string;
  name?: string;
  image?: string;
  is_active?: boolean;
  trade_id?: number;
  trade_name?: string;
  users: any;
};

export type UserList = {
  id: number;
  name: string;
};

import { useServerTable } from "@/hooks/useServerTable";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";

const TablePagination = () => {
  const session = useSession();
  const id = session.data?.user as User & {
    company_id?: number | null;
    id?: string;
  };

  const { columnVisibility, onColumnVisibilityChange } =
    usePersistentColumnVisibility({
      storageKey: `cv_${id?.company_id}_${id?.id}_teamList`,
      enabled: !!id?.id,
    });

  const [data, setData] = useState<TeamList[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchTeam, setFetchTeam] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const rerender = React.useReducer(() => ({}), {})[1];
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const handleSelectAllRows = (checked: boolean) => {
    if (checked) {
      const allIds = data.map((item: any) => item.team_id);
      setSelectedRowIds(new Set(allIds));
    } else {
      setSelectedRowIds(new Set());
    }
  };

  const [archiveDrawerOpen, setarchiveDrawerOpen] = useState(false);
  const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);
  const [search, setSearch] = useState("");

  const [filters, setFilters] = useState({
    team: "",
    supervisor: "",
  });

  const [tempFilters, setTempFilters] = useState(filters);
  const [open, setOpen] = useState(false);

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [trade, setTrade] = useState<TradeList[]>([]);
  const [usersToDelete, setUsersToDelete] = useState<number[]>([]);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [openGenerateDialog, setOpenGenerateDialog] = useState(false);
  const router = useRouter();
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const searchParams = useSearchParams();
  const projectId = searchParams ? searchParams.get("project_id") : "";
  const [createDrawer, setCreateDrawer] = useState(false);
  const [editDrawer, setEditDrawer] = useState(false);
  const [editTeamId, setEditTeamId] = useState<number | null>(null);
  const [teamMembersLimit, setTeamMembersLimit] = useState(false);

  const handleEditClick = (teamId: number) => {
    setEditTeamId(teamId);
    setEditDrawer(true);
  };
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Fetch data
  const fetchTeams = async (restorePage?: number) => {
    setFetchTeam(true);
    try {
      let url = `team/get-team-member-list?page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;

      if (projectId) {
        url += `&project_id=${projectId}`;
      }
      if (searchTerm) {
        url += `&search=${searchTerm}`;
      }
      if (filters.team && filters.team !== "All") {
        url += `&team_ids=${filters.team}`;
      }
      if (filters.supervisor && filters.supervisor !== "All") {
        url += `&supervisor_ids=${filters.supervisor}`;
      }

      const res = await api.get(url);
      if (res.data) {
        const responseData =
          res.data.info?.data || res.data.info || res.data.data || [];
        setData(responseData);

        const pagMeta =
          res.data.data?.totalPages !== undefined ||
          res.data.data?.totalItems !== undefined
            ? res.data.data
            : res.data.info && res.data.info.totalPages !== undefined
              ? res.data.info
              : res.data.data || {};

        if (pagMeta.totalItems !== undefined) {
          setTotalRows(pagMeta.totalItems);
        } else if (pagMeta.total !== undefined) {
          setTotalRows(pagMeta.total);
        }

        if (pagMeta.totalPages !== undefined) {
          setPageCount(pagMeta.totalPages);
        } else if (pagMeta.last_page !== undefined) {
          setPageCount(pagMeta.last_page);
        }

        if (restorePage !== undefined) {
          setTimeout(() => {
            setPagination((prev) => ({ ...prev, pageIndex: restorePage }));
          }, 0);
        }
      }
    } catch (err) {
      console.error("Failed to fetch trades", err);
    } finally {
      setFetchTeam(false);
    }
  };

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await api.get(
          `get-company-resources?flag=tradeList&company_id=${id.company_id}`,
        );
        if (res.data) setTrade(res.data.info);
      } catch (err) {
        console.error("Failed to fetch trades", err);
      }
    };
    fetchTrades();
  }, [id?.company_id]);

  const handleGenerateCode = async (): Promise<string> => {
    try {
      const response = await api.post(
        `team/company-generate-code?company_id=${id.company_id}`,
      );
      toast.success(response.data.message);
      return response.data.info.company_otp;
    } catch (error) {
      // toast.error("Failed to generate code.");
      throw error;
    }
  };

  // UseCallback to memoize these functions
  const handleEdit = useCallback(
    (id: number) => {
      router.push(`/apps/teams/edit/${id}`);
    },
    [router],
  );

  const handleDeleteClick = (teamId: number) => {
    setSelectedTeamId(teamId);
    setOpenConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedTeamId) {
      try {
        const payload = {
          team_id: Number(selectedTeamId),
          company_id: Number(id.company_id),
        };
        const response = await api.post(`team/delete-subcontractor`, payload);
        toast.success(response.data.message);
        fetchTeams();
      } catch (error) {
        console.error("Failed to remove users", error);
      } finally {
        setConfirmOpen(false);
      }
    }
    setOpenConfirm(false);
    setSelectedTeamId(null);
  };

  const handleCancelDelete = () => {
    setOpenConfirm(false);
    setSelectedTeamId(null);
  };

  const uniqueTrades = useMemo(() => {
    const map = new Map();
    data.forEach((item) => {
      if (item.name && item.team_id) {
        map.set(item.team_id, item.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [data]);

  const uniqueSupervisors = useMemo(() => {
    const map = new Map();
    data.forEach((item) => {
      if (item.supervisor_name && item.supervisor_id) {
        map.set(item.supervisor_id, item.supervisor_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [data]);

  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = React.useState(false);

  React.useEffect(() => {
    const checkScroll = () => {
      if (tableContainerRef.current) {
        setIsScrollable(
          tableContainerRef.current.scrollWidth >
            tableContainerRef.current.clientWidth,
        );
      }
    };
    checkScroll();
    window.addEventListener("resize", checkScroll);

    const observer = new MutationObserver(checkScroll);
    if (tableContainerRef.current) {
      observer.observe(tableContainerRef.current, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    return () => {
      window.removeEventListener("resize", checkScroll);
      observer.disconnect();
    };
  }, []);

  const columnHelper = createColumnHelper<TeamList>();
  const columns = [
    {
      id: "select",
      header: ({ table }: any) => (
        <Stack direction="row" alignItems="center">
          <CustomCheckbox
            className="header-checkbox"
            checked={
              selectedRowIds.size > 0 && selectedRowIds.size >= data.length
            }
            indeterminate={
              selectedRowIds.size > 0 && selectedRowIds.size < data.length
            }
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleSelectAllRows(e.target.checked);
            }}
          />
        </Stack>
      ),
      cell: ({ row }: any) => {
        const item = row.original;
        const isChecked = selectedRowIds.has(item.team_id);
        const isHovered = hoveredRow === item.team_id;
        const showCheckbox = isChecked || isHovered;
        const subcontractor =
          item.is_subcontractor === true &&
          item.company_id !== item.subcontractor_company_id;
        return (
          <Stack
            direction="row"
            alignItems="center"
            onMouseEnter={() => setHoveredRow(item.team_id)}
            onMouseLeave={() => setHoveredRow(null)}
            sx={{ pl: 1 }}
          >
            <CustomCheckbox
              checked={isChecked}
              onClick={(e) => e.stopPropagation()}
              disabled={subcontractor}
              onChange={(e) => {
                e.stopPropagation();
                e.preventDefault();
                const newSelected = new Set(selectedRowIds);
                if (isChecked) {
                  newSelected.delete(item.team_id);
                } else {
                  newSelected.add(item.team_id);
                }
                setSelectedRowIds(newSelected);
              }}
              sx={{
                opacity: showCheckbox ? 1 : 0,
                pointerEvents: showCheckbox ? "auto" : "none",
                transition: "opacity 0.2s ease",
              }}
            />
          </Stack>
        );
      },
    },
    columnHelper.accessor("name", {
      id: "name",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <Typography variant="subtitle2" fontWeight="inherit">
            Name
          </Typography>
        </Stack>
      ),
      enableSorting: true,

      cell: ({ row }) => {
        const item = row.original;

        const shouldHighlight =
          item.is_subcontractor === true &&
          item.company_id !== item.subcontractor_company_id;

        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Link href={`/apps/teams/team?team_id=${item.team_id}`} passHref>
              <Typography
                className="f-14"
                color={shouldHighlight ? "secondary" : "textPrimary"}
                sx={{ cursor: "pointer", "&:hover": { color: "#173f98" } }}
              >
                {item.name ?? "-"}
              </Typography>
            </Link>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.subcontractor_company_name, {
      id: "subcontractorCompanyName",
      header: () => "Company",
      cell: (info) => {
        return (
          <Typography className="f-14" color="textPrimary" sx={{ px: 1.5 }}>
            {info.getValue() ?? "-"}
          </Typography>
        );
      },
    }),

    columnHelper.accessor("supervisor_name", {
      id: "supervisorName",
      header: () => "Supervisor",
      cell: (info) => {
        const row = info.row.original;
        const name = info.getValue();
        const image = row.supervisor_image;
        const defaultImage = "/images/users/user.png";

        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Avatar
              src={image ? image : ""}
              alt={name}
              sx={{ width: 36, height: 36 }}
            />
            <Box sx={{ px: 1.5 }}>
              <Typography className="f-14" color="textPrimary">
                {name ?? "-"}
              </Typography>
            </Box>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.max_members, {
      id: "teamMemberLimit",
      header: () => "Member Limit",
      cell: (info) => {
        return (
          <Typography className="f-14" color="textPrimary" sx={{ px: 1.5 }}>
            {info.getValue()}
          </Typography>
        );
      },
    }),

    columnHelper.accessor((row) => row?.team_member_count, {
      id: "teamMemberCount",
      header: () => "Online",
      cell: (info) => {
        const row = info.row.original;
        const users = row.working_member_count;

        return (
          <Typography className="f-14" color="textPrimary" sx={{ px: 1.5 }}>
            {users + `/` + info.getValue()}
          </Typography>
        );
      },
    }),

    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
        const subcontractor =
          item.is_subcontractor === true &&
          item.company_id !== item.subcontractor_company_id;
        return (
          <Stack direction="row" spacing={1}>
            {subcontractor && (
              <Tooltip title="Delete">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(item.team_id);
                  }}
                  color="error"
                >
                  <IconTrash size={18} />
                </IconButton>
              </Tooltip>
            )}
            {!subcontractor && (
              <Tooltip title="Edit">
                <IconButton
                  onClick={() => handleEditClick(item.team_id)}
                  color="primary"
                >
                  <IconEdit size={18} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        );
      },
    }),
  ];

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl2(event.currentTarget);
  };
  const handlePopoverClose = () => setAnchorEl2(null);

  const {
    table,
    pagination,
    setPagination,
    pageCount,
    setPageCount,
    totalRows,
    setTotalRows,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
  } = useServerTable({
    data,
    columns,
    fetchData: fetchTeams,
    debounceDependencies: [searchTerm, filters, projectId],
    state: { columnVisibility },
    onColumnVisibilityChange,
  });
  const rows = table.getRowModel().rows;

  const simpleColumns = columns.map((column) => ({
    name: column.id ?? "Unnamed Column",
    width: "auto",
  }));

  return (
    <PermissionGuard permission="Teams">
      <Box
        sx={{
          height: "calc(100vh - 100px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Render the search and table */}
        <Stack
          mr={2}
          ml={2}
          mb={2}
          justifyContent="space-between"
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 1, sm: 2, md: 4 }}
        >
          <Grid display="flex" alignItems={"center"}>
            <TextField
              id="search"
              type="text"
              size="small"
              variant="outlined"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconSearch size={"16"} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              variant="contained"
              onClick={() => setOpen(true)}
              sx={{ mt: { xs: 1, sm: 0 }, ml: 1, minWidth: "40px", px: 1 }}
            >
              <IconFilter width={18} />
            </Button>
            <Dialog
              open={open}
              onClose={() => setOpen(false)}
              fullWidth
              maxWidth="sm"
            >
              <DialogTitle
                sx={{ m: 0, position: "relative", overflow: "visible" }}
              >
                Filters
                <IconButton
                  aria-label="close"
                  onClick={() => setOpen(false)}
                  size="large"
                  sx={{
                    position: "absolute",
                    right: 12,
                    top: 8,
                    color: (theme) => theme.palette.grey[900],
                    backgroundColor: "transparent",
                    zIndex: 10,
                    width: 50,
                    height: 50,
                  }}
                >
                  <IconX size={40} style={{ width: 40, height: 40 }} />
                </IconButton>
              </DialogTitle>
              <DialogContent>
                <Stack spacing={2} mt={1}>
                  <TextField
                    select
                    label="Team"
                    value={tempFilters.team}
                    onChange={(e) =>
                      setTempFilters({ ...tempFilters, team: e.target.value })
                    }
                    fullWidth
                  >
                    <MenuItem value="All">All</MenuItem>
                    {uniqueTrades.map((trade) => (
                      <MenuItem key={trade.id} value={trade.id}>
                        {trade.name}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    label="Supervisor"
                    value={tempFilters.supervisor}
                    onChange={(e) =>
                      setTempFilters({
                        ...tempFilters,
                        supervisor: e.target.value,
                      })
                    }
                    fullWidth
                  >
                    <MenuItem value="All">All</MenuItem>
                    {uniqueSupervisors.map((supervisor, i) => (
                      <MenuItem key={supervisor.id} value={supervisor.id}>
                        {supervisor.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>
              </DialogContent>

              <DialogActions>
                <Button
                  onClick={() => {
                    setTempFilters({
                      team: "",
                      supervisor: "",
                    });
                    setFilters({
                      team: "",
                      supervisor: "",
                    });
                    setOpen(false);
                  }}
                  color="inherit"
                >
                  Clear
                </Button>

                <Button
                  variant="contained"
                  onClick={() => {
                    setFilters(tempFilters);
                    setOpen(false);
                  }}
                >
                  Apply
                </Button>
              </DialogActions>
            </Dialog>
          </Grid>
          <Stack
            mb={2}
            justifyContent="end"
            direction={{ xs: "column", sm: "row" }}
          >
            {selectedRowIds.size > 0 && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<IconTrash width={18} />}
                onClick={() => {
                  const selectedIds = Array.from(selectedRowIds);
                  setUsersToDelete(selectedIds);
                  setConfirmOpen(true);
                }}
              >
                Archive
              </Button>
            )}

            <IconButton
              onClick={handlePopoverOpen}
              sx={{ ml: 1 }}
              color="primary"
            >
              <IconEye />
            </IconButton>
            <Popover
              open={Boolean(anchorEl2)}
              anchorEl={anchorEl2}
              onClose={handlePopoverClose}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              PaperProps={{
                sx: {
                  width: 280,
                  mt: 1,
                  p: 1,
                  borderRadius: 2,
                  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.14)",
                  border: "1px solid #e5e7eb",
                  maxHeight: "min(420px, calc(100vh - 140px))",
                  overflow: "hidden",
                },
              }}
            >
              <TextField
                size="small"
                placeholder="Search columns..."
                fullWidth
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{
                  mb: 1,
                  "& .MuiInputBase-root": {
                    borderRadius: 1.5,
                    backgroundColor: "#fff",
                  },
                }}
              />
              <Box
                sx={{
                  maxHeight: "calc(min(420px, calc(100vh - 140px)) - 64px)",
                  overflowY: "auto",
                  pr: 0.5,
                }}
              >
                <FormGroup sx={{ gap: 0.25 }}>
                  {(() => {
                    const columnOptions = table
                      .getAllLeafColumns()
                      .filter((col: any) => {
                        const excludedColumns = ["conflicts", "select"];
                        if (excludedColumns.includes(col.id)) return false;

                        return col.id
                          .toLowerCase()
                          .includes(search.toLowerCase());
                      });
                    const allSelected =
                      columnOptions.length > 0 &&
                      columnOptions.every((col: any) => col.getIsVisible());
                    const someSelected = columnOptions.some((col: any) =>
                      col.getIsVisible(),
                    );

                    return (
                      <>
                        <FormControlLabel
                          control={
                            <CustomCheckbox
                              size="small"
                              checked={allSelected}
                              indeterminate={!allSelected && someSelected}
                              disabled={columnOptions.length === 0}
                              onChange={(e) => {
                                e.stopPropagation();
                                columnOptions.forEach((col: any) =>
                                  col.toggleVisibility(e.target.checked),
                                );
                              }}
                              onClick={(e) => e.stopPropagation()}
                              sx={{
                                p: 0.5,
                                mr: 1,
                              }}
                            />
                          }
                          sx={{
                            m: 0,
                            px: 0.75,
                            py: 0.375,
                            width: "100%",
                            borderRadius: 1.5,
                            alignItems: "center",
                            textTransform: "none",
                            borderBottom: "1px solid #eef2f7",
                            mb: 0.25,
                            "&:hover": {
                              backgroundColor: "#f8fafc",
                            },
                            "& .MuiFormControlLabel-label": {
                              fontSize: "14px",
                              lineHeight: 1.35,
                              whiteSpace: "nowrap",
                              fontWeight: 600,
                            },
                          }}
                          onClick={(e) => e.stopPropagation()}
                          label="Select All"
                        />
                        {columnOptions.map((col: any) => (
                          <FormControlLabel
                            key={col.id}
                            control={
                              <CustomCheckbox
                                size="small"
                                checked={col.getIsVisible()}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  col.getToggleVisibilityHandler()(e);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                sx={{
                                  p: 0.5,
                                  mr: 1,
                                }}
                              />
                            }
                            sx={{
                              m: 0,
                              px: 0.75,
                              py: 0.375,
                              width: "100%",
                              borderRadius: 1.5,
                              alignItems: "center",
                              textTransform: "none",
                              "&:hover": {
                                backgroundColor: "#f8fafc",
                              },
                              "& .MuiFormControlLabel-label": {
                                fontSize: "14px",
                                lineHeight: 1.35,
                                whiteSpace: "nowrap",
                              },
                            }}
                            onClick={(e) => e.stopPropagation()}
                            label={
                              col.columnDef.meta?.label ||
                              (typeof col.columnDef.header === "string" &&
                              col.columnDef.header.trim() !== ""
                                ? col.columnDef.header
                                : col.id
                                    .replace(/([A-Z])/g, " $1")
                                    .replace(/^./, (str: string) =>
                                      str.toUpperCase(),
                                    )
                                    .trim())
                            }
                          />
                        ))}
                      </>
                    );
                  })()}
                </FormGroup>
              </Box>
            </Popover>
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogContent>
                <Typography color="textSecondary">
                  Are you sure you want to archive {usersToDelete.length} team
                  {usersToDelete.length > 1 ? "s" : ""} from the teams?
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => setConfirmOpen(false)}
                  variant="outlined"
                  color="primary"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      const payload = {
                        team_ids: usersToDelete.join(","),
                      };
                      const response = await api.post(
                        "team/archive-teams",
                        payload,
                      );
                      toast.success(response.data.message);
                      setSelectedRowIds(new Set());
                      await fetchTeams();
                    } catch (error) {
                    } finally {
                      setConfirmOpen(false);
                    }
                  }}
                  variant="outlined"
                  color="error"
                >
                  Archive
                </Button>
              </DialogActions>
            </Dialog>
            {/* delete subcontractor team */}
            <Dialog open={openConfirm} onClose={handleCancelDelete}>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogContent>
                <Typography>
                  Are you sure you want to remove this subcontractor team?
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCancelDelete}>Cancel</Button>
                <Button
                  onClick={handleConfirmDelete}
                  color="error"
                  variant="contained"
                >
                  Delete
                </Button>
              </DialogActions>
            </Dialog>

            <IconButton
              sx={{ margin: "0px" }}
              id="basic-button"
              aria-controls={openMenu ? "basic-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={openMenu ? "true" : undefined}
              onClick={handleClick}
            >
              <IconDotsVertical width={18} />
            </IconButton>
            <Menu
              id="basic-menu"
              anchorEl={anchorEl}
              open={openMenu}
              onClose={handleClose}
              slotProps={{
                list: {
                  "aria-labelledby": "basic-button",
                },
              }}
            >
              <MenuItem onClick={handleClose}>
                <Link
                  color="body1"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setCreateDrawer(true);
                  }}
                  style={{
                    width: "100%",
                    color: "#11142D",
                    textTransform: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyItems: "center",
                  }}
                >
                  <ListItemIcon>
                    <IconPlus width={18} />
                  </ListItemIcon>
                  Add Team
                </Link>
              </MenuItem>
              <MenuItem onClick={handleClose}>
                <Link
                  color="body1"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setTeamMembersLimit(true);
                  }}
                  style={{
                    width: "100%",
                    color: "#11142D",
                    textTransform: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyItems: "center",
                  }}
                >
                  <ListItemIcon>
                    <IconUsersGroup width={18} />
                  </ListItemIcon>
                  Team Members Limit
                </Link>
              </MenuItem>

              <MenuItem onClick={handleClose}>
                <Link
                  color="body1"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setarchiveDrawerOpen(true);
                  }}
                  style={{
                    width: "100%",
                    color: "#11142D",
                    textTransform: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyItems: "center",
                  }}
                >
                  <ListItemIcon>
                    <IconNotes width={18} />
                  </ListItemIcon>
                  Archived List
                </Link>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setOpenGenerateDialog(true);
                  handleClose(); // close MUI menu
                }}
              >
                <ListItemIcon>
                  <IconRotate width={18} />
                </ListItemIcon>
                Generate Code
              </MenuItem>
            </Menu>

            <GenerateCodeDialog
              title="Generate Code"
              mode="generate"
              open={openGenerateDialog}
              onClose={() => setOpenGenerateDialog(false)}
              onGenerate={handleGenerateCode}
            />
          </Stack>
        </Stack>
        <Divider />

        {/* Archive team list */}
        <ArchiveTeam
          open={archiveDrawerOpen}
          onClose={() => setarchiveDrawerOpen(false)}
          onWorkUpdated={fetchTeams}
        />

        {/* Create team */}
        <CreateTeam
          open={createDrawer}
          onClose={() => setCreateDrawer(false)}
          onWorkUpdated={fetchTeams}
        />

        {/* Team Members Limit */}
        <TeamMembersLimit
          open={teamMembersLimit}
          onClose={() => setTeamMembersLimit(false)}
          onWorkUpdated={fetchTeams}
        />

        {editTeamId && (
          <EditTeam
            open={editDrawer}
            onClose={() => setEditDrawer(false)}
            teamId={editTeamId}
            teams={data}
            onWorkUpdated={fetchTeams}
          />
        )}

        <TableContainer
          ref={tableContainerRef}
          sx={{
            flex: 1,
            minHeight: 0,
            overflowX: "auto",
            overflowY: "auto",
          }}
        >
          <Table stickyHeader aria-label="sticky table">
            <TableHead>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isActive = header.column.getIsSorted();
                    const isAsc = header.column.getIsSorted() === "asc";
                    const isSortable = header.column.getCanSort();

                    return (
                      <TableCell
                        key={header.id}
                        align="center"
                        sx={{
                          paddingTop: "10px",
                          paddingBottom: "10px",
                          width:
                            header.column.id === "actions"
                              ? 120
                              : header.column.id === "select"
                                ? 30
                                : "auto",

                          ...(header.column.id === "actions" && {
                            position: "sticky",
                            right: 0,
                            backgroundColor: "background.paper",
                            zIndex: 3,
                            boxShadow: isScrollable
                              ? "-2px 0 4px -2px rgba(0,0,0,0.1)"
                              : "none",
                          }),
                        }}
                      >
                        <Box
                          onClick={header.column.getToggleSortingHandler()}
                          p={0}
                          sx={{
                            cursor: isSortable ? "pointer" : "default",
                            border: "2px solid transparent",
                            borderRadius: "6px",
                            display: "flex",
                            justifyContent: "flex-start",
                            "&:hover": { color: "#888" },
                            "&:hover .hoverIcon": { opacity: 1 },
                          }}
                        >
                          <Typography variant="subtitle2">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                          </Typography>
                          {isSortable && (
                            <Box
                              component="span"
                              className="hoverIcon"
                              ml={0.5}
                              sx={{
                                transition: "opacity 0.2s",
                                opacity: isActive ? 1 : 0,
                                fontSize: "0.9rem",
                                color: isActive ? "#000" : "#888",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              {isActive ? (isAsc ? "↑" : "↓") : "↑"}
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableHead>
            <TableBody>
              {fetchTeam ? (
                <SkeletonLoader
                  columns={simpleColumns}
                  rowCount={simpleColumns.length}
                  hasAvatar={true}
                />
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length}>
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
                        style={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                        }}
                        width={200}
                        height={200}
                      />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const item = row.original;
                  const isDisabled =
                    item.is_subcontractor === true &&
                    item.company_id !== item.subcontractor_company_id;

                  return (
                    <TableRow
                      key={row.id}
                      hover
                      sx={{
                        cursor: isDisabled ? "default" : "pointer",
                      }}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const isActionCell = cell.column.id === "actions";
                        const isCheckboxCell = cell.column.id === "name";

                        return (
                          <TableCell
                            key={cell.id}
                            sx={{
                              padding: "10px",
                              ...(cell.column.id === "actions" && {
                                position: "sticky",
                                right: 0,
                                backgroundColor: "background.paper",
                                zIndex: 1,
                                boxShadow: isScrollable
                                  ? "-2px 0 4px -2px rgba(0,0,0,0.1)"
                                  : "none",
                              }),
                            }}
                            onClick={() => {
                              if (
                                !isDisabled &&
                                !isActionCell &&
                                !isCheckboxCell
                              ) {
                                router.push(
                                  `/apps/teams/team?team_id=${row.original.team_id}`,
                                );
                              }
                            }}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {data.length ? <Divider /> : <></>}
        <Divider />
        <TablePaginationFooter
          selectedCount={
            typeof selectedRowIds !== "undefined"
              ? selectedRowIds.size
              : undefined
          }
          table={table}
          totalRows={totalRows}
        />
      </Box>
    </PermissionGuard>
  );
};

export default TablePagination;
