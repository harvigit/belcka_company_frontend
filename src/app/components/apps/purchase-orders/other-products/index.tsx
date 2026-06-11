"use client";
import React, { useEffect, useState, useMemo } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  Stack,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Avatar,
  Popover,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import {
  IconX,
  IconTrash,
  IconEdit,
  IconPlus,
  IconArrowLeft,
  IconEye,
} from "@tabler/icons-react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import OtherProductForm from "./form";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import Image from "next/image";

interface OtherProductsDrawerProps {
  open: boolean;
  onClose: () => void;
  companyId: number | null;
}

const OtherProductsDrawer = ({
  open,
  onClose,
  companyId,
}: OtherProductsDrawerProps) => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [anchorEl2, setAnchorEl2] = useState<null | HTMLElement>(null);
  const [search, setSearch] = useState("");

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl2(event.currentTarget);
  };
  const handlePopoverClose = () => setAnchorEl2(null);

  const [formData, setFormData] = useState<any>({
    product_name: "",
    cost: "",
    qty: "",
    unit_of_qty: "",
    supplier_name: "",
    supplier_code: "",
    address_id: "",
    project_id: "",
    user_id: "",
    company_id: companyId,
  });

  const fetchData = async () => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      const res = await api.get(`other-products/get?company_id=${companyId}`);
      if (res.data?.IsSuccess) {
        setData(res.data.info || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchData();
      setSelectedRowIds(new Set());
    }
  }, [open, companyId]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = { ...formData, company_id: companyId };
      if (payload.address_id) payload.address_id = Number(payload.address_id);
      else delete payload.address_id;
      if (payload.project_id) payload.project_id = Number(payload.project_id);
      else delete payload.project_id;
      if (payload.user_id) payload.user_id = Number(payload.user_id);
      else delete payload.user_id;

      const res = await api.post("other-products/create", payload);
      if (res.data?.IsSuccess) {
        toast.success(res.data.message);
        setCreateOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = { ...formData, id: selectedId };
      if (payload.address_id) payload.address_id = Number(payload.address_id);
      else delete payload.address_id;
      if (payload.project_id) payload.project_id = Number(payload.project_id);
      else delete payload.project_id;
      if (payload.user_id) payload.user_id = Number(payload.user_id);
      else delete payload.user_id;

      const res = await api.post("other-products/update", payload);
      if (res.data?.IsSuccess) {
        toast.success(res.data.message);
        setEditOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsSaving(true);
    try {
      const idsString = Array.from(selectedRowIds).join(",");
      const res = await api.post("other-products/delete", { ids: idsString });
      if (res.data?.IsSuccess) {
        toast.success(res.data.message);
        setSelectedRowIds(new Set());
        setConfirmOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
      setConfirmOpen(false);
    }
  };

  const columnHelper = createColumnHelper<any>();
  const columns = [
    {
      id: "select",
      header: ({ table }: any) => (
        <CustomCheckbox
          checked={selectedRowIds.size === data.length && data.length > 0}
          indeterminate={
            selectedRowIds.size > 0 && selectedRowIds.size < data.length
          }
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedRowIds(new Set(data.map((row) => row.id)));
            } else {
              setSelectedRowIds(new Set());
            }
          }}
        />
      ),
      cell: ({ row }: any) => {
        const item = row.original;
        const isChecked = selectedRowIds.has(item.id);
        const showCheckbox = isChecked || hoveredRow === item.id;
        return (
          <CustomCheckbox
            checked={isChecked}
            onChange={(e) => {
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
        );
      },
    },
    columnHelper.accessor("user_name", {
      header: "User",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar
              src={item.user_image ? item.user_image : "/images/users/user.png"}
              alt={item.user_name}
              sx={{ width: 36, height: 36 }}
            />
            <Typography variant="subtitle2" color="textPrimary">
              {item.user_name || "-"}
            </Typography>
          </Stack>
        );
      },
    }),
    columnHelper.accessor("product_name", {
      header: "Product Name",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Tooltip title={item.product_name ?? ""} placement="top" arrow>
              <Typography
                className="f-14"
                variant="body1"
                sx={{
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.25,
                  maxWidth: 300,
                  wordBreak: "break-word",
                  "&:hover": { color: "#1976d2" },
                }}
              >
                {item.product_name ? item.product_name : "-"}
              </Typography>
            </Tooltip>
          </Stack>
        );
      },
    }),
    columnHelper.accessor("cost", {
      header: "Cost",
      cell: (info) => <Typography ml={1}>{info.getValue() ?? "-"}</Typography>,
    }),
    columnHelper.accessor("qty", {
      header: "Qty",
      cell: (info) => <Typography ml={1}>{info.getValue() ?? "-"}</Typography>,
    }),
    columnHelper.accessor("unit_of_qty", {
      header: "Unit",
      cell: (info) => <Typography ml={1}>{info.getValue() ?? "-"}</Typography>,
    }),
    columnHelper.accessor("supplier_name", {
      header: "Supplier Name",
      cell: (info) => <Typography ml={1}>{info.getValue() ?? "-"}</Typography>,
    }),
    columnHelper.accessor("supplier_code", {
      header: "Supplier Code",
      cell: (info) => <Typography ml={1}>{info.getValue() ?? "-"}</Typography>,
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Tooltip title="Edit">
            <IconButton
              color="primary"
              onClick={() => {
                setFormData({
                  product_name: item.product_name,
                  cost: item.cost,
                  qty: item.qty,
                  unit_of_qty: item.unit_of_qty,
                  supplier_name: item.supplier_name,
                  supplier_code: item.supplier_code || "",
                  address_id: item.address_id || "",
                  project_id: item.project_id || "",
                  user_id: item.user_id || "",
                  company_id: item.company_id,
                });
                setSelectedId(item.id);
                setEditOpen(true);
              }}
            >
              <IconEdit size={18} />
            </IconButton>
          </Tooltip>
        );
      },
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        PaperProps={{ sx: { height: "95vh" } }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Box
            py={2}
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Box display={"flex"} gap={1} alignItems={"center"}>
              <IconButton onClick={onClose}>
                <IconArrowLeft />
              </IconButton>
              <Typography variant="h6" fontWeight={700}>
                Other Products
              </Typography>
            </Box>
            <Stack direction="row" spacing={2}>
              {selectedRowIds.size > 0 && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<IconTrash size={18} />}
                  onClick={() => setConfirmOpen(true)}
                >
                  Remove
                </Button>
              )}
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  setFormData({
                    product_name: "",
                    cost: "",
                    qty: "",
                    unit_of_qty: "",
                    supplier_name: "",
                    supplier_code: "",
                    address_id: "",
                    project_id: "",
                    user_id: "",
                    company_id: companyId,
                  });
                  setCreateOpen(true);
                }}
              >
                Add New
              </Button>
              <IconButton onClick={handlePopoverOpen} color="primary">
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
                  placeholder="Search columns"
                  fullWidth
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  sx={{ mb: 1 }}
                />
                <FormGroup>
                  {table
                    .getAllLeafColumns()
                    .filter((col: any) => {
                      const excludedColumns = ["select", "actions"];
                      if (excludedColumns.includes(col.id)) return false;

                      return col.id
                        .toLowerCase()
                        .includes(search.toLowerCase());
                    })
                    .map((col: any) => (
                      <FormControlLabel
                        key={col.id}
                        control={
                          <Checkbox
                            checked={col.getIsVisible()}
                            onChange={col.getToggleVisibilityHandler()}
                          />
                        }
                        sx={{ textTransform: "none" }}
                        label={
                          col.columnDef.header &&
                          typeof col.columnDef.header === "string"
                            ? col.columnDef.header
                            : col.id
                                .replace(/([A-Z])/g, " $1")
                                .replace(/^./, (str: string) =>
                                  str.toUpperCase(),
                                )
                                .trim()
                        }
                      />
                    ))}
                </FormGroup>
              </Popover>
              <IconButton onClick={onClose}>
                <IconX />
              </IconButton>
            </Stack>
          </Box>
          <Divider />

          <Box sx={{ flex: 1, overflow: "auto" }}>
            <TableContainer>
              <Table stickyHeader>
                <TableHead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableCell
                          key={header.id}
                          align="left"
                          sx={{ py: 1.5 }}
                        >
                          <Typography variant="subtitle2" fontWeight={600}>
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                          </Typography>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    <SkeletonLoader
                      columns={table.getVisibleLeafColumns().map((col) => ({
                        name: col.id,
                      }))}
                      rowCount={8}
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
                          />
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        hover
                        onMouseEnter={() => setHoveredRow(row.original.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} sx={{ py: 1 }}>
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
          </Box>
        </Box>
      </Drawer>

      <OtherProductForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        formData={formData}
        setFormData={setFormData}
        handleSubmit={handleCreateSubmit}
        isSaving={isSaving}
        mode="create"
      />

      <OtherProductForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        formData={formData}
        setFormData={setFormData}
        handleSubmit={handleEditSubmit}
        isSaving={isSaving}
        mode="edit"
      />

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {selectedRowIds.size} selected
            product(s)?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={isSaving}
          >
            {isSaving ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default OtherProductsDrawer;
