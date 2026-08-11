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
import { IconEye, IconNotes, IconSearch, IconTrash } from "@tabler/icons-react";
import api from "@/utils/axios";
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
import CreateExpenseCategory from "../create";
import EditExpenseCategory from "../edit";
import ArchiveExpenseCategory from "../archive";
import Image from "next/image";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import IOSSwitch from "@/app/components/common/IOSSwitch";

dayjs.extend(customParseFormat);

export type ExpenseCategoryList = {
  id: number;
  name: string;
  company_name?: string;
  is_transport_category?: boolean;
};

import { useServerTable } from "@/hooks/useServerTable";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";
import { useTranslation } from "react-i18next";

const TablePagination = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<ExpenseCategoryList[]>([]);
  const [fetchCategory, setFetchCategory] = useState<boolean>(true);
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

  const [open, setOpen] = useState(false);

  const session = useSession();
  const company = session.data?.user as User & { company_id?: number | null };
  const { columnVisibility, onColumnVisibilityChange } =
    usePersistentColumnVisibility({
      storageKey: `cv_${company?.company_id}_${company?.id}_expense_categories`,
      enabled: !!company?.id,
    });

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [usersToDelete, setUsersToDelete] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [archiveDrawerOpen, setarchiveDrawerOpen] = useState(false);
  const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);
  const [search, setSearch] = useState("");
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());

  const [formData, setFormData] = useState<any>({
    id: 0,
    name: "",
    company_id: company?.company_id,
    is_transport_category: false,
  });

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Fetch data
  const fetchExpenseCategories = async () => {
    setFetchCategory(true);
    try {
      let url = `expense-categories/get?company_id=${company?.company_id}&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      const res = await api.get(url);
      if (res.data) {
        setData(res.data.info);
        setarchiveDrawerOpen(false);
        setPageCount(res.data.data?.totalPages || 0);
        setTotalRows(res.data.data?.totalItems || 0);
      }
    } catch (err) {
      console.error("Failed to fetch expense categories", err);
    }
    setFetchCategory(false);
  };

  const handleOpenCreateDrawer = () => {
    setFormData({
      name: "",
      company_id: company?.company_id,
      is_transport_category: false,
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

      const result = await api.post("expense-categories/create", payload);
      if (result.data.IsSuccess == true) {
        toast.success(result.data.message);
        setFormData({
          id: 0,
          name: "",
          company_id: company?.company_id,
          is_transport_category: false,
        });
        fetchExpenseCategories();
        setDrawerOpen(false);
      }
    } catch (error) {
      console.log(error, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const editExpenseCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
      };

      const result = await api.put("expense-categories/update", payload);
      if (result.data.IsSuccess == true) {
        toast.success(result.data.message);
        setFormData({
          id: 0,
          name: "",
          company_id: company?.company_id,
          is_transport_category: false,
        });
        fetchExpenseCategories();
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

  const handleTransportToggle = async (id: number, currentValue: boolean) => {
    if (togglingIds.has(id)) return;

    setTogglingIds((prev) => new Set(prev).add(id));

    try {
      const payload = {
        id: id,
        is_transport_category: !currentValue,
        company_id: company?.company_id,
      };

      const result = await api.post(
        "expense-categories/toggle-change",
        payload,
      );

      if (result.data.IsSuccess === true) {
        toast.success("Transport category status updated successfully");
        fetchExpenseCategories();
      } else {
        toast.error(result.data.message || "Failed to update");
      }
    } catch (error) {
      toast.error("Failed to update transport status");
    } finally {
      setTogglingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  // UseCallback to memoize these functions
  const handleEdit = useCallback(
    (id: number) => {
      setFormData({
        id: id,
        name: "",
        company_id: company?.company_id || 0,
        is_transport_category: false,
      });
      setSelectedCategoryId(id);
      setEditDrawerOpen(true);
    },
    [company?.company_id],
  );

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

  const columnHelper = createColumnHelper<ExpenseCategoryList>();
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
      header: "Name",
      enableSorting: true,
      cell: ({ row }) => {
        const item = row.original;

        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography className="f-14">{item.name ?? "-"}</Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor("is_transport_category", {
      id: "is_transport_category",
      header: "Transport",
      enableSorting: true,
      cell: ({ row }) => {
        const item = row.original;
        const isToggling = togglingIds.has(item.id);

        return (
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-start",
              pl: 2,
              py: 0.5,
            }}
          >
            <IOSSwitch
              checked={item.is_transport_category ?? false}
              onChange={() =>
                handleTransportToggle(
                  item.id,
                  item.is_transport_category ?? false,
                )
              }
              disabled={isToggling}
            />
          </Box>
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
            <Tooltip title={t("Edit")}>
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
    data: data,
    columns,
    fetchData: fetchExpenseCategories,
    debounceDependencies: [searchTerm, company?.company_id],
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
        height: "calc(100vh - 100px)",
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
            placeholder={t("Search...")}
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
              placeholder={t("Search columns...")}
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
                        label={t("Select All")}
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
            <DialogTitle>{t("Confirm Deletion")}</DialogTitle>
            <DialogContent>
              <Typography color="textSecondary">
                {t("expenseCategory.archiveConfirm", {count: usersToDelete.length})}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setConfirmOpen(false)}
                variant="outlined"
                color="primary"
              >
                {t("Cancel")}
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const payload = {
                      ex_category_ids: usersToDelete.join(","),
                    };
                    const response = await api.post(
                      "expense-categories/archive",
                      payload,
                    );
                    toast.success(response.data.message);
                    setSelectedRowIds(new Set());
                    await fetchExpenseCategories();
                  } catch (error) {
                    toast.error("Failed to remove works");
                  } finally {
                    setConfirmOpen(false);
                  }
                }}
                variant="outlined"
                color="error"
              >
                {t("Archive")}
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
                {t("Add Expense Category")}
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
                {t("Archived List")}
              </Link>
            </MenuItem>
          </Menu>
        </Stack>
      </Stack>

      <Divider />

      <CreateExpenseCategory
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        formData={formData}
        setFormData={setFormData}
        handleSubmit={handleSubmit}
        isSaving={isSaving}
      />

      <EditExpenseCategory
        open={editDrawerOpen}
        onClose={() => setEditDrawerOpen(false)}
        id={selectedCategoryId}
        formData={formData}
        setFormData={setFormData}
        EditExpenseCategory={editExpenseCategory}
        isSaving={isSaving}
      />

      <ArchiveExpenseCategory
        open={archiveDrawerOpen}
        onClose={() => setarchiveDrawerOpen(false)}
        onWorkUpdated={fetchExpenseCategories}
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
                            {typeof header.column.columnDef.header === "string"
                              ? t(header.column.columnDef.header)
                              : flexRender(
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
              {fetchCategory ? (
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
