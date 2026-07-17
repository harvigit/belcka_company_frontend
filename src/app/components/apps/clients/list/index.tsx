"use client";
import React, { useState, useMemo, useCallback } from "react";
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
  Chip,
  Popover,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { flexRender, createColumnHelper } from "@tanstack/react-table";
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
import Link from "next/link";
import ArchiveClient from "../archive";
import AuthRegister from "../../settings/auth";
import EditClient from "@/app/components/apps/clients/edit";
import relativeTime from "dayjs/plugin/relativeTime";
import PermissionGuard from "@/app/auth/PermissionGuard";
import { IconTableColumn } from "@tabler/icons-react";
import Image from "next/image";
import SkeletonLoader from "@/app/components/SkeletonLoader";

dayjs.extend(relativeTime);

dayjs.extend(customParseFormat);

export type ClientList = {
  id: number;
  company_id?: number;
  name?: string;
  email: string;
  status: string;
  invite_date: string;
  expired_on: string;
  projects: string;
  company_name: string;
  phone: number;
  invite_link: string;
  logged_in_at: Date;
  expire_date: string;
};

import { useServerTable } from "@/hooks/useServerTable";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import { AxiosResponse } from "axios";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";

const ClientList = () => {
  const [data, setData] = useState<ClientList[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchClient, setFetchClient] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [openDialog, setOpenDialog] = useState(false);
  const [openActiveDialog, setOpenActiveDialog] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>();
  const [selectedTaskId, setSelectedTaskId] = useState<number>(0);
  const [usersToDelete, setUsersToDelete] = useState<number[]>([]);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);
  const [search, setSearch] = useState("");

  const [open, setOpen] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);
  const [archiveDrawerOpen, setarchiveDrawerOpen] = useState(false);
  const [expireDate, setExpireDate] = useState("");

  const session = useSession();
  const id = session.data?.user as User & { company_id?: number | null };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl2(event.currentTarget);
  };
  const handlePopoverClose = () => setAnchorEl2(null);
  // Fetch data
  const fetchClients = async () => {
    setFetchClient(true);
    try {
      let url = `company-clients/get?company_id=${id.company_id}&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }

      const res: AxiosResponse<any> = await api.get(url);
      if (res.data) {
        setData(res.data.info);
        setPageCount(res.data.data.totalPages || 0);
        setTotalRows(res.data.data.totalItems || 0);
      }
    } catch (err) {
      console.error("Failed to fetch clients", err);
    } finally {
      setFetchClient(false);
    }
  };

  const formatDate = (date: string | undefined) => {
    return dayjs(date ?? "").isValid() ? dayjs(date).format("DD/MM/YYYY") : "-";
  };

  const handleEdit = useCallback((id: number) => {
    setSelectedTaskId(id);
    setOpenEdit(true);
  }, []);

  const filteredData = useMemo(() => {
    return data;
  }, [data]);

  const handleCopy = (link: string) => {
    const codeToCopy = link ?? "";

    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(codeToCopy)
        .then(() => toast.success("Invitation link copied!"))
        .catch((err) => {
          console.error("Clipboard API failed:", err);
          fallbackCopyCode(codeToCopy);
        });
    } else {
      fallbackCopyCode(codeToCopy);
    }
  };

  const fallbackCopyCode = (codeToCopy: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = codeToCopy;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      toast.success("Invitation link copied!");
    } catch (err) {
      console.error("Fallback failed:", err);
      toast.error("Failed to copy invitation link!");
    } finally {
      document.body.removeChild(textArea);
    }
  };

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

  const columnHelper = createColumnHelper<ClientList>();
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
              const isChecked = e.target.checked;

              if (isChecked) {
                setSelectedRowIds(new Set(filteredData.map((row) => row.id)));
              } else {
                setSelectedRowIds(new Set());
              }
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
        const isChecked = selectedRowIds.has(item.id);

        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography
              className="f-14"
              sx={{ cursor: "pointer", "&:hover": { color: "#173f98" } }}
            >
              {item.name ?? "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.email, {
      id: "email",
      header: () => "Email",
      cell: (info) => {
        return (
          <Typography className="f-14" color="textPrimary">
            {info.getValue() ?? "-"}
          </Typography>
        );
      },
    }),

    columnHelper.accessor((row) => row?.invite_link, {
      id: "inviteLink",
      header: () => "Invite Link",
      cell: (info) => {
        const link = info.getValue();
        if (!link) return "-";

        return (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ px: 1.5 }}
          >
            <Button color="primary" onClick={() => handleCopy(link)}>
              Invite
            </Button>
          </Stack>
        );
      },
    }),

    columnHelper.accessor("status", {
      header: () => "Status",
      cell: (info) => {
        return (
          <Typography className="f-14" color="textPrimary" sx={{ px: 1.5 }}>
            {info.getValue() ?? "-"}
          </Typography>
        );
      },
    }),

    columnHelper.accessor(() => "projects", {
      id: "projects",
      header: () => (
        <Stack direction="row" alignItems="center">
          <Typography variant="subtitle2" fontWeight="inherit" sx={{ px: 1.5 }}>
            Project
          </Typography>
        </Stack>
      ),
      cell: ({ row }) => {
        const item = row.original;

        const value = item.projects;
        return (
          <Typography className="f-14" color="textPrimary" sx={{ px: 1.5 }}>
            {value.length <= 0 ? "-" : value}
          </Typography>
        );
      },
    }),

    columnHelper.accessor((row) => row?.invite_date, {
      id: "inviteDate",
      header: () => "Invite Date",
      cell: (info) => {
        return (
          <Typography className="f-14" color="textPrimary" sx={{ px: 1.5 }}>
            {formatDate(info.getValue())}
          </Typography>
        );
      },
    }),

    columnHelper.accessor(() => "expire_date", {
      id: "expireDate",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <Typography variant="subtitle2" fontWeight="inherit">
            Expires In
          </Typography>
        </Stack>
      ),
      cell: ({ row }) => {
        const item = row.original;
        const value = item.expire_date;

        return (
          <Typography className="f-14" color="textPrimary">
            {formatDate(value.split("T")[0])}
          </Typography>
        );
      },
    }),

    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
        const { expired_on, logged_in_at } = item;

        const formattedLogin = logged_in_at
          ? dayjs(logged_in_at).format("DD/MM/YYYY")
          : null;

        const isExpired = expired_on === "expired";
        const isLoggedIn = !!logged_in_at;

        return (
          <Box
            display="flex"
            flexDirection="column"
            gap={1}
            position="relative"
            alignItems="baseline"
            justifyContent="space-between"
            width={"80%"}
          >
            <Stack
              direction="row"
              alignItems="center"
              flexWrap="wrap"
              position="absolute"
              top={!isLoggedIn && isExpired ? "-15px" : ""}
              left="44px"
              px={0.5}
              py={0.5}
              borderRadius="10px"
              zIndex={1}
              gap="2px"
            >
              {(logged_in_at || expired_on === "expired") && (
                <Chip
                  label={
                    logged_in_at ? `Logged in at ${formattedLogin}` : "Expired"
                  }
                  color={logged_in_at ? "success" : "error"}
                  size="small"
                  sx={{ fontSize: 10, mb: 1, mt: 0.5, height: 22 }}
                  variant="outlined"
                />
              )}
            </Stack>

            <Box display="flex" gap={1} justifyContent={"space-between"}>
              <Box>
                <Tooltip title="Edit">
                  <IconButton
                    onClick={() => handleEdit(item.id)}
                    color="primary"
                  >
                    <IconEdit size={18} />
                  </IconButton>
                </Tooltip>
              </Box>

              <Box>
                {!isLoggedIn && isExpired && (
                  <Tooltip title="Expired">
                    <Button
                      sx={{ mt: 2 }}
                      color="primary"
                      onClick={() => {
                        setSelectedClientId(item.id);
                        setOpenActiveDialog(true);
                      }}
                    >
                      Re-Invite
                    </Button>
                  </Tooltip>
                )}

                {!isLoggedIn && !isExpired && (
                  <Tooltip title="Invited">
                    <Button
                      color="success"
                      sx={{ "&:hover": { cursor: "default" } }}
                    >
                      Invited
                    </Button>
                  </Tooltip>
                )}
              </Box>
            </Box>
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
    fetchData: fetchClients,
    debounceDependencies: [searchTerm],
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
                setOpenDialog(true);
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
                  const excludedColumns = ["conflicts", "select"];
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
                  setOpen(true);
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
                Add Client
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
                Archived Client List
              </Link>
            </MenuItem>
          </Menu>
        </Stack>
      </Stack>

      {/* Archive task list */}
      <ArchiveClient
        open={archiveDrawerOpen}
        onClose={() => setarchiveDrawerOpen(false)}
        onWorkUpdated={fetchClients}
      />

      <Divider />
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
                              ? 210
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
              {fetchClient ? (
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

      {/* add client */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>
          <Typography color="GrayText" fontWeight={700}>
            Add Client
          </Typography>
          <IconButton
            onClick={() => setOpen(false)}
            sx={{
              position: "absolute",
              right: 12,
              top: 8,
              backgroundColor: "transparent",
            }}
          >
            <IconX size={40} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <AuthRegister
            onWorkUpdated={fetchClients}
            open={open}
            onClose={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* edit client */}
      <Dialog
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>
          <Typography color="GrayText" fontWeight={700}>
            Edit Client
          </Typography>
          <IconButton
            onClick={() => setOpenEdit(false)}
            sx={{
              position: "absolute",
              right: 12,
              top: 8,
              backgroundColor: "transparent",
            }}
          >
            <IconX size={40} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <EditClient
            id={selectedTaskId}
            onWorkUpdated={fetchClients}
            open={open}
            onClose={() => setOpenEdit(false)}
          />
        </DialogContent>
      </Dialog>

      {/* archive client */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Confirm Archive</DialogTitle>
        <DialogContent>
          <Typography color="textSecondary">
            Are you sure you want to archive client from company?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenDialog(false)}
            variant="outlined"
            color="primary"
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              try {
                const payload = {
                  client_ids: usersToDelete.join(","),
                };
                const response: AxiosResponse<any> = await api.post(
                  "company-clients/archive",
                  payload,
                );
                toast.success(response.data.message);
                setSelectedRowIds(new Set());
                await fetchClients();
              } catch (error) {
              } finally {
                setOpenDialog(false);
              }
            }}
            variant="outlined"
            color="error"
          >
            Archive
          </Button>
        </DialogActions>
      </Dialog>

      {/* Re-active invitation link */}
      <Dialog
        open={openActiveDialog}
        onClose={() => setOpenActiveDialog(false)}
      >
        <DialogTitle>Confirm Re-activation</DialogTitle>
        <DialogContent>
          <Typography color="textSecondary" mb={2}>
            Are you sure you want to Re-activation invitation for this client?
          </Typography>

          <Typography mb={1}>Login expires on</Typography>
          <CustomTextField
            type="date"
            id="invite_date"
            placeholder="Choose Expiry date"
            fullWidth
            required
            value={expireDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const newDate = e.target.value;
              setExpireDate(newDate);
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenActiveDialog(false)}
            variant="outlined"
            color="primary"
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              try {
                const payload = {
                  id: selectedClientId,
                  expire_date: expireDate,
                };
                const response: AxiosResponse<any> = await api.post(
                  "company-clients/reactivate-invitation",
                  payload,
                );
                toast.success(response.data.message);
                setSelectedClientId(null);
                await fetchClients();
                setOpenActiveDialog(false);
              } catch (error) {
                setOpenActiveDialog(true);
              }
            }}
            variant="outlined"
            color="error"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      <TablePaginationFooter selectedCount={typeof selectedRowIds !== "undefined" ? selectedRowIds.size : undefined} table={table} totalRows={totalRows} />
    </Box>
  );
};

export default ClientList;
