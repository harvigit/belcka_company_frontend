"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Typography,
  Box,
  TextField,
  InputAdornment,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Popover,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Stack,
  Divider,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Autocomplete,
  Menu,
  ListItemIcon,
  Tooltip,
} from "@mui/material";
import {
  IconSearch,
  IconEye,
  IconFilter,
  IconX,
  IconTrash,
  IconNote,
  IconEdit,
  IconPointFilled,
  IconDotsVertical,
  IconNotes,
  IconPlus,
} from "@tabler/icons-react";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import dayjs from "dayjs";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import api from "@/utils/axios";
import PermissionGuard from "@/app/auth/PermissionGuard";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import { flexRender } from "@tanstack/react-table";
import { useServerTable } from "@/hooks/useServerTable";
import Image from "next/image";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import toast from "react-hot-toast";
import ArchiveAddress from "../../addresses/list/archive-address-list";
import CaseEditDrawer from "./case-edit-drawer";
import CaseAddDrawer from "./case-add-drawer";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";

const CASE_LIST_SORT_FIELDS: Record<string, string> = {
  name: "name",
  project_name: "project_name",
  progress: "progress",
  status: "status",
  case_id: "case_id",
  reference: "ref",
  address_type: "address_type",
  start_date: "start_date",
  end_date: "end_date",
};

const CASE_LIST_ROW_SORT_KEYS: Record<string, string> = {
  name: "name",
  project_name: "project_name",
  progress: "progress",
  status: "status_int",
  case_id: "case_id",
  reference: "ref",
  address_type: "address_type",
  start_date: "start_date",
  end_date: "end_date",
};

const isEmptySortValue = (value: any) =>
  value === null ||
  value === undefined ||
  String(value).trim() === "" ||
  String(value).trim() === "-";

const STATUS_SORT_RANK: Record<number, number> = {
  13: 1,
  3: 2,
  4: 3,
};

const parseSortDate = (value: any) => {
  if (value == null || value === "") return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.valueOf() : null;
};

const sortCaseListRows = (rows: any[], sorting: any[]) => {
  if (!sorting?.length) return rows;
  const columnId = sorting[0].id;
  const key = CASE_LIST_ROW_SORT_KEYS[columnId];
  if (!key) return rows;
  const modifier = sorting[0].desc ? -1 : 1;

  return [...rows].sort((a, b) => {
    const av = a?.[key];
    const bv = b?.[key];

    if (key === "status_int") {
      return (
        ((STATUS_SORT_RANK[Number(av)] ?? 99) -
          (STATUS_SORT_RANK[Number(bv)] ?? 99)) *
        modifier
      );
    }

    const aEmpty = isEmptySortValue(av);
    const bEmpty = isEmptySortValue(bv);
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1;
    if (bEmpty) return -1;

    if (key === "progress") {
      return (
        ((parseFloat(String(av)) || 0) - (parseFloat(String(bv)) || 0)) *
        modifier
      );
    }

    if (key === "start_date" || key === "end_date") {
      const at = parseSortDate(av);
      const bt = parseSortDate(bv);
      if (at == null && bt == null) return 0;
      if (at == null) return 1;
      if (bt == null) return -1;
      return (at - bt) * modifier;
    }

    return (
      String(av).localeCompare(String(bv), undefined, {
        numeric: true,
        sensitivity: "base",
      }) * modifier
    );
  });
};

interface CaseSummary {
  id: number;
  name: string;
  cases: number;
  status: number;
  latest_start: string | null;
  finish_date: string | null;
}

interface ClickToEditProgressProps {
  value: string | number | null | undefined;
  rowId: number;
  statusInt: number;
  editedBy?: string | null;
  editedAt?: string | null;
  onSave: (rowId: number, progress: number) => Promise<void>;
}

const ADDRESS_PROGRESS_STATUS = {
  TODO: { status_int: 13, status_text: "To Do" },
  IN_PROGRESS: { status_int: 3, status_text: "In Progress" },
  COMPLETED: { status_int: 4, status_text: "Completed" },
} as const;

const parseProgress = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  return Number(String(value).replace("%", ""));
};

const progressToStatus = (progress: number) => {
  if (progress <= 0) return ADDRESS_PROGRESS_STATUS.TODO;
  if (progress >= 100) return ADDRESS_PROGRESS_STATUS.COMPLETED;
  return ADDRESS_PROGRESS_STATUS.IN_PROGRESS;
};

const ClickToEditProgress: React.FC<ClickToEditProgressProps> = ({
  value,
  rowId,
  statusInt,
  editedBy,
  editedAt,
  onSave,
}) => {
  const numericValue = value ? parseProgress(value) : 0;

  const [localValue, setLocalValue] = React.useState(numericValue);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isHovering, setIsHovering] = React.useState(false);
  const [loadingProgress, setLoadingProgress] = React.useState(false);

  React.useEffect(() => {
    setLocalValue(numericValue);
  }, [numericValue]);

  let color = "textPrimary";
  if (statusInt === 13) color = "#999999";
  else if (statusInt === 4) color = "#32A852";
  else if (statusInt === 3) color = "#FF7F00";

  const saveProgress = async () => {
    const clampedValue = Math.min(100, Math.max(0, localValue));

    if (clampedValue === numericValue) {
      setIsEditing(false);
      setIsHovering(false);
      return;
    }

    try {
      setLoadingProgress(true);
      await onSave(rowId, clampedValue);
      setIsEditing(false);
      setIsHovering(false);
    } catch (error: any) {
      setLocalValue(numericValue);
      toast.error(error?.message || "Failed to update progress");
    } finally {
      setLoadingProgress(false);
    }
  };

  return (
    <Box
      sx={{ display: "flex", alignItems: "center", position: "relative" }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        if (!isEditing) setIsHovering(false);
      }}
    >
      {editedBy && editedAt && (
        <Tooltip
          title={`Modified by ${editedBy} on ${editedAt.slice(0, 16)}`}
          arrow
          placement="top"
        >
          <Box
            onMouseEnter={() => {
              if (!isEditing) setIsHovering(false);
            }}
            onMouseLeave={() => {
              if (!isEditing) setIsHovering(false);
            }}
            sx={{
              position: "absolute",
              left: "-15px",
              top: "50%",
              transform: "translateY(-50%)",
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            <IconPointFilled size={16} style={{ color: "#ff9800" }} />
          </Box>
        </Tooltip>
      )}

      {isHovering || isEditing ? (
        <TextField
          type="text"
          size="small"
          inputProps={{
            maxLength: 3,
            min: 0,
            max: 100,
            inputMode: "numeric",
            pattern: "[0-9]*",
          }}
          value={localValue}
          autoFocus={isEditing}
          disabled={loadingProgress}
          onChange={(e) => setLocalValue(Number(e.target.value) || 0)}
          onFocus={() => setIsEditing(true)}
          onBlur={saveProgress}
          onKeyDown={(e) => e.key === "Enter" && saveProgress()}
          sx={{
            width: 56,
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: isEditing ? "#1976d2" : "transparent",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#1976d2",
            },
            "& .MuiInputBase-input": {
              textAlign: "center",
              p: "6px",
            },
          }}
        />
      ) : (
        <Typography
          fontWeight={700}
          color={color}
          sx={{ px: 1.5, cursor: "pointer" }}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => !isEditing && setIsHovering(false)}
          onClick={() => setIsEditing(true)}
        >
          {value}
        </Typography>
      )}
    </Box>
  );
};

const CasesList = () => {
  const [data, setData] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    project_id: "",
    parent_address_id: "",
  });
  const [tempFilters, setTempFilters] = useState(filters);
  const [projectList, setProjectList] = useState<any[]>([]);
  const [parentAddressList, setParentAddressList] = useState<any[]>([]);

  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const handleSelectAllRows = (checked: boolean) => {
    if (checked) {
      const allIds = data.map((item: any) => item.id);
      setSelectedRowIds(new Set(allIds));
    } else {
      setSelectedRowIds(new Set());
    }
  };

  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [anchorEl2, setAnchorEl2] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);
  const openMenu2 = Boolean(anchorEl2);
  const [openDialog, setOpenDialog] = useState(false);
  const [archiveList, setArchiveList] = useState(false);
  const [sorting, setSorting] = useState<any[]>([]);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<any>(null);
  const [editData, setEditData] = useState({ name: "", case_id: "", ref: "" });
  const [addCaseDrawerOpen, setAddCaseDrawerOpen] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl2(null);
    setAnchorEl(null);
  };

  const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl2(event.currentTarget);
  };
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = React.useState(false);

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const { columnVisibility, onColumnVisibilityChange } =
    usePersistentColumnVisibility({
      storageKey: `cv_${user?.company_id}_${user?.id}_cases`,
      enabled: !!user?.id,
    });

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

  const fetchProjectsAndAddresses = async () => {
    if (!user?.company_id) return;
    try {
      const [projRes, addrRes] = await Promise.all([
        api.get(`project/get?company_id=${user.company_id}`),
        api.get(
          `address/get-parent?company_id=${user.company_id}&page=1&limit=1000`,
        ),
      ]);
      if (projRes.data?.info) setProjectList(projRes.data.info);

      const addrData =
        addrRes.data?.info?.data ||
        addrRes.data?.info ||
        addrRes.data?.data ||
        [];
      setParentAddressList(addrData);
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (date: string | undefined) => {
    return dayjs(date ?? "").isValid() ? dayjs(date).format("DD/MM/YYYY") : "-";
  };

  useEffect(() => {
    fetchProjectsAndAddresses();
  }, [user?.company_id]);

  const fetchCases = async () => {
    if (!user?.company_id) return;
    setLoading(true);
    try {
      let url = `address/get?&company_id=${user.company_id}&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
      if (filters.status && filters.status !== "All")
        url += `&status_text=${filters.status}`;
      if (filters.project_id) url += `&project_id=${filters.project_id}`;
      if (filters.parent_address_id)
        url += `&parent_address_id=${filters.parent_address_id}`;
      if (search) url += `&search=${search}`;

      if (sorting && sorting.length > 0) {
        const sortBy = CASE_LIST_SORT_FIELDS[sorting[0].id];
        if (sortBy) {
          url += `&sort_by=${sortBy}&sort_order=${sorting[0].desc ? "desc" : "asc"}`;
        }
      }

      const res = await api.get(url);

      if (res.data) {
        const responseData =
          res.data.info?.data || res.data.info || res.data.data || [];
        setData(sortCaseListRows(responseData, sorting));
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
          setTotalRows(responseData.length);
        }

        if (pagMeta.totalPages !== undefined) {
          setPageCount(pagMeta.totalPages);
        } else if (pagMeta.last_page !== undefined) {
          setPageCount(pagMeta.last_page);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);

      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, textArea.value.length);

      const successful = (document as any).execCommand("copy");
      document.body.removeChild(textArea);

      if (successful) toast.success("Copied!");
      else toast.error("Copy failed!");
    } catch (err) {
      console.error("Fallback copy failed:", err);
      toast.error("Failed to copy!");
    }
  };

  const handleProgressSave = useCallback(async (rowId: number, clampedValue: number) => {
    const res = await api.put("address/change-address-progress", {
      id: rowId,
      progress: clampedValue,
    });

    if (!res.data?.IsSuccess) {
      throw new Error(res.data?.message || "Failed to update progress");
    }

    const info = res.data.info || {};
    const derived = progressToStatus(clampedValue);

    setData((prev: any[]) =>
      prev.map((item) =>
        item.id === rowId
          ? {
              ...item,
              progress: info.progress ?? `${clampedValue}%`,
              status_int: info.status ?? derived.status_int,
              status_text: info.status_text ?? derived.status_text,
            }
          : item,
      ),
    );

    toast.success(res.data.message);
  }, []);

  const columns = useMemo(
    () => [
      {
        id: "select",
        enableSorting: false,
        header: () => (
          <Stack direction="row" alignItems="center">
            <CustomCheckbox
              className="header-checkbox"
              checked={data.length > 0 && selectedRowIds.size === data.length}
              indeterminate={
                selectedRowIds.size > 0 && selectedRowIds.size < data.length
              }
              onClick={(e: any) => e.stopPropagation()}
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
                onClick={(e: any) => e.stopPropagation()}
                onChange={(e: any) => {
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
                  transition: "opacity .2s ease",
                }}
              />
            </Stack>
          );
        },
      },

      {
        header: "Cases",
        id: "name",
        accessorKey: "name",
        cell: ({ row }: any) => {
          const item = row.original;

          return (
            <Tooltip title={item.name ? item.name : "-"}>
              <Typography
                variant="body2"
                sx={{
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  wordBreak: "break-word",
                  minWidth: "150px",
                  width: "100%",
                  maxWidth: "500px",
                  borderRadius: 1,
                  border: "1px solid transparent",
                  transition: "all 0.2s ease",
                }}
              >
                {item.name}
              </Typography>
            </Tooltip>
          );
        },
      },

      {
        header: "Projects",
        id: "project_name",
        accessorKey: "project_name",
        cell: ({ row }: any) => {
          const item = row.original;

          return (
            <Tooltip title={item.project_name ?? ""}>
              <Typography
                variant="body2"
                sx={{
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  wordBreak: "break-word",
                  px: 1.5,
                  borderRadius: 1,
                  cursor: "pointer",
                  border: "1px solid transparent",
                  transition: "all 0.2s ease",
                }}
              >
                {item.project_name ? item.project_name : "-"}
              </Typography>
            </Tooltip>
          );
        },
      },

      {
        header: "Progress",
        id: "progress",
        accessorKey: "progress",
        cell: ({ row, getValue }: any) => {
          const item = row.original;
          return (
            <ClickToEditProgress
              value={getValue()}
              rowId={item.id}
              statusInt={item.status_int}
              editedBy={item.editedBy ?? undefined}
              editedAt={item.edited_at ?? undefined}
              onSave={handleProgressSave}
            />
          );
        },
      },

      {
        header: "Status",
        id: "status",
        accessorKey: "status",
        cell: ({ row }: any) => {
          const status = row.original.status_text;
          const status_int = row.original.status_int;
          let color = "text.primary";

          if (status_int === 13) color = "#999999";
          else if (status_int === 4) color = "#32A852";
          else if (status_int === 3) color = "#FF7F00";

          return (
            <Typography
              className="f-14"
              color={color}
              fontWeight={500}
              sx={{ px: 1.5 }}
              width={100}
            >
              {status}
            </Typography>
          );
        },
      },

      {
        header: "Case Id",
        id: "case_id",
        accessorKey: "case_id",
        cell: ({ row }: any) => {
          const case_id = row.original.case_id ? row.original.case_id : "";

          return (
            <Tooltip title={case_id}>
              <Typography
                variant="body2"
                sx={{
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  wordBreak: "break-word",
                  px: 1.5,
                  borderRadius: 1,
                  cursor: "pointer",
                  border: "1px solid transparent",
                  transition: "all 0.2s ease",
                }}
                onClick={() => {
                  if (!case_id) {
                    toast.error("No case id to copy!");
                    return;
                  }

                  if (navigator?.clipboard?.writeText) {
                    navigator.clipboard
                      .writeText(case_id)
                      .then(() => toast.success("Copied!"))
                      .catch((err) => {
                        console.error("Clipboard API failed:", err);
                        fallbackCopy(case_id);
                      });
                  } else {
                    fallbackCopy(case_id);
                  }
                }}
              >
                {case_id}
              </Typography>
            </Tooltip>
          );
        },
      },

      {
        header: "Reference",
        id: "reference",
        accessorKey: "reference",
        cell: ({ row }: any) => {
          const item = row.original;

          return (
            <Tooltip title={item.ref ?? ""}>
              <Typography
                variant="body2"
                sx={{
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  wordBreak: "break-word",
                  px: 1.5,
                  borderRadius: 1,
                  cursor: "pointer",
                  border: "1px solid transparent",
                  transition: "all 0.2s ease",
                }}
              >
                {item.ref ?? "-"}
              </Typography>
            </Tooltip>
          );
        },
      },

      {
        header: "Type",
        id: "address_type",
        accessorKey: "address_type",
        cell: ({ getValue }: any) => (
          <Typography
            className="f-14"
            color="textPrimary"
            sx={{ px: 1.5, textTransform: "capitalize" }}
          >
            {getValue()}
          </Typography>
        ),
      },

      {
        header: "Latest Start",
        id: "start_date",
        accessorKey: "start_date",
        cell: ({ getValue }: any) => (
          <Typography className="f-14" color="textPrimary" sx={{ px: 1.5 }}>
            {formatDate(getValue())}
          </Typography>
        ),
      },

      {
        header: "Finish Date",
        id: "end_date",
        accessorKey: "end_date",
        cell: ({ getValue }: any) => (
          <Typography className="f-14" color="textPrimary" sx={{ px: 1.5 }}>
            {formatDate(getValue())}
          </Typography>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        header: "Actions",
        cell: ({ row }: any) => {
          const item = row.original;
          return (
            <Box display="flex" gap={1}>
              <IconButton
                color="primary"
                onClick={async (e) => {
                  e.stopPropagation();

                  try {
                    const res = await api.get(
                      `address/address-detail?address_id=${item.id}`,
                    );
                    const fullAddress = res.data?.info;
                    if (fullAddress) {
                      setEditingCase(fullAddress);
                    } else {
                      setEditingCase(item);
                    }
                  } catch (err) {
                    setEditingCase(item);
                  }

                  setIsViewOnly(true);
                  setEditDialogOpen(true);
                }}
              >
                <IconEye size={18} />
              </IconButton>
              <IconButton
                color="primary"
                onClick={async (e) => {
                  e.stopPropagation();

                  try {
                    const res = await api.get(
                      `address/address-detail?address_id=${item.id}`,
                    );
                    const fullAddress = res.data?.info;
                    if (fullAddress) {
                      setEditingCase(fullAddress);
                    } else {
                      setEditingCase(item);
                    }
                  } catch (err) {
                    setEditingCase(item);
                  }

                  setIsViewOnly(false);
                  setEditDialogOpen(true);
                }}
              >
                <IconEdit size={18} />
              </IconButton>
            </Box>
          );
        },
      },
    ],
    [data, selectedRowIds, hoveredRow, handleProgressSave],
  );
  const simpleColumns = columns.map((column: any) => ({
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
  } = useServerTable({
    data: data,
    columns,
    fetchData: fetchCases,
    debounceDependencies: [user?.company_id, search, JSON.stringify(filters)],
    state: { columnVisibility, sorting },
    onColumnVisibilityChange,
    onSortingChange: setSorting,
    manualSorting: true,
  });

  return (
    <PermissionGuard permission="Cases">
      <Box
        sx={{
          height: "calc(100vh - 100px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Stack
          mr={2}
          ml={2}
          mb={2}
          justifyContent="space-between"
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 1, sm: 2, md: 4 }}
        >
          <Grid
            container
            size={{ xs: 12, sm: 12 }}
            gap={1}
            alignItems="center"
            justifyContent={{ xs: "flex-start", sm: "flex-start" }}
            flexWrap="wrap"
            className="project_wrapper"
          >
            <Box display="flex" alignItems="center">
              <TextField
                size="small"
                placeholder="Search..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconSearch size="20" />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: { xs: "100%", sm: 300 } }}
              />

              <Button
                variant="contained"
                onClick={() => setOpen(true)}
                sx={{ mt: { xs: 1, sm: 0 }, ml: 1, minWidth: "40px", px: 1 }}
              >
                <IconFilter width={18} />
              </Button>
            </Box>
          </Grid>

          <Stack
            display="flex"
            justifyContent="flex-end"
            direction="row"
            gap={1}
            flexWrap="wrap"
            mt={{ xs: 2, sm: 0 }}
          >
            <Box display={"flex"}>
              <IconButton
                onClick={handleClickMenu}
                sx={{ ml: 1 }}
                color="primary"
              >
                <IconEye />
              </IconButton>
              <Popover
                id="basic-menu"
                anchorEl={anchorEl2}
                open={openMenu2}
                onClose={handleClose}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "right",
                }}
                transformOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
              >
                <FormGroup sx={{ p: 2 }}>
                  {table.getAllLeafColumns().map((column) => {
                    if (column.id === "select" || column.id === "actions")
                      return null;
                    return (
                      <FormControlLabel
                        key={column.id}
                        control={
                          <CustomCheckbox
                            checked={column.getIsVisible()}
                            onChange={column.getToggleVisibilityHandler()}
                          />
                        }
                        label={
                          typeof column.columnDef.header === "string"
                            ? column.columnDef.header
                            : column.id
                        }
                      />
                    );
                  })}
                </FormGroup>
              </Popover>
            </Box>
            <Box>
              {selectedRowIds.size > 0 && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<IconTrash width={18} />}
                  onClick={() => setOpenDialog(true)}
                >
                  Archive
                </Button>
              )}
              <IconButton onClick={handleClick} size="small">
                <IconDotsVertical width={18} />
              </IconButton>

              <Menu
                id="basic-menu-cases"
                anchorEl={anchorEl}
                open={openMenu}
                onClose={handleClose}
              >
                <MenuItem
                  onClick={() => {
                    handleClose();
                    setAddCaseDrawerOpen(true);
                  }}
                >
                  <ListItemIcon>
                    <IconPlus width={18} />
                  </ListItemIcon>
                  Add Case
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    handleClose();
                    setArchiveList(true);
                  }}
                >
                  <ListItemIcon>
                    <IconNotes width={18} />
                  </ListItemIcon>
                  Archive Case list
                </MenuItem>
              </Menu>
            </Box>
            {/* Filter Dialog */}
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
                    label="Status"
                    value={tempFilters.status}
                    onChange={(e) =>
                      setTempFilters({ ...tempFilters, status: e.target.value })
                    }
                    fullWidth
                  >
                    <MenuItem value="All">All</MenuItem>
                    <MenuItem value="Completed">Completed</MenuItem>
                    <MenuItem value="To Do">To Do</MenuItem>
                    <MenuItem value="In Progress">In Progress</MenuItem>
                  </TextField>

                  <Autocomplete
                    options={projectList}
                    getOptionLabel={(option) => option.name || ""}
                    value={
                      projectList.find(
                        (p) => p.id === tempFilters.project_id,
                      ) || null
                    }
                    onChange={(e, value) => {
                      setTempFilters({
                        ...tempFilters,
                        project_id: value ? value.id : "",
                      });
                    }}
                    renderInput={(params) => (
                      <TextField {...params} label="Project" fullWidth />
                    )}
                  />

                  <Autocomplete
                    options={parentAddressList}
                    getOptionLabel={(option) => option.name || ""}
                    value={
                      parentAddressList.find(
                        (p) => p.id === tempFilters.parent_address_id,
                      ) || null
                    }
                    onChange={(e, value) => {
                      setTempFilters({
                        ...tempFilters,
                        parent_address_id: value ? value.id : "",
                      });
                    }}
                    renderInput={(params) => (
                      <TextField {...params} label="Parent Address" fullWidth />
                    )}
                  />
                </Stack>
              </DialogContent>

              <DialogActions>
                <Button
                  onClick={() => {
                    setTempFilters({
                      status: "",
                      project_id: "",
                      parent_address_id: "",
                    });
                    setFilters({
                      status: "",
                      project_id: "",
                      parent_address_id: "",
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
          </Stack>
        </Stack>

        <ArchiveAddress
          open={archiveList}
          onClose={() => setArchiveList(false)}
          onWorkUpdated={fetchCases}
        />

        {/* Dialogs and Drawers */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
          <DialogTitle>Confirm Archive</DialogTitle>
          <DialogContent>
            <Typography color="textSecondary">
              Are you sure you want to archive {selectedRowIds.size} case?
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
                    address_ids: Array.from(selectedRowIds).join(","),
                  };
                  const res = await api.post(
                    "address/archive-addresses",
                    payload,
                  );

                  if (res.data.IsSuccess) {
                    toast.success("Cases archived successfully.");
                  }
                  fetchCases();
                  setSelectedRowIds(new Set());
                } catch (error) {
                  console.error(error);
                  toast.error("Error archiving addresses.");
                }
                setOpenDialog(false);
              }}
              variant="outlined"
              color="error"
            >
              Archive
            </Button>
          </DialogActions>
        </Dialog>
        <Divider />
        <TableContainer
          sx={{ flex: 1, minHeight: 0, overflowX: "auto", overflowY: "auto" }}
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
                          onClick={
                            isSortable
                              ? header.column.getToggleSortingHandler()
                              : undefined
                          }
                          sx={{
                            cursor: isSortable ? "pointer" : "default",
                            display: "flex",
                            alignItems: "center",
                            "&:hover": {
                              color: isSortable ? "#888" : "inherit",
                            },
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
              {loading ? (
                <SkeletonLoader
                  columns={simpleColumns}
                  rowCount={simpleColumns.length}
                />
              ) : table.getRowModel().rows.length === 0 ? (
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
          <Divider />
        </TableContainer>
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
      {/* Add Case Drawer */}
      <CaseAddDrawer
        open={addCaseDrawerOpen}
        onClose={() => setAddCaseDrawerOpen(false)}
        projects={projectList}
        parentAddresses={parentAddressList}
        companyId={user?.company_id}
        cases={data}
        onSave={fetchCases}
      />
      {/* Edit Case Drawer */}
      <CaseEditDrawer
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        selectedCase={editingCase}
        projects={projectList}
        isViewOnly={isViewOnly}
        onSave={() => {
          fetchCases();
        }}
      />
    </PermissionGuard>
  );
};

export default CasesList;
