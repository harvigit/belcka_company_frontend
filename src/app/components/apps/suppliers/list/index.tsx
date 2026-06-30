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
  IconSearch,
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
import SkeletonLoader from "@/app/components/SkeletonLoader";
import IOSSwitch from "@/app/components/common/IOSSwitch";
import CreateSupplier from "../create";
import Image from "next/image";
import PermissionGuard from "@/app/auth/PermissionGuard";
import EditSupplier from "../edit";
import { IconEye } from "@tabler/icons-react";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { useDropzone } from "react-dropzone";
import { useServerTable } from "@/hooks/useServerTable";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";

dayjs.extend(customParseFormat);

interface SupplierFormData {
  id: number;
  company_id: any;
  name: string;
  email?: string;
  company_name?: string;
  supplier_image?: File | null;
  account_number?: string;
  street?: string;
  location?: string;
  town?: string;
  postcode?: string;
  phone?: string;
  extension?: string;
  weight?: string;
  weight_unit?: string | null;
  status: boolean;
  contact_person_email?: string;
  contact_person_name?: string;
  contact_person_phone?: string;
  contact_person_extension?: string;
}

interface TableRow {
  id: number;
  image_url?: string;
  images?: string[];
  [key: string]: any;
}

const SupplierList = () => {
  const [data, setData] = useState<any[]>([]);
  const [fetchSupplier, setFetchSupplier] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [usersToDelete, setUsersToDelete] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);
  const [search, setSearch] = useState("");
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [switchLoading, setSwitchLoading] = useState(false);
  const [openImageManager, setOpenImageManager] = useState(false);
  const [openPreview, setOpenPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [newMainImage, setNewMainImage] = useState<File | null>(null);
  const [newOtherImages, setNewOtherImages] = useState<File[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [mainImageId, setMainImageId] = useState<number | null>(null);
  const [selectedRow, setSelectedRow] = useState<TableRow | null>(null);
  const [uploadedImages, setUploadedImages] = useState<
    { id: number; url: string; isMain: boolean }[]
  >([]);
  const [formData, setFormData] = useState<SupplierFormData>({
    id: 0,
    company_id: user?.company_id,
    name: "",
    status: true,
    phone: "",
    contact_person_name: "",
    contact_person_phone: "",
    postcode: "",
    town: "",
    street: "",
    location: "",
  });

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Fetch data
  const fetchSuppliers = async () => {
    setFetchSupplier(true);
    try {
      let url = `suppliers/get?company_id=${user.company_id}&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
      if (searchTerm) {
        url += `&search=${searchTerm}`;
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
            : res.data.info;

        if (pagMeta) {
          setTotalRows(pagMeta.totalItems || responseData.length);
          setPageCount(pagMeta.totalPages || 1);
        } else {
          setTotalRows(responseData.length);
          setPageCount(1);
        }
      }
    } catch (err) {
      console.error("Failed to fetch supplier", err);
    }
    setFetchSupplier(false);
  };

  const handleOpenCreateDrawer = () => {
    setFormData({
      id: 0,
      name: "",
      status: true,
      company_id: user.company_id,
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

      const result = await api.post("suppliers/create", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (result.data.IsSuccess == true) {
        toast.success(result.data.message);

        setDrawerOpen(false);
        fetchSuppliers();
      } else {
      }
    } catch (error) {
      console.log(error, "error");
    } finally {
      setFormData({
        id: 0,
        name: "",
        status: true,
        company_id: user.company_id,
        phone: "",
        contact_person_phone: "",
        contact_person_email: "",
        contact_person_name: "",
        email: "",
        postcode: "",
        street: "",
        location: "",
      });
      setIsSaving(false);
    }
    setIsSaving(false);
  };

  const editSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
      };

      const result = await api.post("suppliers/update", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (result.data.IsSuccess == true) {
        toast.success(result.data.message);

        setEditDrawerOpen(false);
        fetchSuppliers();
      } else {
      }
    } catch (error) {
      console.log(error, "error");
    } finally {
      setFormData({
        id: 0,
        name: "",
        status: true,
        company_id: user.company_id,
        phone: "",
        contact_person_phone: "",
        contact_person_email: "",
        contact_person_name: "",
        email: "",
        postcode: "",
        street: "",
        location: "",
      });
      setIsSaving(false);
    }
  };

  // UseCallback to memoize these functions
  const handleEdit = useCallback((id: number) => {
    setSelectedTaskId(id);
    setEditDrawerOpen(true);
  }, []);

  const handleSetMainExisting = (id: number) => {
    setUploadedImages((prev) =>
      prev.map((img) => ({
        ...img,
        isMain: img.id === id,
      })),
    );
    setMainImageId(id);
    setNewMainImage(null);
  };

  const handleSetMainNew = (file: File) => {
    setNewMainImage(file);
    setMainImageId(null);
    setUploadedImages((prev) => prev.map((img) => ({ ...img, isMain: false })));
  };

  const onDrop = (acceptedFiles: File[]) => {
    setNewImages((prev) => [...prev, ...acceptedFiles]);
    setNewOtherImages((prev) => [...prev, ...acceptedFiles]);
  };

  const { getRootProps: getImageRootProps, getInputProps: getImageInputProps } =
    useDropzone({
      accept: {
        "image/*": [".jpg", ".jpeg", ".png", ".webp"],
      },
      multiple: false,
      maxFiles: 1,
      onDrop: onDrop,
    });

  useEffect(() => {
    if (!selectedRow) return;

    const existingImages = [
      selectedRow.image_url
        ? { id: 0, image_url: selectedRow.image_url }
        : null,
      ...(selectedRow.product_images || []),
    ]
      .filter((img): img is { id: number; image_url: string } => !!img)
      .map((img) => ({
        id: img.id,
        url: img.image_url,
        isMain: img.image_url === selectedRow.image_url,
      }));

    setUploadedImages(existingImages);

    const mainIdx = existingImages.findIndex((img) => img.isMain);
    setMainImageId(mainIdx >= 0 ? mainIdx : null);

    setNewImages([]);
    setNewOtherImages([]);
    setNewMainImage(null);
  }, [selectedRow]);

  useEffect(() => {
    if (!openImageManager) return;

    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        if (item.type.startsWith("image")) {
          const file = item.getAsFile();
          if (file) {
            setNewImages([file]);
          }
          break;
        }
      }
    };

    window.addEventListener("paste", handlePaste);

    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [openImageManager]);

  const handleEditSupplier = async (selectedRow: any) => {
    if (!selectedRow) return;

    setIsSaving(true);

    try {
      const payload = new FormData();
      payload.append("id", String(selectedRow.id));
      payload.append("name", selectedRow.name);
      payload.append("company_id", String(selectedRow.company_id));
      payload.append("status", String(selectedRow.status));
      payload.append("phone", String(selectedRow.phone ?? ""));
      payload.append(
        "contact_person_phone",
        String(selectedRow.contact_person_phone ?? ""),
      );
      payload.append(
        "contact_person_email",
        String(selectedRow.contact_person_email ?? ""),
      );
      payload.append(
        "contact_person_name",
        String(selectedRow.contact_person_name ?? ""),
      );
      payload.append("email", String(selectedRow.email ?? ""));
      payload.append("postcode", String(selectedRow.postcode ?? ""));
      payload.append("street", String(selectedRow.street ?? ""));
      payload.append("location", String(selectedRow.location ?? ""));

      if (newMainImage) {
        payload.append("supplier_image", newMainImage);
      }

      const result = await api.post("suppliers/update", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (result.data.IsSuccess) {
        toast.success(result.data.message);

        setOpenImageManager(false);
        fetchSuppliers();

        setFormData({
          id: 0,
          name: "",
          status: true,
          company_id: user.company_id,
        });

        setNewMainImage(null);
      }
    } catch (error) {
      console.log(error, "error");
    } finally {
      setIsSaving(false);
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

  const columnHelper = createColumnHelper<any>();
  const columns = [
    {
      id: "select",
      header: ({ table }: any) => (
        <Stack direction="row" alignItems="center">
          <CustomCheckbox
            className="header-checkbox"
            checked={selectedRowIds.size === data.length && data.length > 0}
            indeterminate={
              selectedRowIds.size > 0 && selectedRowIds.size < data.length
            }
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              e.preventDefault();
              const isChecked = e.target.checked;

              if (isChecked) {
                setSelectedRowIds(new Set(data.map((row) => row.id)));
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

    columnHelper.accessor("image_url", {
      id: "image",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <Typography variant="subtitle2" fontWeight="inherit">
            Image
          </Typography>
        </Stack>
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const item = row.original;
        const image = "/images/products/product.svg";

        return (
          <Stack direction="row" alignItems="center" spacing={4} ml={1}>
            <Image
              src={item.image_url || image}
              style={{ cursor: "pointer" }}
              alt="Supplier"
              width={50}
              height={50}
              onClick={(e) => {
                e.stopPropagation();
                setPreviewImage(item.image_url || image);
                setOpenPreview(true);
              }}
            />
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRow(item);
                setOpenImageManager(true);
                setNewMainImage(null);
                setNewImages([]);
                setNewOtherImages([]);
              }}
            >
              <AddCircleOutlineIcon fontSize="small" />
            </IconButton>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.name, {
      id: "name",
      header: () => "Name",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={1} ml={1}>
            <Typography textTransform="capitalize" className="f-14">
              {item.name ? item.name : "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.email, {
      id: "email",
      header: () => "Email",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={1} ml={1}>
            <Typography textTransform="capitalize" className="f-14">
              {item.email ? item.email : "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.phone, {
      id: "phone",
      header: () => "Phone",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={1} ml={1}>
            <Typography textTransform="capitalize" className="f-14">
              {item.phone ? item.phone : "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.company_name, {
      id: "company",
      header: () => "Company",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={1} ml={1}>
            <Typography textTransform="capitalize" className="f-14">
              {item.company_name ? item.company_name : "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.account_number, {
      id: "account",
      header: () => "Account",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={1} ml={1}>
            <Typography textTransform="capitalize" className="f-14">
              {item.account_number ? item.account_number : "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.contact_person_name, {
      id: "contactName",
      header: () => "Contact Name",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={1} ml={1}>
            <Typography textTransform="capitalize" className="f-14">
              {item.contact_person_name ? item.contact_person_name : "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.contact_person_email, {
      id: "contactEmail",
      header: () => "Contact Email",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={1} ml={1}>
            <Typography textTransform="capitalize" className="f-14">
              {item.contact_person_email ? item.contact_person_email : "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.contact_person_phone, {
      id: "contact",
      header: () => "Contact",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={1} ml={1}>
            <Typography textTransform="capitalize" className="f-14">
              {item.contact_person_phone ? item.contact_person_phone : "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.postcode, {
      id: "postcode",
      header: () => "Postcode",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={1} ml={1}>
            <Typography textTransform="capitalize" className="f-14">
              {item.postcode ? item.postcode : "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.street, {
      id: "street",
      header: () => "Street",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={1} ml={1}>
            <Typography textTransform="capitalize" className="f-14">
              {item.street ? item.street : "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.location, {
      id: "location",
      header: () => "Location",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={1} ml={1}>
            <Typography textTransform="capitalize" className="f-14">
              {item.location ? item.location : "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.town, {
      id: "town",
      header: () => "Town",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={1} ml={1}>
            <Typography textTransform="capitalize" className="f-14">
              {item.town ? item.town : "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.status, {
      id: "status",
      header: () => "Status",
      cell: ({ row }) => {
        const item = row.original;

        const handleToggle = async () => {
          setSwitchLoading(true);
          try {
            const payload = {
              id: item.id,
              company_id: user.company_id,
              status: !item.status,
            };

            const result = await api.post("suppliers/change-status", payload);

            if (result.data.IsSuccess) {
              toast.success(result.data.message);

              const updatedData = data.map((d) =>
                d.id === item.id ? { ...d, status: !item.status } : d,
              );
              setData(updatedData);
            }
          } catch (error) {
            console.error(error);
          } finally {
            setSwitchLoading(false);
          }
        };

        return (
          <IOSSwitch
            checked={item.status}
            onChange={handleToggle}
            disabled={switchLoading}
            color="success"
          />
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
    data,
    columns,
    fetchData: fetchSuppliers,
    debounceDependencies: [searchTerm, user?.company_id],
  });

  // Reset to first page when search term changes
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchTerm]);

  const simpleColumns = columns.map((column) => ({
    name: column.id ?? "Unnamed Column",
    width: "auto",
  }));

  return (
    <PermissionGuard permission="Suppliers">
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
                sx={{ marginRight: "5px" }}
                onClick={() => {
                  const selectedIds = Array.from(selectedRowIds);
                  setUsersToDelete(selectedIds);
                  setConfirmOpen(true);
                }}
              >
                Remove
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
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogContent>
                <Typography color="textSecondary">
                  Are you sure you want to delete {usersToDelete.length}{" "}
                  supplier
                  {usersToDelete.length > 1 ? "s" : ""} from the suppliers?
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
                        supplier_ids: usersToDelete.join(","),
                      };
                      const response = await api.post(
                        "suppliers/delete",
                        payload,
                      );
                      toast.success(response.data.message);
                      setSelectedRowIds(new Set());
                      await fetchSuppliers();
                    } catch (error) {
                      toast.error("Failed to remove suppliers");
                    } finally {
                      setConfirmOpen(false);
                    }
                  }}
                  variant="outlined"
                  color="error"
                >
                  Remove
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
                  Add Supplier
                </Link>
              </MenuItem>
            </Menu>
          </Stack>
        </Stack>
        <Divider />
        {/* for handling image upload */}
        <Dialog
          open={openImageManager}
          onClose={() => setOpenImageManager(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Image</DialogTitle>
          <DialogContent>
            <div
              {...getImageRootProps()}
              style={{
                border: "2px dashed #1976d2",
                borderRadius: 8,
                padding: 40,
                textAlign: "center",
                cursor: "pointer",
                marginBottom: 20,
              }}
            >
              <input {...getImageInputProps()} />
              <Typography>Drag & drop or paste image</Typography>
            </div>

            <Grid container spacing={2}>
              {uploadedImages.map((img) => (
                <Grid key={img.id} style={{ position: "relative" }}>
                  <img
                    src={img.url}
                    width={80}
                    height={80}
                    style={{ objectFit: "cover", borderRadius: 4 }}
                  />

                  {/* Main image selector */}
                  <button
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      background: img.isMain ? "#1976d2" : "rgba(0,0,0,0.4)",
                      color: "white",
                      fontSize: 12,
                      border: "none",
                      borderRadius: "0 4px 0 0",
                      padding: "2px 4px",
                      cursor: "pointer",
                    }}
                    onClick={() => handleSetMainExisting(img.id)}
                  >
                    {img.isMain ? "Primary" : "Images"}
                  </button>

                  {/* Delete button */}
                  <IconButton
                    color="error"
                    size="small"
                    sx={{
                      position: "absolute",
                      top: -10,
                      right: -10,
                      backgroundColor: "#fff",
                      zIndex: 2,
                      "&:hover": {
                        backgroundColor: "#fff",
                        color: "red",
                      },
                    }}
                    onClick={() =>
                      setUploadedImages(
                        uploadedImages.filter((i) => i.id !== img.id),
                      )
                    }
                  >
                    <IconTrash size={16} />
                  </IconButton>
                </Grid>
              ))}

              {newImages.map((file, index) => (
                <Grid key={index} style={{ position: "relative" }}>
                  <img
                    src={URL.createObjectURL(file)}
                    width={80}
                    height={80}
                    style={{ objectFit: "cover", borderRadius: 4 }}
                  />

                  {/* Main selector for new files */}
                  <button
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      background:
                        newMainImage === file ? "#1976d2" : "rgba(0,0,0,0.4)",
                      color: "white",
                      fontSize: 12,
                      border: "none",
                      borderRadius: "0 4px 0 0",
                      padding: "2px 4px",
                      cursor: "pointer",
                    }}
                    onClick={() => handleSetMainNew(file)}
                  >
                    Primary
                  </button>

                  <IconButton
                    size="small"
                    color="error"
                    sx={{
                      position: "absolute",
                      top: -10,
                      right: -10,
                      backgroundColor: "#fff",
                      zIndex: 2,
                      "&:hover": {
                        backgroundColor: "#fff",
                        color: "red",
                      },
                    }}
                    onClick={() =>
                      setNewImages(newImages.filter((_, i) => i !== index))
                    }
                  >
                    <IconTrash size={16} />
                  </IconButton>
                </Grid>
              ))}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenImageManager(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={() => {
                handleEditSupplier(selectedRow);
              }}
              disabled={isSaving}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
        {/* Add supplier */}
        <CreateSupplier
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          formData={formData}
          setFormData={setFormData}
          handleSubmit={handleSubmit}
          isSaving={isSaving}
          companyId={user.company_id ?? null}
        />

        {/* Edit supplier */}
        <EditSupplier
          open={editDrawerOpen}
          onClose={() => setEditDrawerOpen(false)}
          supplierId={selectedTaskId}
          formData={formData}
          setFormData={setFormData}
          EditSupplier={editSupplier}
          isSaving={isSaving}
          companyId={user.company_id ?? null}
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
                            width: header.column.id === "select" ? 30 : "auto",

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
                {fetchSupplier ? (
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
        <TablePaginationFooter table={table} totalRows={totalRows} />
      </Box>
    </PermissionGuard>
  );
};

export default SupplierList;
