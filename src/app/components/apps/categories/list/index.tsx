"use client";
import React, { useEffect, useState, useCallback } from "react";
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
  createColumnHelper,
} from "@tanstack/react-table";
import {
  IconEye,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
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
import SkeletonLoader from "@/app/components/SkeletonLoader";
import IOSSwitch from "@/app/components/common/IOSSwitch";
import Image from "next/image";
import CreateCategory from "../create";
import EditCategory from "../edit";
import PermissionGuard from "@/app/auth/PermissionGuard";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { useDropzone } from "react-dropzone";
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
} from "@dnd-kit/core";

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";
import { useServerTable } from "@/hooks/useServerTable";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";

dayjs.extend(customParseFormat);

interface CategoryFormData {
  id: number;
  company_id: any;
  name: string;
  image?: File | null;
  parent_category_id?: number | null;
  parent_category_name?: string | null;
  status: boolean;
}

interface TableRow {
  id: number;
  thumb_url?: string;
  images?: string[];
  [key: string]: any;
}

const CategoryList = () => {
  const [data, setData] = useState<any[]>([]);
  const [fetchCategory, setFetchCategory] = useState<boolean>(true);
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
  const [selectedRow, setSelectedRow] = useState<TableRow | null>(null);
  const [openImageManager, setOpenImageManager] = useState(false);
  const [openPreview, setOpenPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [newMainImage, setNewMainImage] = useState<File | null>(null);
  const [newOtherImages, setNewOtherImages] = useState<File[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [mainImageId, setMainImageId] = useState<number | null>(null);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState<string>("");
  const [uploadedImages, setUploadedImages] = useState<
    { id: number; url: string; isMain: boolean }[]
  >([]);

  const [formData, setFormData] = useState<CategoryFormData>({
    id: 0,
    company_id: user?.company_id,
    name: "",
    status: true,
  });

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
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
      selectedRow.thumb_url
        ? { id: 0, thumb_url: selectedRow.thumb_url }
        : null,
      ...(selectedRow.product_images || []),
    ]
      .filter((img): img is { id: number; thumb_url: string } => !!img)
      .map((img) => ({
        id: img.id,
        url: img.thumb_url,
        isMain: img.thumb_url === selectedRow.thumb_url,
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

  const handleSaveCategory = async (selectedRow: any) => {
    if (!selectedRow) return;

    setIsSaving(true);

    try {
      const payload = new FormData();

      payload.append("id", String(selectedRow.id));
      payload.append("name", selectedRow.name);
      payload.append("company_id", String(selectedRow.company_id));
      payload.append("status", String(selectedRow.status));
      payload.append(
        "parent_category_id",
        String(selectedRow.parent_category_id ?? ""),
      );

      if (newMainImage) {
        payload.append("image", newMainImage);
      }

      const result = await api.post("categories/update", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (result.data.IsSuccess) {
        toast.success(result.data.message);

        setOpenImageManager(false);
        fetchCategories();

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

  // Fetch data
  const fetchCategories = async () => {
    setFetchCategory(true);
    try {
      let url = `categories/get?company_id=${user.company_id}&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
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
      console.error("Failed to fetch categories", err);
    }
    setFetchCategory(false);
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

      const result = await api.post("categories/create", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (result.data.IsSuccess == true) {
        toast.success(result.data.message);
        setFormData({
          id: 0,
          name: "",
          status: true,
          company_id: user.company_id,
        });
        setDrawerOpen(false);
        fetchCategories();
      } else {
      }
    } catch (error) {
      console.log(error, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const editCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
      };

      const result = await api.post("categories/update", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (result.data.IsSuccess == true) {
        toast.success(result.data.message);
        setFormData({
          id: 0,
          name: "",
          status: true,
          company_id: user.company_id,
        });
        setEditDrawerOpen(false);
        fetchCategories();
      } else {
      }
    } catch (error) {
      console.log(error, "error");
    } finally {
      setIsSaving(false);
    }
  };

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
    {
      id: "drag",
      header: "",
      cell: ({ row }: any) => {
        return <DragHandle id={row.original.id} />;
      },
    },

    columnHelper.accessor("thumb_url", {
      id: "image",
      header: () => (
        <Stack direction="row" alignItems="center">
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
          <Stack direction="row" alignItems="center">
            <Image
              src={item.thumb_url || image}
              style={{ cursor: "pointer" }}
              alt="Category"
              width={50}
              height={50}
              onClick={(e) => {
                e.stopPropagation();
                setPreviewImage(item.thumb_url || image);
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

    columnHelper.accessor((row) => row?.parent_category_name, {
      id: "mainCategory",
      header: () => "Main Category",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography textTransform="capitalize" className="f-14">
              {item.parent_category_name ? item.parent_category_name : "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.name, {
      id: "category",
      header: () => "Category",
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingRow === item.id;

        return (
          <Stack direction="row" alignItems="center">
            {isEditing ? (
              <TextField
                size="small"
                value={inputValue}
                inputProps={{ maxLength: 30 }}
                autoFocus
                variant="standard"
                sx={{ width: 150 }}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={async () => {
                  if (inputValue !== item.name) {
                    await handleSaveCategory({
                      ...item,
                      name: inputValue,
                    });
                  }
                  setEditingRow(null);
                }}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();

                    if (inputValue !== item.name) {
                      await handleSaveCategory({
                        ...item,
                        name: inputValue,
                      });
                    }

                    setEditingRow(null);
                  }

                  if (e.key === "Escape") {
                    setEditingRow(null);
                  }
                }}
              />
            ) : (
              <Typography
                sx={{
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  cursor: "pointer",
                  border: "1px solid transparent",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    border: "1px solid #1976d2",
                  },
                }}
                textTransform="capitalize"
                className="f-14"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingRow(item.id);
                  setInputValue(item.name || "");
                }}
              >
                {item.name || "-"}
              </Typography>
            )}
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

            const result = await api.post("categories/change-status", payload);

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
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(item.id);
                }}
                color="primary"
              >
                <IconEdit size={18} />
              </IconButton>
            </Tooltip>
          </Stack>
        );
      },
    }),
  ];

  const DraggableRow = ({ row, children }: any) => {
    const { setNodeRef, transform, transition } = useSortable({
      id: row.original.id,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <TableRow ref={setNodeRef} style={style} hover>
        {children}
      </TableRow>
    );
  };

  const DragHandle = ({ id }: { id: number }) => {
    const { attributes, listeners } = useSortable({ id });

    return (
      <Box
        {...attributes}
        {...listeners}
        sx={{
          cursor: "grab",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Typography textAlign={"center"}>⋮⋮</Typography>
      </Box>
    );
  };

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = async (event: any) => {
    try {
      const { active, over } = event;

      if (!over || active.id === over.id) return;

      const oldIndex = data.findIndex((i) => i.id === active.id);
      const newIndex = data.findIndex((i) => i.id === over.id);

      const newData = arrayMove(data, oldIndex, newIndex);

      setData(newData);

      const payload = newData.map((item, index) => ({
        id: item.id,
        new_position: index + 1,
      }));

      const res = await api.post("categories/change-bulk-sequence", {
        company_id: user.company_id,
        user_id: user.id,
        sequence: payload,
      });

      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        fetchCategories();
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl2(event.currentTarget);
  };
  const handlePopoverClose = () => setAnchorEl2(null);

  const simpleColumns = columns.map((column) => ({
    name: column.id ?? "Unnamed Column",
    width: "auto",
  }));

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
    fetchData: fetchCategories,
    debounceDependencies: [searchTerm, user?.company_id],
  });
  // Reset to first page when search term changes
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchTerm]);

  return (
    <PermissionGuard permission="Categories">
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
                  category
                  {usersToDelete.length > 1 ? "s" : ""} from the categories?
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
                        category_ids: usersToDelete.join(","),
                      };
                      const response = await api.post(
                        "categories/delete",
                        payload,
                      );
                      toast.success(response.data.message);
                      setSelectedRowIds(new Set());
                      await fetchCategories();
                    } catch (error) {
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
                  Add Category
                </Link>
              </MenuItem>
            </Menu>
          </Stack>
        </Stack>
        <Divider />

        <Dialog
          open={openPreview}
          onClose={() => setOpenPreview(false)}
          fullScreen
          PaperProps={{
            sx: {
              backgroundColor: "transparent",
              boxShadow: "none",
            },
          }}
        >
          <IconButton
            onClick={() => setOpenPreview(false)}
            color="primary"
            sx={{
              position: "fixed",
              top: 16,
              right: 16,
              zIndex: 1301,
              backgroundColor: "#fff",
              "&:hover": {
                backgroundColor: "#eee",
                color: "#1e4db7",
              },
            }}
          >
            <IconX />
          </IconButton>

          <Box
            sx={{
              width: "100vw",
              height: "100vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => setOpenPreview(false)}
          >
            <img
              src={previewImage || ""}
              alt="Preview"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "90% !important",
                height: "50%",
                objectFit: "contain",
              }}
            />
          </Box>
        </Dialog>

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
                handleSaveCategory(selectedRow);
              }}
              disabled={isSaving}
            >
             {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add category */}
        <CreateCategory
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          formData={formData}
          setFormData={setFormData}
          handleSubmit={handleSubmit}
          isSaving={isSaving}
          companyId={user.company_id ?? null}
        />

        {/* Edit category */}
        <EditCategory
          open={editDrawerOpen}
          onClose={() => setEditDrawerOpen(false)}
          supplierId={selectedTaskId}
          formData={formData}
          setFormData={setFormData}
          EditCategory={editCategory}
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
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
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
                    <SortableContext
                      items={data.map((row) => row.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {table.getRowModel().rows.map((row) => (
                        <DraggableRow key={row.id} row={row}>
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
                        </DraggableRow>
                      ))}
                    </SortableContext>
                  )}
                </TableBody>
              </DndContext>
            </Table>
          </TableContainer>
          {data.length ? <Divider /> : <></>}
        </Box>
        <Divider />
        <TablePaginationFooter selectedCount={typeof selectedRowIds !== "undefined" ? selectedRowIds.size : undefined} table={table} totalRows={totalRows} />
      </Box>
    </PermissionGuard>
  );
};

export default CategoryList;
