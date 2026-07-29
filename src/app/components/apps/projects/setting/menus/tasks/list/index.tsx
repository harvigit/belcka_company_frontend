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
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import Link from "next/link";
import { IconDotsVertical } from "@tabler/icons-react";
import { IconX } from "@tabler/icons-react";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import { IconPlus } from "@tabler/icons-react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import CreateTask from "../create";
import ArchiveTask from "../archive";
import { IconEdit } from "@tabler/icons-react";
import EditTask from "../edit";
import { AxiosResponse } from "axios";
import Image from "next/image";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import { useServerTable } from "@/hooks/useServerTable";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";

dayjs.extend(customParseFormat);

export interface TradeList {
  id: number;
  name: string;
  trade_id: number;
}

export type TaskList = {
  id: number;
  name: string;
  trade_id?: number;
  trade_name?: string;
  duration: string;
  repeatable_job: boolean;
  is_pricework: boolean;
  rate: string;
  units: string;
};

export type UserList = {
  id: number;
  name: string;
};

const TablePagination = () => {
  const [data, setData] = useState<TaskList[]>([]);
  const [fetchTask, setFetchTask] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const handleSelectAllRows = (checked: boolean) => {
    if (checked) {
      const allIds = data.map((item: any) => item.id);
      setSelectedRowIds(new Set(allIds));
    } else {
      setSelectedRowIds(new Set());
    }
  };

  const [filters, setFilters] = useState({
    team: "",
  });

  const [tempFilters, setTempFilters] = useState(filters);
  const [open, setOpen] = useState(false);

  const session = useSession();
  const id = session.data?.user as User & {
    company_id?: number | null;
    id?: string;
  };
  const { columnVisibility, onColumnVisibilityChange } =
    usePersistentColumnVisibility({
      storageKey: `cv_${id?.company_id}_${id?.id}_projects_tasks`,
      enabled: !!id?.id,
    });

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [trade, setTrade] = useState<TradeList[]>([]);
  const [usersToDelete, setUsersToDelete] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [archiveDrawerOpen, setarchiveDrawerOpen] = useState(false);
  const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);
  const [search, setSearch] = useState("");
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const [formData, setFormData] = useState<any>({
    id: 0,
    name: "",
    trade_id: "",
    company_id: id.company_id,
    duration: 0,
    rate: 0,
    units: "",
    is_pricework: false,
    repeatable_job: false,
  });

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const fetchTasks = async () => {
    setFetchTask(true);
    try {
      let url = `type-works/get?company_id=${id.company_id}&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
      if (searchTerm) {
        url += `&search=${searchTerm}`;
      }

      if (filters.team && filters.team !== "All") {
        const tradeId = trade.find((c) => c.name === filters.team)?.id;
        if (tradeId) {
          url += `&trade_ids=${tradeId}`;
        }
      }

      const res = await api.get(url);
      if (res.data) {
        setData(res.data.info || []);

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
        } else {
          setTotalRows((res.data.info || []).length);
        }

        if (pagMeta.totalPages !== undefined) {
          setPageCount(pagMeta.totalPages);
        } else if (pagMeta.last_page !== undefined) {
          setPageCount(pagMeta.last_page);
        }
        setarchiveDrawerOpen(false);
      }
    } catch (err) {
      console.error("Failed to fetch trades", err);
    } finally {
      setFetchTask(false);
    }
  };

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res: AxiosResponse<any> = await api.get(
          `get-company-resources?flag=tradeList&company_id=${id.company_id}`,
        );
        if (res.data) setTrade(res.data.info);
      } catch (err) {
        console.error("Failed to fetch trades", err);
      }
    };
    fetchTrades();
  }, [id.company_id]);

  const handleOpenCreateDrawer = () => {
    setFormData({
      name: "",
      trade_id: null,
      company_id: id.company_id,
      duration: 0,
      rate: 0,
      units: "",
      is_pricework: false,
      repeatable_job: false,
    });
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        repeatable_job: formData.is_pricework ? false : true,
        units: formData.is_pricework ? formData.units : null,
        duration: Number(formData.duration),
        rate: Number(formData.rate),
      };

      const result = await api.post("type-works/create", payload);
      if (result.data.IsSuccess == true) {
        toast.success(result.data.message);
        setFormData({
          id: 0,
          name: "",
          trade_id: 0,
          is_pricework: 0,
          units: "",
          repeatable_job: 0,
        });
        fetchTasks();
        setDrawerOpen(false);
      }
    } catch (error) {
      console.log(error, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const editTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    if (formData.is_pricework && !formData.rate) {
      toast.error("Please add rate!");
      setIsSaving(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        repeatable_job: formData.is_pricework ? false : true,
        duration: Number(formData.duration),
        rate: formData.is_pricework ? Number(formData.rate) : 0,
        units: formData.is_pricework ? formData.units : null,
      };

      const result = await api.put("type-works/update", payload);
      if (result.data.IsSuccess == true) {
        toast.success(result.data.message);
        setFormData({
          name: "",
          trade_id: 0,
          is_pricework: false,
          units: "",
          repeatable_job: false,
        });
        fetchTasks();
        setEditDrawerOpen(false);
      }
    } catch (error) {
      console.log(error, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const uniqueTrades = useMemo(
    () => [...new Set(trade.map((item) => item.name).filter(Boolean))],
    [trade],
  );

  const filteredData = data;

  // UseCallback to memoize these functions
  const handleEdit = useCallback((id: number) => {
    setSelectedTaskId(id);
    setEditDrawerOpen(true);
  }, []);

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

  const columnHelper = createColumnHelper<TaskList>();
  const columns = [
    {
      id: "select",
      header: ({ table }: any) => (
        <Stack direction="row" alignItems="center">
          <CustomCheckbox
            className="header-checkbox"
            checked={
              selectedRowIds.size === filteredData.length &&
              filteredData.length > 0
            }
            indeterminate={
              selectedRowIds.size > 0 &&
              selectedRowIds.size < filteredData.length
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
        const isChecked = selectedRowIds.has(item.id);
        const isHovered = hoveredRow === item.id;
        const showCheckbox = isChecked || isHovered;

        return (
          <Stack
            direction="row"
            alignItems="center"
            onMouseEnter={() => setHoveredRow(item.id)}
            onMouseLeave={() => setHoveredRow(null)}
            sx={{ pl: 1 }}
          >
            <CustomCheckbox
              checked={isChecked}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                e.preventDefault();
                const newSelected = new Set(selectedRowIds);
                if (isChecked) {
                  newSelected.delete(item.id);
                } else {
                  newSelected.add(item.id);
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

        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography
              className="f-14"
              sx={{
                minWidth: "150px",
                width: "100%",
                maxWidth: "500px",
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.15,
                wordBreak: "break-word",
              }}
            >
              {item.name ?? "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.trade_name, {
      id: "tradeName",
      header: () => "Trade",
      cell: (info) => {
        return (
          <Typography className="f-14" color="textPrimary" sx={{ px: 1.5 }}>
            {info.getValue() ?? "-"}
          </Typography>
        );
      },
    }),

    columnHelper.accessor((row) => row?.repeatable_job, {
      id: "repeatableJob",
      header: () => "Type",
      cell: (info) => {
        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box>
              <Typography className="f-14" color="textPrimary" sx={{ px: 1.5 }}>
                {info.getValue() ?? "-"}
              </Typography>
            </Box>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.duration, {
      id: "duration",
      header: () => "Duration",
      cell: (info) => {
        return (
          <Typography
            className="f-14"
            color="textPrimary"
            fontWeight={500}
            sx={{ px: 1.5 }}
          >
            {info.getValue() ?? "-"}
          </Typography>
        );
      },
    }),

    columnHelper.accessor((row) => row?.rate, {
      id: "rate",
      header: () => "Rate",
      cell: (info) => {
        return (
          <Typography className="f-14" color="textPrimary" sx={{ px: 1.5 }}>
            {info.getValue() ?? "-"}
          </Typography>
        );
      },
    }),

    columnHelper.accessor((row) => row?.units, {
      id: "units",
      header: () => "Units",
      cell: (info) => {
        return (
          <Typography className="f-14" color="textPrimary" sx={{ px: 1.5 }}>
            {info.getValue() ?? "-"}
          </Typography>
        );
      },
    }),

    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" spacing={1}>
            <Tooltip title="Edit">
              <IconButton onClick={() => handleEdit(item.id)} color="primary">
                <IconEdit size={18} />
              </IconButton>
            </Tooltip>
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
    data: filteredData,
    columns,
    fetchData: fetchTasks,
    debounceDependencies: [searchTerm, filters],
    state: { columnVisibility },
    onColumnVisibilityChange,
  });

  const simpleColumns = columns.map((column) => ({
    name: column.id ?? "Unnamed Column",
    width: "auto",
  }));

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
      mt={2}
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
        <Grid display="flex" gap={1} alignItems={"center"}>
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
            sx={{ mt: { xs: 1, sm: 0 }, minWidth: "40px", px: 1 }}
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
                  label="Trade"
                  value={tempFilters.team}
                  onChange={(e) =>
                    setTempFilters({ ...tempFilters, team: e.target.value })
                  }
                  fullWidth
                >
                  <MenuItem value="All">All</MenuItem>
                  {uniqueTrades.map((trade, i) => (
                    <MenuItem key={i} value={trade}>
                      {trade}
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
                  });
                  setFilters({
                    team: "",
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
              sx={{ marginRight: "5px" }}
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
                Are you sure you want to archive {usersToDelete.length} template
                {usersToDelete.length > 1 ? "s" : ""} from the templates?
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
                      work_ids: usersToDelete.join(","),
                    };
                    const response = await api.post(
                      "type-works/archive-works",
                      payload,
                    );
                    toast.success(response.data.message);
                    setSelectedRowIds(new Set());
                    await fetchTasks();
                  } catch (error) {
                    // toast.error("Failed to remove works");
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
                  handleOpenCreateDrawer();
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
                Add Template
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
          </Menu>
        </Stack>
      </Stack>
      <Divider />
      {/* Add task */}
      <CreateTask
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        formData={formData}
        setFormData={setFormData}
        handleSubmit={handleSubmit}
        trade={trade}
        isSaving={isSaving}
      />

      {/* Edit task */}
      <EditTask
        key={selectedTaskId}
        open={editDrawerOpen}
        onClose={() => setEditDrawerOpen(false)}
        id={selectedTaskId}
        formData={formData}
        setFormData={setFormData}
        EditTask={editTask}
        trade={trade}
        isSaving={isSaving}
      />

      {/* Archive task list */}
      <ArchiveTask
        open={archiveDrawerOpen}
        onClose={() => setarchiveDrawerOpen(false)}
        onWorkUpdated={fetchTasks}
      />

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
        }}
      >
        <TableContainer ref={tableContainerRef}>
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
              {fetchTask ? (
                <SkeletonLoader
                  columns={simpleColumns}
                  rowCount={simpleColumns.length}
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
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} hover sx={{ cursor: "pointer" }}>
                    {row.getVisibleCells().map((cell) => (
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
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {data.length ? <Divider /> : <></>}
      </Box>
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
  );
};

export default TablePagination;
