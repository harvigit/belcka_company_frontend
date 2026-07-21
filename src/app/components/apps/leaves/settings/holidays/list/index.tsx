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
  Tooltip,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Menu,
  ListItemIcon,
  Popover,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import {
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import {
  IconDotsVertical,
  IconEdit,
  IconEye,
  IconNotes,
  IconPlus,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import toast from "react-hot-toast";
import ArchiveHoliday from "../archive";
import AddHoliday from "../create";
import EditHoliday from "../edit";
import { AxiosResponse } from "axios";
import Image from "next/image";
import SkeletonLoader from "@/app/components/SkeletonLoader";

dayjs.extend(customParseFormat);

export type HolidayItem = {
  id: number;
  company_id: number;
  company_name: string;
  added_by: number;
  added_by_name: string;
  title: string;
  start_date: string;
  end_date: string;
  total_day: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

import { useServerTable } from "@/hooks/useServerTable";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";

const HolidayList = () => {
  const [data, setData] = useState<HolidayItem[]>([]);
  const [fetchingHolidays, setFetchingHolidays] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const handleSelectAllAcrossPages = async (checked: boolean) => {
    if (!checked) {
      setSelectedRowIds(new Set());
      return;
    }
    try {
      (window as any).__isSelectingAll = true;
      await fetchHolidays();
      if ((window as any).__lastFetchedIds) {
        setSelectedRowIds(new Set((window as any).__lastFetchedIds));
      }
    } catch (err: any) {
      if (err.message !== 'SELECT_ALL_INTERCEPT') {
        console.error(err);
      }
    } finally {
      (window as any).__isSelectingAll = false;
      }
  }

  const [openArchiveDialog, setOpenArchiveDialog] = useState(false);
  const [holidaysToArchive, setHolidaysToArchive] = useState<number[]>([]);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [anchorElMenu, setAnchorElMenu] = useState<null | HTMLElement>(null);
  const [anchorElPopover, setAnchorElPopover] = useState<null | HTMLElement>(
    null,
  );
  const [columnSearch, setColumnSearch] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedHolidayId, setSelectedHolidayId] = useState<number>(0);
  const [archiveDrawerOpen, setArchiveDrawerOpen] = useState(false);

  const openMenu = Boolean(anchorElMenu);

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const { columnVisibility, onColumnVisibilityChange } = usePersistentColumnVisibility({
    storageKey: `cv_${user?.company_id}_${user?.id}_settings_holidays`,
    enabled: !!user?.id,
  });


  const fetchHolidays = async () => {
    setFetchingHolidays(true);
    try {
      let url = `holiday/get?company_id=${user.company_id}&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      const res: AxiosResponse<any> = await api.get(url);
      if (res.data?.info) {
        setData(res.data.info);
        setPageCount(res.data.data?.totalPages || 0);
        setTotalRows(res.data.data?.totalItems || 0);
      }

      console.log(data, "daata");
    } catch (err) {
      console.error("Failed to fetch holidays", err);
    } finally {
      setFetchingHolidays(false);
    }
  };

  const formatDate = (date: string) => {
    if (!date) return "-";

    const parsed = dayjs(date, "DD/MM/YYYY", true);
    if (parsed.isValid()) {
      return parsed.format("DD/MM/YYYY");
    }
    const iso = dayjs(date);

    return iso.isValid() ? iso.format("DD/MM/YYYY") : "-";
  };

  const handleEdit = useCallback((id: number) => {
    setSelectedHolidayId(id);
    setOpenEdit(true);
  }, []);

  const filteredData = useMemo(() => {
    return data;
  }, [data]);

  const columnHelper = createColumnHelper<HolidayItem>();

  const columns = [
    {
      id: "select",
      header: () => (
        <Stack direction="row" alignItems="center">
          <CustomCheckbox
            checked={
              selectedRowIds.size === filteredData.length &&
              filteredData.length > 0
            }
            indeterminate={
              selectedRowIds.size > 0 &&
              selectedRowIds.size < filteredData.length
            }
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            onChange={(e) => { e.stopPropagation(); e.preventDefault(); handleSelectAllAcrossPages(e.target.checked); }}
          />
        </Stack>
      ),
      cell: ({ row }: any) => {
        const item = row.original as HolidayItem;
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
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                e.stopPropagation();
                const next = new Set(selectedRowIds);
                isChecked ? next.delete(item.id) : next.add(item.id);
                setSelectedRowIds(next);
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
    columnHelper.accessor("title", {
      id: "title",
      header: () => (
        <Typography variant="subtitle2" fontWeight="inherit">
          Title
        </Typography>
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <Typography className="f-14">{row.original.title ?? "-"}</Typography>
      ),
    }),
    columnHelper.accessor("start_date", {
      id: "start_date",
      header: () => (
        <Typography variant="subtitle2" fontWeight="inherit">
          Start Date
        </Typography>
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <Typography className="f-14">
          {formatDate(row.original.start_date)}
        </Typography>
      ),
    }),
    columnHelper.accessor("end_date", {
      id: "end_date",
      header: () => (
        <Typography variant="subtitle2" fontWeight="inherit">
          End Date
        </Typography>
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <Typography className="f-14">
          {formatDate(row.original.end_date)}
        </Typography>
      ),
    }),
    columnHelper.accessor("total_day", {
      id: "total_day",
      header: () => (
        <Typography variant="subtitle2" fontWeight="inherit">
          Total Days
        </Typography>
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <Typography className="f-14">
          {row.original.total_day ?? "-"}
        </Typography>
      ),
    }),
    columnHelper.accessor("added_by_name", {
      id: "added_by_name",
      header: () => (
        <Typography variant="subtitle2" fontWeight="inherit">
          Added By
        </Typography>
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <Typography className="f-14">
          {row.original.added_by_name ?? "-"}
        </Typography>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Box display="flex" gap={1} alignItems="center">
            <Tooltip title="Edit">
              <IconButton onClick={() => handleEdit(item.id)} color="primary">
                <IconEdit size={18} />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    }),
  ];

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
    fetchData: () => {
      if (user?.company_id) fetchHolidays();
    },
    debounceDependencies: [searchTerm, user?.company_id],
    state: { columnVisibility },
    onColumnVisibilityChange,
  });

  const simpleColumns = columns.map((col) => ({
    name: col.id ?? "Unnamed Column",
    width: "auto",
  }));

  return (
    <Box
      sx={{
        height: "calc(100vh - 100px)",
        display: "flex",
        flexDirection: "column",
      }}
      mt={2}
    >
      {/* Toolbar */}
      <Stack
        mr={2}
        ml={2}
        mb={2}
        justifyContent="space-between"
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 1, sm: 2, md: 4 }}
      >
        <Grid display="flex" gap={1} alignItems="center">
          <TextField
            size="small"
            variant="outlined"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconSearch size={16} />
                  </InputAdornment>
                ),
              },
            }}
          />
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
                setHolidaysToArchive(Array.from(selectedRowIds));
                setOpenArchiveDialog(true);
              }}
            >
              Archive
            </Button>
          )}

          {/* Column visibility */}
          <IconButton
            onClick={(e) => setAnchorElPopover(e.currentTarget)}
            sx={{ ml: 1 }}
            color="primary"
          >
            <IconEye />
          </IconButton>
          <Popover
            open={Boolean(anchorElPopover)}
            anchorEl={anchorElPopover}
            onClose={() => setAnchorElPopover(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            PaperProps={{ sx: { width: 220, p: 1, borderRadius: 2 } }}
          >
            <TextField
              size="small"
              placeholder="Search"
              fullWidth
              value={columnSearch}
              onChange={(e) => setColumnSearch(e.target.value)}
              sx={{ mb: 1 }}
            />
            <FormGroup>
              {table
                .getAllLeafColumns()
                .filter((col: any) => {
                  const excluded = ["select", "actions"];
                  if (excluded.includes(col.id)) return false;
                  return col.id
                    .toLowerCase()
                    .includes(columnSearch.toLowerCase());
                })
                .map((col: any) => (
                  <FormControlLabel
                    key={col.id}
                    control={
                      <CustomCheckbox
                          checked={col.getIsVisible()}
                        onChange={col.getToggleVisibilityHandler()}
                      />
                    }
                    label={
                      col.columnDef.meta?.label ||
                      (typeof col.columnDef.header === "string" &&
                      col.columnDef.header.trim() !== ""
                        ? col.columnDef.header
                        : col.id
                            .replace(/([A-Z])/g, " $1")
                            .replace(/^./, (s: string) => s.toUpperCase())
                            .trim())
                    }
                    sx={{ textTransform: "none" }}
                  />
                ))}
            </FormGroup>
          </Popover>

          {/* Dot menu */}
          <IconButton
            onClick={(e) => setAnchorElMenu(e.currentTarget)}
            sx={{ margin: "0px" }}
          >
            <IconDotsVertical width={18} />
          </IconButton>
          <Menu
            anchorEl={anchorElMenu}
            open={openMenu}
            onClose={() => setAnchorElMenu(null)}
          >
            <MenuItem
              onClick={() => {
                setAnchorElMenu(null);
                setOpenAdd(true);
              }}
            >
              <ListItemIcon>
                <IconPlus width={18} />
              </ListItemIcon>
              Add Holiday
            </MenuItem>
            <MenuItem
              onClick={() => {
                setAnchorElMenu(null);
                setArchiveDrawerOpen(true);
              }}
            >
              <ListItemIcon>
                <IconNotes width={18} />
              </ListItemIcon>
              Archived Holiday List
            </MenuItem>
          </Menu>
        </Stack>
      </Stack>

      {/* Archive drawer */}
      <ArchiveHoliday
        open={archiveDrawerOpen}
        onClose={() => setArchiveDrawerOpen(false)}
        onWorkUpdated={fetchHolidays}
      />

      <Divider />

      {/* Table */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        <TableContainer>
          <Table stickyHeader aria-label="holiday table">
            <TableHead>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isActive = header.column.getIsSorted();
                    const isAsc = isActive === "asc";
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
                        }}
                      >
                        <Box
                          onClick={header.column.getToggleSortingHandler()}
                          sx={{
                            cursor: isSortable ? "pointer" : "default",
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
                                opacity: isActive ? 1 : 0,
                                transition: "opacity 0.2s",
                                fontSize: "0.9rem",
                                color: isActive ? "#000" : "#888",
                                display: "flex",
                                alignItems: "center",
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
              {fetchingHolidays ? (
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
                        width={200}
                        height={200}
                        style={{ maxWidth: "100%", maxHeight: "100%" }}
                      />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} hover sx={{ cursor: "pointer" }}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} sx={{ padding: "10px" }}>
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
        {data.length > 0 && <Divider />}
      </Box>

      <Divider />

      {/* Add Holiday Dialog */}
      <Dialog
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          <Typography color="GrayText" fontWeight={700}>
            Add Holiday
          </Typography>
          <IconButton
            onClick={() => setOpenAdd(false)}
            sx={{ position: "absolute", right: 12, top: 8 }}
          >
            <IconX size={24} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <AddHoliday
            open={openAdd}
            onClose={() => setOpenAdd(false)}
            onWorkUpdated={() => {
              fetchHolidays();
              setOpenAdd(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Holiday Dialog */}
      <Dialog
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          <Typography color="GrayText" fontWeight={700}>
            Edit Holiday
          </Typography>
          <IconButton
            onClick={() => setOpenEdit(false)}
            sx={{ position: "absolute", right: 12, top: 8 }}
          >
            <IconX size={24} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <EditHoliday
            id={selectedHolidayId}
            open={openEdit}
            onClose={() => setOpenEdit(false)}
            onWorkUpdated={() => {
              fetchHolidays();
              setOpenEdit(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Archive confirm dialog */}
      <Dialog
        open={openArchiveDialog}
        onClose={() => setOpenArchiveDialog(false)}
      >
        <DialogTitle>Confirm Archive</DialogTitle>
        <DialogContent>
          <Typography color="textSecondary">
            Are you sure you want to archive the selected holiday?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenArchiveDialog(false)}
            variant="outlined"
            color="primary"
          >
            Cancel
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={async () => {
              try {
                const payload = { holiday_ids: holidaysToArchive.join(",") };
                const response: AxiosResponse<any> = await api.post(
                  "holiday/archive",
                  payload,
                );
                toast.success(response.data.message);
                setSelectedRowIds(new Set());
                await fetchHolidays();
              } catch {
                toast.error("Failed to archive holiday");
              } finally {
                setOpenArchiveDialog(false);
              }
            }}
          >
            Archive
          </Button>
        </DialogActions>
      </Dialog>

      <TablePaginationFooter selectedCount={typeof selectedRowIds !== "undefined" ? selectedRowIds.size : undefined} table={table} totalRows={totalRows} />
    </Box>
  );
};

export default HolidayList;
