"use client";
import React, { useEffect, useMemo, useState } from "react";
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
  InputAdornment,
  Grid,
  Select,
  MenuItem,
  FormControl,
  Modal,
  CircularProgress,
  LinearProgress,
} from "@mui/material";
import {
  IconX,
  IconTrash,
  IconEdit,
  IconArrowLeft,
  IconEye,
  IconSearch,
  IconFileExport,
  IconFileImport,
  IconFilter,
} from "@tabler/icons-react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import { useDropzone } from "react-dropzone";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import OtherProductForm from "./form";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import Image from "next/image";
import { FileDownload } from "@mui/icons-material";
import Link from "next/link";

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

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [tempProject, setTempProject] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [openModel, setOpenModel] = useState(false);
  const [file, setFile] = useState<any | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImport, setIsImport] = useState(false);

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
      const url = selectedProject
        ? `other-products/get?company_id=${companyId}&project_id=${selectedProject}`
        : `other-products/get?company_id=${companyId}`;
      const res = await api.get(url);
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
      const fetchResources = async () => {
        try {
          const res = await api.get("/expense/get-resources");
          if (res.data) {
            setProjects(res.data.projects || []);
          }
        } catch (err) {
          console.error("Failed to fetch resources", err);
        }
      };
      fetchResources();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, companyId, selectedProject]);

  const exportProducts = async () => {
    try {
      const selectedIds = Array.from(selectedRowIds);
      const ids = selectedIds.join(",");
      const payload = {
        company_id: companyId,
        ids: ids,
      };
      const res = await api.post(`other-products/export`, payload, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `other_products_export.xlsx`;
      document.body.appendChild(a);
      a.click();

      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      fetchData();
      setSelectedRowIds(new Set());
    } catch (err) {
      console.error("Failed to export products", err);
    }
  };

  const handleFileChange = (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);
    setPreview(selectedFile.name);
  };

  const { getRootProps: getExcelRootProps, getInputProps: getExcelInputProps } =
    useDropzone({
      accept: {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
          ".xlsx",
        ],
        "application/vnd.ms-excel": [".xls"],
      },
      onDrop: handleFileChange,
    });

  const importProducts = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setIsImport(true);
    setUploadProgress(0);
    setIsProcessing(false);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("company_id", String(companyId));

      const res = await api.post("other-products/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent: any) => {
          if (progressEvent.total) {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            setUploadProgress(percent);
            if (percent === 100) {
              setIsProcessing(true);
            }
          }
        },
      });

      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        fetchData();
        setTimeout(() => {
          setOpenModel(false);
          setUploadProgress(0);
          setIsProcessing(false);
          setFile(null);
          setPreview(null);
        }, 1000);
      } else {
        toast.error(res.data.message || "Import failed");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Import failed");
    } finally {
      setIsImport(false);
    }
  };

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

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const search = searchTerm.toLowerCase();

      const matchesSearch =
        item.product_name?.toLowerCase().includes(search) ||
        item.cost?.toLocaleLowerCase().includes(search) ||
        item.unit?.toLocaleLowerCase().includes(search) ||
        item.user_name?.toLocaleLowerCase().includes(search) ||
        item.supplier_name?.toLocaleLowerCase().includes(search) ||
        item.supplier_code?.toLocaleLowerCase().includes(search) ||
        item.address_name?.toLocaleLowerCase().includes(search);

      return matchesSearch;
    });
  }, [data, searchTerm]);

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
    data: filteredData,
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

            <Grid display="flex" gap={1} alignItems="center">
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
                sx={{ width: '100%' }}
              />
              <Button
                variant="contained"
                onClick={() => {
                  setTempProject(selectedProject);
                  setFilterOpen(true);
                }}
                sx={{
                  mt: { xs: 1, sm: 0 },
                  minWidth: "40px",
                  padding: "6px 12px",
                }}
              >
                <IconFilter width={18} />
              </Button>
            </Grid>

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
                onClick={exportProducts}
                sx={{ mt: { xs: 1, sm: 0 } }}
              >
                <IconFileExport width={18} /> Export
              </Button>
              <Button
                variant="contained"
                startIcon={<IconFileImport width={18} />}
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                  setOpenModel(true);
                }}
              >
                Import
              </Button>
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

        {/* Filter Dialog */}
        <Dialog
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle sx={{ m: 0, position: "relative", overflow: "visible" }}>
            Filters
            <IconButton
              aria-label="close"
              onClick={() => setFilterOpen(false)}
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
                label="Project"
                value={tempProject}
                onChange={(e) => setTempProject(e.target.value)}
                fullWidth
              >
                <MenuItem value="">All Projects</MenuItem>
                {projects.map((proj) => (
                  <MenuItem key={proj.id} value={proj.id.toString()}>
                    {proj.name}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </DialogContent>

          <DialogActions>
            <Button
              onClick={() => {
                setTempProject("");
                setSelectedProject("");
                setFilterOpen(false);
              }}
              color="inherit"
            >
              Clear
            </Button>

            <Button
              variant="contained"
              onClick={() => {
                setSelectedProject(tempProject);
                setFilterOpen(false);
              }}
            >
              Apply
            </Button>
          </DialogActions>
        </Dialog>
      </Drawer>

      <Modal
        open={openModel}
        onClose={() => setOpenModel(false)}
        disableEscapeKeyDown
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            p: 3,
            borderRadius: 2,
            boxShadow: 24,
            width: 400,
          }}
        >
          <DialogTitle sx={{ p: 0 }}>
            <Typography color="GrayText" fontWeight={700}>
              Upload Your File
            </Typography>
            <IconButton
              onClick={() => setOpenModel(false)}
              sx={{
                position: "absolute",
                right: 8,
                top: 10,
                backgroundColor: "transparent",
              }}
            >
              <IconX size={40} />
            </IconButton>
          </DialogTitle>
          <Box
            {...getExcelRootProps()}
            sx={{
              width: 350,
              height: 100,
              mt: 2,
              border: "2px dashed",
              borderColor: "primary.main",
              borderRadius: 1,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
              "&:hover": {
                backgroundColor: "primary.light",
              },
            }}
          >
            <input {...getExcelInputProps()} accept=".xls,.xlsx" />
            {preview ? (
              preview
            ) : (
              <Typography fontSize="12px" color="primary.main">
                Click or Drag File
              </Typography>
            )}
          </Box>
          <Stack
            direction="row"
            justifyContent={"space-between"}
            alignItems="center"
          >
            {isImport && (
              <Box sx={{ mt: 2 }}>
                {!isProcessing ? (
                  <>
                    <Typography variant="body2" mb={1}>
                      Uploading... {uploadProgress}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={uploadProgress}
                      sx={{ height: 8, borderRadius: 5 }}
                    />
                  </>
                ) : (
                  <Box display="flex" alignItems="center" gap={1}>
                    <CircularProgress size={18} />
                    <Typography variant="body2">Processing file...</Typography>
                  </Box>
                )}
              </Box>
            )}
            <Box sx={{ mt: 2, display: "flex", justifyContent: "end" }}>
              <Link
                href="#"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = "/files/other_products_import.xlsx";
                  link.download = "sample-file.xlsx";
                  link.click();
                }}
                style={{
                  width: "100%",
                  color: "#1e4db7",
                  textTransform: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyItems: "center",
                }}
              >
                <FileDownload />
                Download Sample File
              </Link>
            </Box>
            <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
              <Button
                variant="contained"
                disabled={isImport}
                onClick={(e: any) => {
                  importProducts();
                }}
              >
                Save
              </Button>
              <Button
                variant="outlined"
                onClick={() => setOpenModel(false)}
                color="error"
              >
                Cancel
              </Button>
            </Box>
          </Stack>
        </Box>
      </Modal>

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
