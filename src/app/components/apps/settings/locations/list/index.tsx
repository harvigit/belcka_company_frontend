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
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";
import {
  IconChevronLeft,
  IconChevronRight,
  IconFilter,
  IconNotes,
  IconSearch,
  IconTableColumn,
  IconTrash,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import Link from "next/link";
import { IconDotsVertical } from "@tabler/icons-react";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import { IconPlus } from "@tabler/icons-react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { IconEdit } from "@tabler/icons-react";
import CreateLocation from "../create";
import EditLocation from "../edit";
import ArchiveLocation from "../archive";
import Image from "next/image";
import SkeletonLoader from "@/app/components/SkeletonLoader";

dayjs.extend(customParseFormat);

export type LocationList = {
  id: number;
  name: string;
  company_name?: string;
};

const TablePagination = () => {
  const [data, setData] = useState<LocationList[]>([]);
  const [columnFilters, setColumnFilters] = useState<any>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchLocation, setFetchLocation] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([]);
  const [open, setOpen] = useState(false);

  const session = useSession();
  const id = session.data?.user as User & { company_id?: number | null };

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);
  const [confirmOpen, setConfirmOpen] = useState(false);
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
    company_id: id.company_id,
  });

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Fetch data
  const fetchLocations = async () => {
    setFetchLocation(true);
    try {
      const res = await api.get(
        `company-locations/get?company_id=${id.company_id}`
      );
      if (res.data) {
        setData(res.data.info);
        setarchiveDrawerOpen(false);
      }
    } catch (err) {
      console.error("Failed to fetch location", err);
    }
    setFetchLocation(false);
  };

  useEffect(() => {
    fetchLocations();
  }, [api]);

  const handleOpenCreateDrawer = () => {
    setFormData({
      name: "",
      company_id: id.company_id,
    });
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
      };

      const result = await api.post("company-locations/create", payload);
      if (result.data.IsSuccess == true) {
        toast.success(result.data.message);
        setFormData({
          id: 0,
          name: "",
        });
        fetchLocations();
        setDrawerOpen(false);
      } else {
        toast.error(result.data.message);
      }
    } catch (error) {
      console.log(error, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const editLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
      };

      const result = await api.put("company-locations/update", payload);
      if (result.data.IsSuccess == true) {
        toast.success(result.data.message);
        setFormData({
          name: "",
        });
        fetchLocations();
        setEditDrawerOpen(false);
      } else {
        toast.error(result.data.message);
      }
    } catch (error) {
      console.log(error, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const search = searchTerm.toLowerCase();

      const matchesSearch =
        item.name?.toLowerCase().includes(search) ||
        item.company_name?.toLowerCase().includes(search);

      return matchesSearch;
    });
  }, [data, searchTerm]);

  // UseCallback to memoize these functions
  const handleEdit = useCallback((id: number) => {
    setSelectedTaskId(id);
    setEditDrawerOpen(true);
  }, []);

  const columnHelper = createColumnHelper<LocationList>();
  const columns = [
    columnHelper.accessor("name", {
      id: "name",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <CustomCheckbox
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
              const isChecked = e.target.checked;

              if (isChecked) {
                setSelectedRowIds(new Set(filteredData.map((row) => row.id)));
              } else {
                setSelectedRowIds(new Set());
              }
            }}
          />
          <Typography variant="subtitle2" fontWeight="inherit">
            Name
          </Typography>
        </Stack>
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const item = row.original;
        const isChecked = selectedRowIds.has(item.id);
        const showCheckbox = isChecked || hoveredRow === item.id;

        return (
          <Stack
            direction="row"
            alignItems="center"
            spacing={4}
            sx={{ pl: 1 }}
            onMouseEnter={() => setHoveredRow(item.id)}
            onMouseLeave={() => setHoveredRow(null)}
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
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography className="f-14">{item.name ?? "-"}</Typography>
            </Stack>
          </Stack>
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

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { columnFilters, sorting },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  });

  // Reset to first page when search term changes
  useEffect(() => {
    table.setPageIndex(0);
  }, [searchTerm, table]);

    const simpleColumns = columns.map((column) => ({
    name: column.id ?? "Unnamed Column",
    width: "auto",
  }));


  return (
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
        <Grid display="flex" gap={1} alignItems={"center"}>
          <Button variant="contained" color="primary">
            LOCATIONS ({table.getPrePaginationRowModel().rows.length}){" "}
          </Button>
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
          <IconButton onClick={handlePopoverOpen} sx={{ ml: 1 }}>
            <IconTableColumn />
          </IconButton>
          <Popover
            open={Boolean(anchorEl2)}
            anchorEl={anchorEl2}
            onClose={handlePopoverClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            PaperProps={{ sx: { width: 220, p: 1, borderRadius: 2 } }}
          >
            <TextField
              size="small"
              placeholder="Search"
              fullWidth
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ mb: 1 }}
            />
            <FormGroup>
              {table
                .getAllLeafColumns()
                .filter((col: any) => {
                  const excludedColumns = ["conflicts"];
                  if (excludedColumns.includes(col.id)) return false;

                  return col.id.toLowerCase().includes(search.toLowerCase());
                })
                .map((col: any) => (
                  <FormControlLabel
                    key={col.id}
                    control={
                      <Checkbox
                        checked={col.getIsVisible()}
                        onChange={col.getToggleVisibilityHandler()}
                        disabled={col.id === "conflicts"}
                      />
                    }
                    sx={{ textTransform: "none" }}
                    label={
                      col.columnDef.meta?.label ||
                      (typeof col.columnDef.header === "string" &&
                      col.columnDef.header.trim() !== ""
                        ? col.columnDef.header
                        : col.id
                            .replace(/([A-Z])/g, " $1")
                            .replace(/^./, (str: string) => str.toUpperCase())
                            .trim())
                    }
                  />
                ))}
            </FormGroup>
          </Popover>
          <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogContent>
              <Typography color="textSecondary">
                Are you sure you want to archive {usersToDelete.length} location
                {usersToDelete.length > 1 ? "s" : ""} from the locations?
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
                      location_ids: usersToDelete.join(","),
                    };
                    const response = await api.post(
                      "company-locations/archive",
                      payload
                    );
                    toast.success(response.data.message);
                    setSelectedRowIds(new Set());
                    await fetchLocations();
                  } catch (error) {
                    toast.error("Failed to remove works");
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
                Add Location
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
                Archive List
              </Link>
            </MenuItem>
          </Menu>
        </Stack>
      </Stack>
      <Divider />
      {/* Add location */}
      <CreateLocation
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        formData={formData}
        setFormData={setFormData}
        handleSubmit={handleSubmit}
        isSaving={isSaving}
      />

      {/* Edit task */}
      <EditLocation
        open={editDrawerOpen}
        onClose={() => setEditDrawerOpen(false)}
        id={selectedTaskId}
        formData={formData}
        setFormData={setFormData}
        EditLocation={editLocation}
        isSaving={isSaving}
      />

      {/* Archive task list */}
      <ArchiveLocation
        open={archiveDrawerOpen}
        onClose={() => setarchiveDrawerOpen(false)}
        onWorkUpdated={fetchLocations}
      />

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
        }}
      >
        <TableContainer>
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
                          width: header.column.id === "actions" ? 120 : "auto",
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
                              header.getContext()
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
              {fetchLocation ? (
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
                        src="/images/svgs/no-data.webp"
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
                      <TableCell key={cell.id} sx={{ padding: "10px" }}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
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

      <Stack
        gap={1}
        pr={3}
        pt={1}
        pl={3}
        pb={2}
        alignItems="center"
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Typography color="textSecondary">
            {table.getPrePaginationRowModel().rows.length} Rows
          </Typography>
        </Box>
        <Box
          sx={{
            display: {
              xs: "block",
              sm: "flex",
            },
          }}
          alignItems="center"
        >
          <Stack direction="row" alignItems="center">
            <Typography color="textSecondary">Page</Typography>
            <Typography color="textSecondary" fontWeight={600} ml={1}>
              {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </Typography>
            <Typography color="textSecondary" ml={"3px"}>
              {" "}
              | Entries :{" "}
            </Typography>
          </Stack>
          <Stack
            ml={"5px"}
            direction="row"
            alignItems="center"
            color="textSecondary"
          >
            <CustomSelect
              value={table.getState().pagination.pageSize}
              onChange={(e: { target: { value: any } }) => {
                table.setPageSize(Number(e.target.value));
              }}
            >
              {[50, 100, 250, 500].map((pageSize) => (
                <MenuItem key={pageSize} value={pageSize}>
                  {pageSize}
                </MenuItem>
              ))}
            </CustomSelect>
            <IconButton
              size="small"
              sx={{ width: "30px" }}
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <IconChevronLeft />
            </IconButton>
            <IconButton
              size="small"
              sx={{ width: "30px" }}
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <IconChevronRight />
            </IconButton>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
};

export default TablePagination;
