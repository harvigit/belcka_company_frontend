"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  ListItemIcon,
  Menu,
  MenuItem,
  Slider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {
  Circle,
  GoogleMap,
  InfoWindow,
  Marker,
  OverlayView,
} from "@react-google-maps/api";
import { useJsApiLoader } from "@react-google-maps/api";
import {
  IconArrowLeft,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconDotsVertical,
  IconFileExport,
  IconFileImport,
  IconList,
  IconMap,
  IconMapPin,
  IconNotes,
  IconPlus,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import { GOOGLE_MAPS_SHARED_LOADER_OPTIONS } from "@/utils/googleMaps";
import ArchiveParentAddress from "./archive-parent-address-list";
import ExcelImportModal from "@/app/components/common/ExcelImportModal";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import { useServerTable } from "@/hooks/useServerTable";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";

dayjs.extend(customParseFormat);

const stickyHeadCell = {
  position: "sticky",
  top: 0,
  zIndex: 2,
  bgcolor: "background.paper",
};

const LONDON = { lat: 51.5074, lng: -0.1278 };
const addressColumns = [{ id: "name", accessorKey: "name" }];

type ParentAddress = {
  id: number;
  name: string;
  short_name?: string | null;
  pin_code?: string | null;
  lat?: number | null;
  lng?: number | null;
  radius?: number | null;
  cases?: number;
  progress?: number;
  status_text?: string;
  type?: string | null;
  group_id?: number | null;
  group_name?: string | null;
};

type AddressGroupOption = { id: number; name: string };

type CaseRow = {
  id: number;
  name: string;
  case_name?: string | null;
  parent_address_id?: number | null;
  status_int?: number;
  progress?: string | number;
  status_text?: string;
  case_id?: string | null;
  ref?: string | null;
  po_sum?: string | null;
  variation_sum?: string | null;
  variation_status?: string | null;
  client_po?: string | null;
  excel_status?: string | null;
  project_id?: number;
  project_name?: string;
  start_date?: string | null;
  end_date?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type ProjectOption = { id: number; name: string };

type PanelState =
  | { mode: "address"; addressId: number }
  | { mode: "case"; addressIds: number[]; caseId: number | null };

type AddressForm = {
  shortName: string;
  street: string;
  postcode: string;
  type: string;
  lat: number | null;
  lng: number | null;
  radius: number;
  useRadius: boolean;
};

type CaseForm = {
  projectId: string;
  scope: string;
  reference: string;
  caseId: string;
  progress: number;
  poSum: string;
  variationSum: string;
  variationStatus: string;
  clientPo: string;
  excelStatus: string;
};

type DraftSite = {
  key: string;
  siteName: string;
  street: string;
  postcode: string;
  lat: number | null;
  lng: number | null;
  radius: number;
};

type Prediction = {
  id: string;
  label: string;
  source: "postcoder" | "google";
  postcode?: string;
  placeId?: string;
};

type AddressWorkspaceProps = {
  embedded?: boolean;
};

const emptyAddressForm = (): AddressForm => ({
  shortName: "",
  street: "",
  postcode: "",
  type: "address",
  lat: null,
  lng: null,
  radius: 100,
  useRadius: true,
});

const emptyCaseForm = (): CaseForm => ({
  projectId: "",
  scope: "",
  reference: "",
  caseId: "",
  progress: 0,
  poSum: "",
  variationSum: "",
  variationStatus: "",
  clientPo: "",
  excelStatus: "",
});

function progressValue(value?: string | number | null) {
  if (value == null) return 0;
  const numeric = Number(String(value).replace("%", "").trim());
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

const emptySite = (): DraftSite => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  siteName: "",
  street: "",
  postcode: "",
  lat: null,
  lng: null,
  radius: 100,
});

function asList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (
    value &&
    typeof value === "object" &&
    Array.isArray((value as { data?: T[] }).data)
  ) {
    return (value as { data: T[] }).data;
  }
  return [];
}

function errorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { message?: string } } })
    ?.response?.data;
  if (data?.message) return data.message;
  if (error instanceof Error && !(error as { response?: unknown }).response) {
    return error.message;
  }
  return fallback;
}

function addressTitle(address: ParentAddress) {
  return address.short_name?.trim() || address.name;
}

function addressSubtitle(address: ParentAddress) {
  const parts = [address.name, address.pin_code].filter(Boolean);
  return parts
    .filter((part, index) => parts.indexOf(part) === index)
    .join(" · ");
}

function recordDate(value?: string | null) {
  if (value == null) return "";
  const text = String(value).trim();
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const parsed = dayjs(text);
    return parsed.isValid() ? parsed.format("DD/MM/YYYY") : text;
  }
  return text;
}

function caseTitle(row: CaseRow) {
  return row.case_name?.trim() || row.name;
}

function statusColor(label?: string | null): "success" | "warning" | "default" {
  const text = label?.trim().toLowerCase() || "";
  if (text.includes("complete")) return "success";
  if (text.includes("progress")) return "warning";
  return "default";
}

function hasPoint(lat?: number | null, lng?: number | null) {
  return Number.isFinite(lat) && Number.isFinite(lng);
}

async function searchPlaces(
  query: string,
  mapsReady: boolean,
): Promise<Prediction[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  try {
    const res = await fetch(
      `https://ws.postcoder.com/pcw/${
        process.env.NEXT_PUBLIC_POSTCODER_KEY
      }/address/UK/${encodeURIComponent(trimmed)}?format=json`,
    );
    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("json")) {
      const data = await res.json();
      if (Array.isArray(data) && data.length) {
        return data
          .slice(0, 6)
          .map(
            (
              item: { summaryline: string; postcode?: string },
              index: number,
            ) => ({
              id: `pc-${index}-${item.summaryline}`,
              label: item.summaryline,
              source: "postcoder" as const,
              postcode: item.postcode,
            }),
          );
      }
    }
  } catch {
    // Google suggestions are the fallback when postcode search is unavailable.
  }

  if (!mapsReady || typeof google === "undefined") return [];

  return new Promise((resolve) => {
    const service = new google.maps.places.AutocompleteService();
    service.getPlacePredictions({ input: trimmed }, (results, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
        resolve([]);
        return;
      }
      resolve(
        results.slice(0, 6).map((item) => ({
          id: item.place_id,
          label: item.description,
          source: "google" as const,
          placeId: item.place_id,
        })),
      );
    });
  });
}

function resolvePrediction(item: Prediction): Promise<{
  street: string;
  postcode: string;
  lat: number | null;
  lng: number | null;
}> {
  if (
    item.source === "google" &&
    item.placeId &&
    typeof google !== "undefined"
  ) {
    return new Promise((resolve) => {
      const service = new google.maps.places.PlacesService(
        document.createElement("div"),
      );
      service.getDetails({ placeId: item.placeId! }, (place, status) => {
        if (
          status !== google.maps.places.PlacesServiceStatus.OK ||
          !place?.geometry?.location
        ) {
          resolve({ street: item.label, postcode: "", lat: null, lng: null });
          return;
        }
        const postcode =
          place.address_components?.find((part) =>
            part.types.includes("postal_code"),
          )?.long_name || "";
        resolve({
          street: place.formatted_address || item.label,
          postcode,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
      });
    });
  }

  return new Promise((resolve) => {
    if (typeof google === "undefined") {
      resolve({
        street: item.label,
        postcode: item.postcode || "",
        lat: null,
        lng: null,
      });
      return;
    }
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode(
      { address: `${item.label}${item.postcode ? `, ${item.postcode}` : ""}` },
      (results, status) => {
        const location = results?.[0]?.geometry?.location;
        resolve({
          street: item.label,
          postcode: item.postcode || "",
          lat: status === "OK" && location ? location.lat() : null,
          lng: status === "OK" && location ? location.lng() : null,
        });
      },
    );
  });
}

function StatusChip({ label }: { label?: string | null }) {
  const text = label?.trim();
  if (!text) return null;
  return (
    <Chip
      size="small"
      color={statusColor(text)}
      label={text}
      sx={{ fontWeight: 600 }}
    />
  );
}

function AddressWorkspace({ embedded = false }: AddressWorkspaceProps) {
  const { data: session } = useSession();
  const user = session?.user as User | undefined;
  const companyId = user?.company_id;
  const { isLoaded } = useJsApiLoader({
    ...GOOGLE_MAPS_SHARED_LOADER_OPTIONS,
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
  });

  const [addresses, setAddresses] = useState<ParentAddress[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [addressGroups, setAddressGroups] = useState<AddressGroupOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedById, setSelectedById] = useState<
    Record<number, ParentAddress>
  >({});
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [casesByParent, setCasesByParent] = useState<Record<number, CaseRow[]>>(
    {},
  );
  const [caseTotals, setCaseTotals] = useState<Record<number, number>>({});
  const [casesLoading, setCasesLoading] = useState<Record<number, boolean>>({});
  const [view, setView] = useState<"list" | "map">("list");
  const [mapAddressId, setMapAddressId] = useState<number | null>(null);
  const [panel, setPanel] = useState<PanelState | null>(null);
  const [addressForm, setAddressForm] = useState<AddressForm>(emptyAddressForm);
  const [caseForm, setCaseForm] = useState<CaseForm>(emptyCaseForm);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<"single" | "group">("single");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const visibleAddresses = useMemo(() => {
    if (typeFilter === "all" || typeFilter.startsWith("group:"))
      return addresses;
    return addresses.filter(
      (item) =>
        String(item.type || "address")
          .trim()
          .toLowerCase() === typeFilter,
    );
  }, [addresses, typeFilter]);

  const fetchAddresses = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        company_id: String(companyId),
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
      });
      const term = searchInput.trim();
      if (term) params.set("search", term);
      if (typeFilter === "address" || typeFilter === "location") {
        params.set("type", typeFilter);
      }
      if (typeFilter.startsWith("group:")) {
        const groupId = typeFilter.slice("group:".length);
        if (groupId) params.set("group_id", groupId);
      }
      const res = await api.get(`address/get-parent?${params.toString()}`);
      const rows = asList<ParentAddress>(res.data?.info);
      setAddresses(rows);
      setAddressGroups(asList<AddressGroupOption>(res.data?.groups));
      const totalItems = Number(res.data?.data?.totalItems ?? rows.length);
      setTotalRows(totalItems);
      setPageCount(
        Number(
          res.data?.data?.totalPages ??
            Math.max(
              1,
              Math.ceil(totalItems / Math.max(pagination.pageSize, 1)),
            ),
        ),
      );
    } catch (error) {
      toast.error(errorMessage(error, "Could not load addresses."));
    } finally {
      setLoading(false);
    }
  };

  const {
    table,
    pagination,
    setPagination,
    setPageCount,
    setTotalRows,
    totalRows,
  } = useServerTable<ParentAddress>({
    data: visibleAddresses,
    columns: addressColumns,
    fetchData: fetchAddresses,
    debounceDependencies: [searchInput, companyId ?? "", typeFilter],
    enableSorting: false,
    manualSorting: true,
    initialPagination: { pageIndex: 0, pageSize: 50 },
  });

  const fetchProjects = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await api.get(`project/get?company_id=${companyId}`);
      setProjects(asList<ProjectOption>(res.data?.info));
    } catch (error) {
      console.error(error);
    }
  }, [companyId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Loads every case of a parent address (no paging).
  const loadCases = useCallback(
    async (parentId: number) => {
      if (!companyId) return;
      setCasesLoading((current) => ({ ...current, [parentId]: true }));
      try {
        const res = await api.get(
          `address/get?company_id=${companyId}&parent_address_id=${parentId}&summary=1`,
        );
        const rows = asList<CaseRow>(res.data?.info);
        const total = Number(res.data?.data?.totalItems ?? rows.length);
        setCasesByParent((current) => ({
          ...current,
          [parentId]: rows,
        }));
        setCaseTotals((current) => ({ ...current, [parentId]: total }));
      } catch (error) {
        toast.error(
          errorMessage(error, "Could not load cases for this address."),
        );
      } finally {
        setCasesLoading((current) => ({ ...current, [parentId]: false }));
      }
    },
    [companyId],
  );

  const selectedAddresses = Object.values(selectedById);
  const mapAddress =
    visibleAddresses.find((item) => item.id === mapAddressId) ||
    addresses.find((item) => item.id === mapAddressId) ||
    null;
  const panelAddress =
    panel?.mode === "address"
      ? addresses.find((item) => item.id === panel.addressId) || null
      : null;
  const caseAddresses =
    panel?.mode === "case"
      ? panel.addressIds
          .map(
            (id) =>
              addresses.find((item) => item.id === id) || selectedById[id],
          )
          .filter((item): item is ParentAddress => Boolean(item))
      : [];
  const activeCase =
    panel?.mode === "case" && panel.caseId
      ? Object.values(casesByParent)
          .flat()
          .find((item) => item.id === panel.caseId) || null
      : null;

  const toggleExpanded = (address: ParentAddress) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(address.id)) next.delete(address.id);
      else next.add(address.id);
      return next;
    });
    if (!casesByParent[address.id]) loadCases(address.id);
  };

  const openAddressPanel = (address: ParentAddress) => {
    setPanel({ mode: "address", addressId: address.id });
    setAddressForm({
      shortName: address.short_name || "",
      street: address.name || "",
      postcode: address.pin_code || "",
      type: address.type === "location" ? "location" : "address",
      lat: hasPoint(address.lat, address.lng) ? Number(address.lat) : null,
      lng: hasPoint(address.lat, address.lng) ? Number(address.lng) : null,
      radius: Number(address.radius) > 0 ? Number(address.radius) : 100,
      useRadius: Number(address.radius) > 0,
    });
  };

  const openCasePanel = (address: ParentAddress, row: CaseRow) => {
    setPanel({ mode: "case", addressIds: [address.id], caseId: row.id });
    setCaseForm({
      projectId: row.project_id ? String(row.project_id) : "",
      scope: caseTitle(row),
      reference: row.ref || "",
      caseId: row.case_id || "",
      progress: progressValue(row.progress),
      poSum: row.po_sum || "",
      variationSum: row.variation_sum || "",
      variationStatus: row.variation_status || "",
      clientPo: row.client_po || "",
      excelStatus: row.excel_status || "",
    });
  };

  const openCreatePanel = (ids: number[]) => {
    if (!ids.length) {
      toast.error("Select an address first.");
      return;
    }
    setPanel({ mode: "case", addressIds: ids, caseId: null });
    setCaseForm(emptyCaseForm());
  };

  const selectMapAddress = (address: ParentAddress | null) => {
    if (!address) {
      setMapAddressId(null);
      return;
    }
    setMapAddressId(address.id);
    if (!casesByParent[address.id]) loadCases(address.id);
  };

  const saveAddress = async () => {
    if (!panel || panel.mode !== "address" || !companyId) return;
    if (!addressForm.street.trim() || !addressForm.postcode.trim()) {
      toast.error("Street and postcode are required.");
      return;
    }
    setSaving(true);
    try {
      const boundary =
        addressForm.useRadius && hasPoint(addressForm.lat, addressForm.lng)
          ? JSON.stringify({
              lat: addressForm.lat,
              lng: addressForm.lng,
              radius: addressForm.radius,
            })
          : null;
      const res = await api.put("address/parent-update", {
        id: panel.addressId,
        company_id: companyId,
        name: addressForm.street.trim(),
        short_name: addressForm.shortName.trim(),
        pin_code: addressForm.postcode.trim(),
        type: addressForm.type,
        latitude: addressForm.lat,
        longitude: addressForm.lng,
        boundary,
      });
      if (res.data?.IsSuccess === false) {
        toast.error(res.data.message || "Could not save the address.");
        return;
      }
      toast.success(res.data?.message || "Address saved.");
      setPanel(null);
      await fetchAddresses();
    } catch (error) {
      toast.error(errorMessage(error, "Could not save the address."));
    } finally {
      setSaving(false);
    }
  };

  const saveCase = async () => {
    if (!panel || panel.mode !== "case" || !companyId) return;
    if (!caseForm.projectId) {
      toast.error("Select a project for this case.");
      return;
    }
    if (!caseForm.scope.trim()) {
      toast.error("Enter a scope or case title.");
      return;
    }

    const targets = caseAddresses;
    if (!targets.length) {
      toast.error("The selected address is no longer available.");
      return;
    }
    const missingLocation = targets.filter(
      (item) => !hasPoint(item.lat, item.lng) && !panel.caseId,
    );
    if (missingLocation.length) {
      toast.error(
        "Each address needs a map location before a case can be created.",
      );
      return;
    }

    setSaving(true);
    try {
      if (panel.caseId) {
        const row = activeCase;
        const parent = targets[0];
        const lat = Number(row?.latitude ?? parent?.lat);
        const lng = Number(row?.longitude ?? parent?.lng);
        if (!hasPoint(lat, lng)) {
          toast.error("This case has no map location.");
          return;
        }
        const res = await api.put("address/update", {
          id: panel.caseId,
          name: caseForm.scope.trim(),
          project_id: Number(caseForm.projectId),
          project_ids: [Number(caseForm.projectId)],
          lat,
          lng,
          type: "circle",
          ref: caseForm.reference.trim(),
          case_id: caseForm.caseId,
          po_sum: caseForm.poSum.trim(),
          variation_sum: caseForm.variationSum.trim(),
          variation_status: caseForm.variationStatus.trim(),
          client_po: caseForm.clientPo.trim(),
          excel_status: caseForm.excelStatus.trim(),
        });
        if (res.data?.IsSuccess === false) {
          toast.error(res.data.message || "Could not save the case.");
          return;
        }
        const nextProgress = progressValue(caseForm.progress);
        if (nextProgress !== progressValue(row?.progress)) {
          const progressRes = await api.put("address/change-address-progress", {
            id: panel.caseId,
            progress: nextProgress,
          });
          if (progressRes.data?.IsSuccess === false) {
            toast.error(
              progressRes.data.message ||
                "Case saved, but progress could not be updated.",
            );
            await loadCases(parent.id);
            return;
          }
        }
        toast.success(res.data?.message || "Case saved.");
        await loadCases(parent.id);
      } else {
        let created = 0;
        for (const parent of targets) {
          const radius =
            Number(parent.radius) > 0 ? Number(parent.radius) : 100;
          const createdRes = await api.post("address/create", {
            name: caseForm.scope.trim(),
            project_id: Number(caseForm.projectId),
            parent_address_id: parent.id,
            company_id: companyId,
            lat: parent.lat,
            lng: parent.lng,
            type: "circle",
            radius,
            color: "#5D87FF",
            ref: caseForm.reference.trim(),
            boundary: JSON.stringify({
              lat: parent.lat,
              lng: parent.lng,
              radius,
            }),
          });
          const newId = createdRes.data?.info?.id;
          if (!newId) continue;
          created += 1;
          await loadCases(parent.id);
        }
        if (!created) {
          toast.error("Could not create a case for the selected addresses.");
          return;
        }
        toast.success(
          created === 1 ? "Case created." : `${created} cases created.`,
        );
      }
      setSelectedById({});
      setPanel(null);
      await fetchAddresses();
    } catch (error) {
      toast.error(errorMessage(error, "Could not save the case."));
    } finally {
      setSaving(false);
    }
  };

  const exportAddresses = async () => {
    if (!companyId) return;
    try {
      const res = await api.post(
        "address/export",
        {
          company_id: companyId,
          ids: selectedAddresses.map((item) => item.id).join(","),
        },
        { responseType: "blob" },
      );
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "address_export.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(errorMessage(error, "Could not export addresses."));
    }
  };

  const archiveSelected = async () => {
    setSaving(true);
    try {
      const res = await api.post("address/parent-archive", {
        address_ids: selectedAddresses.map((item) => item.id).join(","),
      });
      if (res.data?.IsSuccess === false) {
        toast.error(res.data.message || "Could not archive those addresses.");
        return;
      }
      toast.success(res.data?.message || "Addresses archived.");
      setSelectedById({});
      setArchiveConfirm(false);
      setPanel(null);
      await fetchAddresses();
    } catch (error) {
      toast.error(errorMessage(error, "Could not archive those addresses."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      sx={{
        flex: 1,
        height: embedded ? "100%" : "calc(100vh - 140px)",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        bgcolor: "background.paper",
      }}
    >
      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={1.5}
        alignItems={{ lg: "center" }}
        justifyContent="space-between"
        sx={{ px: 2.5, pt: 2.5, pb: 1.5, flexShrink: 0 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Addresses
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage locations and their project cases in one place.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="outlined"
            startIcon={<IconPlus size={18} />}
            onClick={() => {
              setAddMode("single");
              setAddOpen(true);
            }}
          >
            Add address
          </Button>

          <Button
            variant="outlined"
            startIcon={<IconPlus size={18} />}
            onClick={() => {
              setAddMode("group");
              setAddOpen(true);
            }}
          >
            Add address group
          </Button>
          <IconButton
            aria-label="Address actions"
            onClick={(event) => setMenuAnchor(event.currentTarget)}
          >
            <IconDotsVertical size={18} />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
          >
            <MenuItem
              onClick={() => {
                setMenuAnchor(null);
                setImportOpen(true);
              }}
            >
              <ListItemIcon>
                <IconFileImport width={18} />
              </ListItemIcon>
              Import addresses
            </MenuItem>
            <MenuItem
              onClick={() => {
                setMenuAnchor(null);
                exportAddresses();
              }}
            >
              <ListItemIcon>
                <IconFileExport width={18} />
              </ListItemIcon>
              Export addresses
            </MenuItem>
            <MenuItem
              onClick={() => {
                setMenuAnchor(null);
                setArchiveOpen(true);
              }}
            >
              <ListItemIcon>
                <IconNotes width={18} />
              </ListItemIcon>
              Archived addresses
            </MenuItem>
          </Menu>
        </Stack>
      </Stack>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        alignItems={{ md: "center" }}
        sx={{ px: 2.5, pb: 1.5 }}
      >
        <TextField
          size="small"
          placeholder="Search addresses or postcodes"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          sx={{ minWidth: { md: 320 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconSearch size={16} />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          select
          size="small"
          value={typeFilter}
          onChange={(event) => {
            setTypeFilter(event.target.value);
            setPagination((current) =>
              current.pageIndex === 0 ? current : { ...current, pageIndex: 0 },
            );
          }}
          SelectProps={{
            MenuProps: {
              sx: { zIndex: 1600 },
            },
          }}
          sx={{ minWidth: 240 }}
        >
          <MenuItem value="all">All address groups</MenuItem>
          {addressGroups.map((group) => (
            <MenuItem key={group.id} value={`group:${group.id}`}>
              {group.name}
            </MenuItem>
          ))}
        </TextField>
        <Box flex={1} />
        <Typography variant="body2" color="text.secondary">
          {totalRows} addresses
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={view}
          onChange={(_event, next) => {
            if (next) setView(next);
          }}
        >
          <ToggleButton value="list">
            <IconList size={16} />
            <Box component="span" sx={{ ml: 0.75 }}>
              List
            </Box>
          </ToggleButton>
          <ToggleButton value="map">
            <IconMap size={16} />
            <Box component="span" sx={{ ml: 0.75 }}>
              Map
            </Box>
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {selectedAddresses.length > 0 && view === "list" ? (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ px: 2.5, pb: 1.5, flexShrink: 0 }}
        >
          <Typography variant="body2">
            {selectedAddresses.length} selected
          </Typography>
          <Button
            size="small"
            variant="contained"
            onClick={() =>
              openCreatePanel(selectedAddresses.map((item) => item.id))
            }
          >
            Create case
          </Button>
          <Button
            size="small"
            color="inherit"
            onClick={() => setArchiveConfirm(true)}
          >
            Archive
          </Button>
          <Button
            size="small"
            color="inherit"
            onClick={() => setSelectedById({})}
          >
            Clear
          </Button>
        </Stack>
      ) : null}

      <Box sx={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              px: 2.5,
            }}
          >
            {view === "map" ? (
              <MapWorkspace
                isLoaded={isLoaded}
                addresses={visibleAddresses}
                selected={mapAddress}
                cases={mapAddress ? casesByParent[mapAddress.id] || [] : []}
                casesLoading={
                  mapAddress ? Boolean(casesLoading[mapAddress.id]) : false
                }
                onSelect={selectMapAddress}
                onEditLocation={(address) => {
                  selectMapAddress(address);
                  openAddressPanel(address);
                }}
                onCreateCase={(address) => {
                  selectMapAddress(address);
                  openCreatePanel([address.id]);
                }}
                onOpenCase={openCasePanel}
              />
            ) : (
              <TableContainer sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" sx={stickyHeadCell} />
                      <TableCell width={48} sx={stickyHeadCell} />
                      <TableCell sx={stickyHeadCell}>Address</TableCell>
                      <TableCell sx={stickyHeadCell}>Location</TableCell>
                      <TableCell align="right" sx={stickyHeadCell}>
                        Cases
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                          <CircularProgress size={28} />
                        </TableCell>
                      </TableRow>
                    ) : visibleAddresses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <Typography color="text.secondary" py={2}>
                            {typeFilter.startsWith("group:")
                              ? "No addresses in this group."
                              : typeFilter === "location"
                                ? "No locations match this filter."
                                : typeFilter === "address"
                                  ? "No addresses match this filter."
                                  : "No addresses match this search."}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      visibleAddresses.map((address) => {
                        const expanded = expandedIds.has(address.id);
                        const cases = casesByParent[address.id] || [];
                        const casesBusy = Boolean(casesLoading[address.id]);
                        return (
                          <React.Fragment key={address.id}>
                            <TableRow hover>
                              <TableCell padding="checkbox">
                                <CustomCheckbox
                                  size="small"
                                  checked={Boolean(selectedById[address.id])}
                                  onChange={() => {
                                    setSelectedById((current) => {
                                      const next = { ...current };
                                      if (next[address.id])
                                        delete next[address.id];
                                      else next[address.id] = address;
                                      return next;
                                    });
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <IconButton
                                  size="small"
                                  onClick={() => toggleExpanded(address)}
                                  aria-label="Show cases"
                                >
                                  {expanded ? (
                                    <IconChevronDown size={18} />
                                  ) : (
                                    <IconChevronRight size={18} />
                                  )}
                                </IconButton>
                              </TableCell>
                              <TableCell
                                sx={{ cursor: "pointer" }}
                                onClick={() => toggleExpanded(address)}
                              >
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  alignItems="center"
                                  flexWrap="wrap"
                                  useFlexGap
                                >
                                  <Typography fontWeight={700}>
                                    {addressTitle(address)}
                                  </Typography>
                                  {address.group_name ? (
                                    <Chip
                                      size="small"
                                      color="primary"
                                      variant="outlined"
                                      label={address.group_name}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        if (!address.group_id) return;
                                        setTypeFilter(
                                          `group:${address.group_id}`,
                                        );
                                        setPagination((current) =>
                                          current.pageIndex === 0
                                            ? current
                                            : { ...current, pageIndex: 0 },
                                        );
                                      }}
                                    />
                                  ) : null}
                                </Stack>
                              </TableCell>
                              <TableCell
                                sx={{ cursor: "pointer" }}
                                onClick={() => toggleExpanded(address)}
                              >
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {addressSubtitle(address)}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Stack
                                  direction="row"
                                  spacing={0.5}
                                  justifyContent="flex-end"
                                  alignItems="center"
                                >
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<IconPlus size={14} />}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openCreatePanel([address.id]);
                                    }}
                                    sx={{
                                      py: 0.25,
                                      px: 1,
                                      minHeight: 0,
                                      fontSize: 12,
                                      whiteSpace: "nowrap",
                                      "& .MuiButton-startIcon": { mr: 0.5 },
                                    }}
                                  >
                                    Add case
                                  </Button>
                                  <Tooltip title="Edit address">
                                    <IconButton
                                      size="small"
                                      aria-label="Edit address"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        openAddressPanel(address);
                                      }}
                                    >
                                      <IconMap size={18} />
                                    </IconButton>
                                  </Tooltip>
                                  <Chip
                                    size="small"
                                    variant="outlined"
                                    label={`${address.cases ?? 0} ${address.cases === 1 ? "case" : "cases"}`}
                                  />
                                </Stack>
                              </TableCell>
                            </TableRow>
                            {expanded ? (
                              <TableRow>
                                <TableCell
                                  colSpan={5}
                                  sx={{
                                    py: 1,
                                    px: 1.5,
                                    bgcolor: "action.hover",
                                  }}
                                >
                                  {casesBusy && cases.length === 0 ? (
                                    <CircularProgress size={18} />
                                  ) : cases.length === 0 ? (
                                    <Stack
                                      direction="row"
                                      justifyContent="space-between"
                                      alignItems="center"
                                    >
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                      >
                                        No cases yet. Create one to allocate
                                        this address to a project.
                                      </Typography>
                                      <Button
                                        size="small"
                                        onClick={() =>
                                          openCreatePanel([address.id])
                                        }
                                      >
                                        Create case
                                      </Button>
                                    </Stack>
                                  ) : (
                                    <Box sx={{ opacity: casesBusy ? 0.6 : 1 }}>
                                      {/* All cases load at once, so long lists scroll here */}
                                      <Box
                                        sx={{
                                          maxHeight: 420,
                                          overflowY: "auto",
                                          border: "1px solid",
                                          borderColor: "divider",
                                          borderRadius: 1.5,
                                          bgcolor: "background.paper",
                                        }}
                                      >
                                        {cases.map((row, index) => {
                                          const active =
                                            panel?.mode === "case" &&
                                            panel.caseId === row.id;
                                          const progressValue = Math.min(
                                            Math.max(
                                              parseFloat(
                                                String(row.progress ?? ""),
                                              ) || 0,
                                              0,
                                            ),
                                            100,
                                          );
                                          const hasProgress =
                                            row.progress != null &&
                                            String(row.progress).trim() !== "";
                                          const details = [
                                            row.project_name,
                                            [
                                              recordDate(row.start_date),
                                              recordDate(row.end_date),
                                            ]
                                              .filter(Boolean)
                                              .join(" – "),
                                            row.po_sum && `PO ${row.po_sum}`,
                                            row.variation_sum &&
                                              `Variation ${row.variation_sum}`,
                                            row.variation_status &&
                                              `Var. status ${row.variation_status}`,
                                            row.client_po &&
                                              `Client PO ${row.client_po}`,
                                            row.excel_status &&
                                              `Excel ${row.excel_status}`,
                                          ]
                                            .filter(Boolean)
                                            .join(" · ");
                                          return (
                                            <Box
                                              key={row.id}
                                              onClick={() =>
                                                openCasePanel(address, row)
                                              }
                                              sx={{
                                                px: 1.25,
                                                py: 0.625,
                                                cursor: "pointer",
                                                borderTop: index
                                                  ? "1px solid"
                                                  : "none",
                                                borderColor: "divider",
                                                borderLeft: "3px solid",
                                                borderLeftColor: active
                                                  ? "primary.main"
                                                  : "transparent",
                                                bgcolor: active
                                                  ? "action.selected"
                                                  : "transparent",
                                                "&:hover": {
                                                  bgcolor: "action.hover",
                                                },
                                              }}
                                            >
                                              <Stack
                                                direction="row"
                                                alignItems="center"
                                                spacing={1}
                                              >
                                                {row.case_id ? (
                                                  <Typography
                                                    component="span"
                                                    sx={{
                                                      px: 0.625,
                                                      borderRadius: 0.75,
                                                      bgcolor: "action.hover",
                                                      color: "text.secondary",
                                                      fontFamily: "monospace",
                                                      fontSize: 11,
                                                      fontWeight: 700,
                                                      lineHeight: "18px",
                                                      flexShrink: 0,
                                                    }}
                                                  >
                                                    {row.case_id}
                                                  </Typography>
                                                ) : null}
                                                <Box minWidth={0} flex={1}>
                                                  <Typography
                                                    fontSize={13}
                                                    fontWeight={600}
                                                    noWrap
                                                    lineHeight={1.35}
                                                  >
                                                    {caseTitle(row)}
                                                  </Typography>
                                                  {details ? (
                                                    <Tooltip
                                                      title={details}
                                                      enterDelay={500}
                                                      placement="bottom-start"
                                                    >
                                                      <Typography
                                                        fontSize={11}
                                                        color="text.secondary"
                                                        noWrap
                                                        lineHeight={1.35}
                                                      >
                                                        {details}
                                                      </Typography>
                                                    </Tooltip>
                                                  ) : null}
                                                </Box>
                                                {hasProgress ? (
                                                  <Stack
                                                    direction="row"
                                                    alignItems="center"
                                                    spacing={0.75}
                                                    sx={{ flexShrink: 0 }}
                                                  >
                                                    <Typography
                                                      fontSize={11}
                                                      fontWeight={600}
                                                      color="text.secondary"
                                                      sx={{
                                                        minWidth: 30,
                                                        textAlign: "right",
                                                      }}
                                                    >
                                                      {Math.round(
                                                        progressValue,
                                                      )}
                                                      %
                                                    </Typography>
                                                  </Stack>
                                                ) : null}
                                                <Box sx={{ flexShrink: 0 }}>
                                                  <StatusChip
                                                    label={row.status_text}
                                                  />
                                                </Box>
                                              </Stack>
                                            </Box>
                                          );
                                        })}
                                      </Box>
                                    </Box>
                                  )}
                                </TableCell>
                              </TableRow>
                            ) : null}
                          </React.Fragment>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
          {view === "list" ? (
            <Box sx={{ flexShrink: 0, bgcolor: "background.paper" }}>
              <Divider />
              <TablePaginationFooter
                table={table}
                totalRows={totalRows}
                selectedCount={selectedAddresses.length}
              />
            </Box>
          ) : null}
        </Box>

        {panel ? (
          <Box
            sx={{
              width: { xs: "100%", md: 400 },
              flexShrink: 0,
              borderLeft: 1,
              borderColor: "divider",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Stack
              direction="row"
              alignItems="flex-start"
              justifyContent="space-between"
              sx={{ p: 2 }}
            >
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  {panel.mode === "address"
                    ? "Edit address"
                    : panel.caseId
                      ? "Edit case"
                      : "Create case"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {panel.mode === "address"
                    ? "Shared location details for every case."
                    : panel.caseId
                      ? "Project, scope and progress for this case."
                      : panel.addressIds.length > 1
                        ? "Creates a separate case for each selected address."
                        : "Allocates this address to a project."}
                </Typography>
              </Box>
              <IconButton
                aria-label="Close panel"
                onClick={() => setPanel(null)}
              >
                <IconX size={18} />
              </IconButton>
            </Stack>
            <Divider />
            <Stack
              spacing={2}
              sx={{ p: 2, flex: 1, minHeight: 0, overflow: "auto" }}
            >
              {panel.mode === "address" && panelAddress ? (
                <>
                  <TextField
                    label="Address name"
                    value={addressForm.shortName}
                    onChange={(event) =>
                      setAddressForm((current) => ({
                        ...current,
                        shortName: event.target.value,
                      }))
                    }
                  />
                  <TextField
                    label="Street / address"
                    value={addressForm.street}
                    onChange={(event) =>
                      setAddressForm((current) => ({
                        ...current,
                        street: event.target.value,
                      }))
                    }
                    required
                  />
                  <TextField
                    label="Postcode"
                    value={addressForm.postcode}
                    onChange={(event) =>
                      setAddressForm((current) => ({
                        ...current,
                        postcode: event.target.value,
                      }))
                    }
                    required
                  />
                  <PlaceSearch
                    mapsReady={isLoaded}
                    onPick={(place) => {
                      if (!hasPoint(place.lat, place.lng)) {
                        toast.error(
                          "That address has no map location, so its boundary cannot be shown.",
                        );
                      }
                      setAddressForm((current) => ({
                        ...current,
                        street: place.street,
                        postcode: place.postcode || current.postcode,
                        lat: hasPoint(place.lat, place.lng)
                          ? place.lat
                          : current.lat,
                        lng: hasPoint(place.lat, place.lng)
                          ? place.lng
                          : current.lng,
                        useRadius:
                          hasPoint(place.lat, place.lng) || current.useRadius,
                      }));
                    }}
                  />
                  <TextField
                    select
                    label="Type"
                    value={addressForm.type}
                    onChange={(event) =>
                      setAddressForm((current) => ({
                        ...current,
                        type: event.target.value,
                      }))
                    }
                  >
                    <MenuItem value="address">Address</MenuItem>
                    <MenuItem value="location">Location</MenuItem>
                  </TextField>
                  <Box>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">
                        Location radius {addressForm.radius} m
                      </Typography>
                    </Stack>
                    <Slider
                      min={10}
                      max={Math.max(200, addressForm.radius)}
                      value={addressForm.radius}
                      disabled={!hasPoint(addressForm.lat, addressForm.lng)}
                      onChange={(_event, value) =>
                        setAddressForm((current) => ({
                          ...current,
                          radius: Array.isArray(value) ? value[0] : value,
                          useRadius: true,
                        }))
                      }
                    />
                    {hasPoint(addressForm.lat, addressForm.lng) ? (
                      <BoundaryMap
                        isLoaded={isLoaded}
                        lat={Number(addressForm.lat)}
                        lng={Number(addressForm.lng)}
                        radius={addressForm.radius}
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Search and select an address to see its boundary.
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      Changes apply to the address. Each case keeps its own
                      project, dates and scope.
                    </Typography>
                  </Box>
                </>
              ) : (
                <>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: "action.hover",
                    }}
                  >
                    <Stack direction="row" spacing={1}>
                      <IconMapPin size={18} />
                      <Box>
                        <Typography fontWeight={700}>
                          {caseAddresses.length === 1
                            ? addressTitle(caseAddresses[0])
                            : `${caseAddresses.length} addresses`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {caseAddresses.length === 1
                            ? addressSubtitle(caseAddresses[0])
                            : "Each address gets its own case."}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                  <TextField
                    select
                    label="Project"
                    value={caseForm.projectId}
                    onChange={(event) =>
                      setCaseForm((current) => ({
                        ...current,
                        projectId: event.target.value,
                      }))
                    }
                    required
                  >
                    <MenuItem value="">Select a project</MenuItem>
                    {projects.map((project) => (
                      <MenuItem key={project.id} value={String(project.id)}>
                        {project.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Scope / case title"
                    value={caseForm.scope}
                    onChange={(event) =>
                      setCaseForm((current) => ({
                        ...current,
                        scope: event.target.value,
                      }))
                    }
                    required
                  />
                  <TextField
                    label="Reference (optional)"
                    value={caseForm.reference}
                    onChange={(event) =>
                      setCaseForm((current) => ({
                        ...current,
                        reference: event.target.value,
                      }))
                    }
                  />
                  {caseForm.caseId ? (
                    <>
                      <TextField
                        label="PO sum"
                        value={caseForm.poSum}
                        onChange={(event) =>
                          setCaseForm((current) => ({
                            ...current,
                            poSum: event.target.value,
                          }))
                        }
                      />
                      <TextField
                        label="Variation sum"
                        value={caseForm.variationSum}
                        onChange={(event) =>
                          setCaseForm((current) => ({
                            ...current,
                            variationSum: event.target.value,
                          }))
                        }
                      />
                      <TextField
                        label="Variation status"
                        value={caseForm.variationStatus}
                        onChange={(event) =>
                          setCaseForm((current) => ({
                            ...current,
                            variationStatus: event.target.value,
                          }))
                        }
                      />
                      <TextField
                        label="Client PO"
                        value={caseForm.clientPo}
                        onChange={(event) =>
                          setCaseForm((current) => ({
                            ...current,
                            clientPo: event.target.value,
                          }))
                        }
                      />
                      <TextField
                        label="Excel status"
                        value={caseForm.excelStatus}
                        multiline
                        minRows={2}
                        onChange={(event) =>
                          setCaseForm((current) => ({
                            ...current,
                            excelStatus: event.target.value,
                          }))
                        }
                      />
                    </>
                  ) : null}
                  {caseForm.caseId ? (
                    <Box>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Progress</Typography>
                        <Typography variant="body2">
                          {caseForm.progress}%
                        </Typography>
                      </Stack>
                      <Slider
                        min={0}
                        max={100}
                        value={caseForm.progress}
                        onChange={(_event, value) =>
                          setCaseForm((current) => ({
                            ...current,
                            progress: Array.isArray(value) ? value[0] : value,
                          }))
                        }
                      />
                      <Typography variant="caption" color="text.secondary">
                        {[
                          activeCase?.status_text,
                          recordDate(activeCase?.end_date)
                            ? `End date ${recordDate(activeCase?.end_date)}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") ||
                          "Status and end date update from this progress."}
                      </Typography>
                    </Box>
                  ) : null}
                  {caseForm.caseId ? (
                    <Typography variant="caption" color="text.secondary">
                      Case ID {caseForm.caseId}
                    </Typography>
                  ) : null}
                  <Typography variant="caption" color="text.secondary">
                    The same address can have another case for a different
                    project, date or scope.
                  </Typography>
                </>
              )}
            </Stack>
            <Divider />
            <Stack
              direction="row"
              justifyContent="flex-end"
              spacing={1}
              sx={{ p: 2, flexShrink: 0, borderTop: 0 }}
            >
              <Button color="inherit" onClick={() => setPanel(null)}>
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={<IconCheck size={16} />}
                disabled={saving}
                onClick={panel.mode === "address" ? saveAddress : saveCase}
              >
                {panel.mode === "address"
                  ? "Save address"
                  : panel.caseId
                    ? "Save case"
                    : "Create case"}
              </Button>
            </Stack>
          </Box>
        ) : null}
      </Box>

      <AddAddressDialog
        open={addOpen}
        initialMode={addMode}
        mapsReady={isLoaded}
        projects={projects}
        companyId={Number(companyId)}
        onClose={() => setAddOpen(false)}
        onSaved={async () => {
          setAddOpen(false);
          await fetchAddresses();
        }}
      />
      <ExcelImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        importUrl="address/import"
        sampleHref="/files/address_import.xlsx"
        saveLabel="Save"
        savingLabel="Saving"
        onSuccess={fetchAddresses}
      />
      <ArchiveParentAddress
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onWorkUpdated={fetchAddresses}
        companyId={Number(companyId)}
      />
      <Dialog open={archiveConfirm} onClose={() => setArchiveConfirm(false)}>
        <DialogTitle>Archive selected addresses?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Archived addresses leave this list. Their cases stay stored and can
            be restored from Archived addresses.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchiveConfirm(false)}>Cancel</Button>
          <Button
            color="warning"
            variant="contained"
            disabled={saving}
            onClick={archiveSelected}
          >
            Archive
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function BoundaryMap({
  isLoaded,
  lat,
  lng,
  radius,
}: {
  isLoaded: boolean;
  lat: number;
  lng: number;
  radius: number;
}) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const safeRadius = Math.max(Number(radius) || 10, 10);

  useEffect(() => {
    if (!map || typeof google === "undefined") return;
    const latOffset = safeRadius / 111320;
    const lngOffset =
      safeRadius / (111320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.2));
    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: lat + latOffset, lng: lng + lngOffset });
    bounds.extend({ lat: lat - latOffset, lng: lng - lngOffset });
    map.fitBounds(bounds);
  }, [map, lat, lng, safeRadius]);

  return (
    <Box
      sx={{
        height: 190,
        borderRadius: 1.5,
        overflow: "hidden",
        border: 1,
        borderColor: "divider",
      }}
    >
      {isLoaded ? (
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={{ lat, lng }}
          zoom={16}
          onLoad={setMap}
          options={{
            clickableIcons: false,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          }}
        >
          <Marker position={{ lat, lng }} />
          <Circle
            center={{ lat, lng }}
            radius={safeRadius}
            options={{
              fillColor: "#E85D4C",
              fillOpacity: 0.28,
              strokeColor: "#E85D4C",
              strokeWeight: 2,
              clickable: false,
            }}
          />
        </GoogleMap>
      ) : (
        <Stack alignItems="center" justifyContent="center" height="100%">
          <Typography variant="caption" color="text.secondary">
            Map is still loading.
          </Typography>
        </Stack>
      )}
    </Box>
  );
}

function AllocationMap({
  mapsReady,
  sites,
  activeKey,
  onSelect,
  onPlace,
}: {
  mapsReady: boolean;
  sites: DraftSite[];
  activeKey: string;
  onSelect: (key: string) => void;
  onPlace: (lat: number, lng: number) => void;
}) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const active = sites.find((site) => site.key === activeKey) || sites[0];
  const located = sites.filter((site) => hasPoint(site.lat, site.lng));
  const focusKey = located
    .map((site) => `${site.key}:${site.lat}:${site.lng}:${site.radius}`)
    .join("|");

  useEffect(() => {
    if (!map || typeof google === "undefined") return;
    if (!located.length) {
      map.setCenter(LONDON);
      map.setZoom(12);
      return;
    }
    if (located.length === 1) {
      const site = located[0];
      const lat = Number(site.lat);
      const lng = Number(site.lng);
      const radius = Math.max(Number(site.radius) || 10, 10);
      const latOffset = radius / 111320;
      const lngOffset =
        radius / (111320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.2));
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: lat + latOffset, lng: lng + lngOffset });
      bounds.extend({ lat: lat - latOffset, lng: lng - lngOffset });
      map.fitBounds(bounds);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    located.forEach((site) =>
      bounds.extend({ lat: Number(site.lat), lng: Number(site.lng) }),
    );
    map.fitBounds(bounds, 48);
  }, [map, focusKey]);

  return mapsReady ? (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "100%" }}
      center={LONDON}
      zoom={12}
      onLoad={setMap}
      options={{
        clickableIcons: false,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      }}
      onClick={(event) => {
        const lat = event.latLng?.lat();
        const lng = event.latLng?.lng();
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        onPlace(lat!, lng!);
      }}
    >
      {located.map((site) => {
        const selected = site.key === active?.key;
        const position = { lat: Number(site.lat), lng: Number(site.lng) };
        return (
          <React.Fragment key={site.key}>
            <Marker position={position} onClick={() => onSelect(site.key)} />
            {selected ? (
              <Circle
                center={position}
                radius={Math.max(Number(site.radius) || 10, 10)}
                options={{
                  fillColor: "#E85D4C",
                  fillOpacity: 0.28,
                  strokeColor: "#E85D4C",
                  strokeWeight: 2,
                  clickable: false,
                }}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </GoogleMap>
  ) : (
    <Stack alignItems="center" justifyContent="center" height="100%">
      <Typography color="text.secondary">Map is still loading.</Typography>
    </Stack>
  );
}

function PlaceSearch({
  mapsReady,
  onPick,
}: {
  mapsReady: boolean;
  onPick: (place: {
    street: string;
    postcode: string;
    lat: number | null;
    lng: number | null;
  }) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Prediction[]>([]);
  const [searching, setSearching] = useState(false);

  const runSearch = async () => {
    setSearching(true);
    try {
      setResults(await searchPlaces(query, mapsReady));
    } finally {
      setSearching(false);
    }
  };

  return (
    <Box sx={{ minWidth: 0, maxWidth: "100%" }}>
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <TextField
          fullWidth
          size="small"
          label="Find address"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              runSearch();
            }
          }}
        />
        <Button
          variant="contained"
          onClick={runSearch}
          disabled={searching || query.trim().length < 3}
          sx={{ minWidth: 96, height: 40 }}
          startIcon={
            searching ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <IconSearch size={16} />
            )
          }
        >
          Search
        </Button>
      </Stack>
      {results.length > 0 ? (
        <Box
          sx={{
            mt: 0.5,
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            maxHeight: 168,
            overflowX: "hidden",
            overflowY: "auto",
          }}
        >
          {results.map((item) => (
            <MenuItem
              key={item.id}
              onClick={async () => {
                const place = await resolvePrediction(item);
                onPick(place);
                setQuery("");
                setResults([]);
              }}
              sx={{
                display: "block",
                whiteSpace: "normal",
                height: "auto",
                minHeight: 0,
                py: 0.75,
                overflow: "hidden",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  whiteSpace: "normal",
                  overflowWrap: "anywhere",
                  lineHeight: 1.35,
                }}
              >
                {item.label}
              </Typography>
            </MenuItem>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

function MapWorkspace({
  isLoaded,
  addresses,
  selected,
  cases,
  casesLoading,
  onSelect,
  onEditLocation,
  onCreateCase,
  onOpenCase,
}: {
  isLoaded: boolean;
  addresses: ParentAddress[];
  selected: ParentAddress | null;
  cases: CaseRow[];
  casesLoading: boolean;
  onSelect: (address: ParentAddress | null) => void;
  onEditLocation: (address: ParentAddress) => void;
  onCreateCase: (address: ParentAddress) => void;
  onOpenCase: (address: ParentAddress, row: CaseRow) => void;
}) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const pins = addresses.filter((item) => hasPoint(item.lat, item.lng));

  useEffect(() => {
    if (!map || !pins.length || typeof google === "undefined") return;
    if (selected && hasPoint(selected.lat, selected.lng)) {
      map.panTo({ lat: Number(selected.lat), lng: Number(selected.lng) });
      map.setZoom(15);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    pins.forEach((item) =>
      bounds.extend({ lat: Number(item.lat), lng: Number(item.lng) }),
    );
    map.fitBounds(bounds);
  }, [map, selected, pins.length]);

  return (
    <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0, height: "100%" }}>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          borderRadius: 2,
          overflow: "hidden",
          border: 1,
          borderColor: "divider",
        }}
      >
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%" }}
            center={
              selected && hasPoint(selected.lat, selected.lng)
                ? { lat: Number(selected.lat), lng: Number(selected.lng) }
                : LONDON
            }
            zoom={12}
            onLoad={setMap}
            options={{ clickableIcons: false, streetViewControl: false }}
          >
            {pins.map((item) => {
              const position = { lat: Number(item.lat), lng: Number(item.lng) };
              const selectedPin = selected?.id === item.id;
              return (
                <React.Fragment key={item.id}>
                  <Circle
                    center={position}
                    radius={Number(item.radius) > 0 ? Number(item.radius) : 80}
                    onClick={() => onSelect(item)}
                    options={{
                      fillColor: selectedPin ? "#5D87FF" : "#E85D4C",
                      fillOpacity: 0.25,
                      strokeColor: selectedPin ? "#5D87FF" : "#E85D4C",
                      strokeWeight: selectedPin ? 2 : 1,
                      clickable: true,
                    }}
                  />
                  <Marker
                    position={position}
                    title={addressTitle(item)}
                    onClick={() => onSelect(item)}
                  >
                    {selectedPin ? (
                      <InfoWindow onCloseClick={() => onSelect(null)}>
                        <div style={{ maxWidth: 240, padding: "2px 2px 4px" }}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 14,
                              lineHeight: 1.3,
                              color: "#111827",
                            }}
                          >
                            {addressTitle(item)}
                          </div>
                          {addressSubtitle(item) ? (
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 12,
                                color: "#4b5563",
                              }}
                            >
                              {addressSubtitle(item)}
                            </div>
                          ) : null}
                        </div>
                      </InfoWindow>
                    ) : null}
                  </Marker>
                  <OverlayView
                    position={position}
                    mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                  >
                    <Box
                      onClick={() => onSelect(item)}
                      sx={{
                        position: "absolute",
                        transform: "translate(-50%, calc(-100% - 36px))",
                        width: "max-content",
                        maxWidth: 220,
                        px: 1,
                        py: 0.4,
                        borderRadius: 1,
                        bgcolor: "#fff",
                        border: "1px solid",
                        borderColor: selectedPin ? "#5D87FF" : "#d1d5db",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                        cursor: "pointer",
                      }}
                    >
                      <Typography
                        noWrap
                        sx={{ fontSize: 12, fontWeight: 700, color: "#111827" }}
                      >
                        {addressTitle(item)}
                      </Typography>
                    </Box>
                  </OverlayView>
                </React.Fragment>
              );
            })}
          </GoogleMap>
        ) : (
          <Stack alignItems="center" justifyContent="center" height="100%">
            <Typography color="text.secondary">
              Map is still loading.
            </Typography>
          </Stack>
        )}
      </Box>
      <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 1.5 }}>
        {selected ? (
          <Stack spacing={1}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              spacing={1}
            >
              <Box>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  flexWrap="wrap"
                  useFlexGap
                >
                  <Typography fontWeight={700}>
                    {addressTitle(selected)}
                  </Typography>
                  {selected.group_name ? (
                    <Chip
                      size="small"
                      color="primary"
                      variant="outlined"
                      label={selected.group_name}
                    />
                  ) : null}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {addressSubtitle(selected)}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onEditLocation(selected)}
                >
                  Edit location
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => onCreateCase(selected)}
                >
                  Create case
                </Button>
              </Stack>
            </Stack>
            {casesLoading && cases.length === 0 ? (
              <CircularProgress size={18} />
            ) : cases.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No cases at this address yet.
              </Typography>
            ) : (
              <>
                {cases.map((row) => (
                  <Box
                    key={row.id}
                    onClick={() => onOpenCase(selected, row)}
                    sx={{
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      cursor: "pointer",
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {row.case_id ? (
                        <Typography
                          component="span"
                          sx={{
                            px: 0.625,
                            borderRadius: 0.75,
                            bgcolor: "action.hover",
                            color: "text.secondary",
                            fontFamily: "monospace",
                            fontSize: 11,
                            fontWeight: 700,
                            lineHeight: "18px",
                            flexShrink: 0,
                          }}
                        >
                          {row.case_id}
                        </Typography>
                      ) : null}
                      <Box minWidth={0} flex={1}>
                        <Typography fontSize={13} fontWeight={600} noWrap>
                          {caseTitle(row)}
                        </Typography>
                        {row.project_name ? (
                          <Typography
                            fontSize={11}
                            color="text.secondary"
                            noWrap
                          >
                            {row.project_name}
                          </Typography>
                        ) : null}
                      </Box>
                      <Box sx={{ flexShrink: 0 }}>
                        <StatusChip label={row.status_text} />
                      </Box>
                    </Stack>
                  </Box>
                ))}
              </>
            )}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Select a pin to see the address and its cases.
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

function AddAddressDialog({
  open,
  initialMode,
  mapsReady,
  projects,
  companyId,
  onClose,
  onSaved,
}: {
  open: boolean;
  initialMode: "single" | "group";
  mapsReady: boolean;
  projects: ProjectOption[];
  companyId?: number;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [mode, setMode] = useState<"single" | "group">("single");
  const [groupName, setGroupName] = useState("");
  const [sites, setSites] = useState<DraftSite[]>([emptySite()]);
  const [activeKey, setActiveKey] = useState(sites[0].key);
  const [projectId, setProjectId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const first = emptySite();
    setMode(initialMode);
    setGroupName("");
    setSites([first]);
    setActiveKey(first.key);
    setProjectId("");
  }, [open, initialMode]);

  const active = sites.find((site) => site.key === activeKey) || sites[0];
  const visibleSites = draftsToShow(mode, sites);
  const allocationLabel =
    mode === "group" ? "Allocate group to project" : "Allocate to project";
  const selectedProject =
    projects.find((project) => String(project.id) === projectId) || null;

  const patchSite = (key: string, patch: Partial<DraftSite>) => {
    setSites((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  };

  const placeOnMap = (lat: number, lng: number) => {
    const key = active?.key;
    if (!key) return;
    patchSite(key, { lat, lng });
    if (typeof google === "undefined") return;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status !== "OK" || !results?.[0]) return;
      const postcode =
        results[0].address_components?.find((part) =>
          part.types.includes("postal_code"),
        )?.long_name || "";
      patchSite(key, {
        lat,
        lng,
        street: results[0].formatted_address || "",
        postcode,
      });
    });
  };

  const save = async () => {
    const drafts = (mode === "single" ? sites.slice(0, 1) : sites).filter(
      (site) =>
        mode === "single" ||
        site.siteName.trim() ||
        site.street.trim() ||
        site.postcode.trim() ||
        hasPoint(site.lat, site.lng),
    );
    if (!drafts.length) {
      toast.error("Add at least one address.");
      return;
    }
    for (const site of drafts) {
      if (
        !site.siteName.trim() ||
        !site.street.trim() ||
        !site.postcode.trim()
      ) {
        toast.error("Each address needs a name, street and postcode.");
        return;
      }
      if (projectId && !hasPoint(site.lat, site.lng)) {
        toast.error(
          "Pick a map location before allocating an address to a project.",
        );
        return;
      }
    }
    if (mode === "group" && !groupName.trim()) {
      toast.error("Enter a group name.");
      return;
    }

    setSaving(true);
    try {
      const res = await api.post("address/parent-create", {
        company_id: companyId,
        ...(projectId ? { project_id: Number(projectId) } : {}),
        ...(mode === "group" ? { group_name: groupName.trim() } : {}),
        addresses: drafts.map((site) => ({
          name: site.street.trim(),
          short_name: site.siteName.trim(),
          pin_code: site.postcode.trim(),
          type: "address",
          latitude: site.lat,
          longitude: site.lng,
          boundary: hasPoint(site.lat, site.lng)
            ? JSON.stringify({
                lat: site.lat,
                lng: site.lng,
                radius: site.radius,
              })
            : null,
        })),
      });
      if (res.data?.IsSuccess === false) {
        toast.error(res.data.message || "Could not save the address.");
        return;
      }
      toast.success(res.data?.message || "Address saved.");
      await onSaved();
    } catch (error) {
      toast.error(errorMessage(error, "Could not save the address."));
    } finally {
      setSaving(false);
    }
  };

  const renderSiteFields = (site: DraftSite) => (
    <Stack spacing={1.25}>
      <TextField
        size="small"
        label="Address name"
        placeholder="For example, Main site"
        value={site.siteName}
        onChange={(event) =>
          patchSite(site.key, { siteName: event.target.value })
        }
      />
      <PlaceSearch
        mapsReady={mapsReady}
        onPick={(place) => {
          setActiveKey(site.key);
          patchSite(site.key, {
            street: place.street,
            postcode: place.postcode || site.postcode,
            lat: place.lat,
            lng: place.lng,
            siteName: site.siteName || place.street,
          });
        }}
      />
      <Box>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2">Location radius</Typography>
          <Typography variant="body2">{site.radius} m</Typography>
        </Stack>
        <Slider
          min={10}
          max={200}
          value={Math.min(200, Math.max(10, site.radius))}
          onChange={(_event, value) => {
            const radius = Array.isArray(value) ? value[0] : value;
            patchSite(site.key, { radius });
          }}
        />
      </Box>
    </Stack>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ px: 2.5, pt: 2, pb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <IconButton aria-label="Close" onClick={onClose} sx={{ mt: 0.25 }}>
            <IconArrowLeft size={18} />
          </IconButton>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              {mode === "group" ? "Add address group" : "Add address"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {mode === "group"
                ? "Keep related addresses together and allocate them to a project."
                : "Add a location and allocate it to a project."}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ px: 2.5, pt: 1 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems="stretch"
        >
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              p: 2,
            }}
          >
            <ToggleButtonGroup
              exclusive
              fullWidth
              size="small"
              value={mode}
              onChange={(_event, next) => {
                if (!next) return;
                setMode(next);
                if (next === "single") setActiveKey(sites[0]?.key || "");
              }}
            >
              <ToggleButton value="single">Single address</ToggleButton>
              <ToggleButton value="group">Address group</ToggleButton>
            </ToggleButtonGroup>
            {mode === "group" ? (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" fontWeight={700} mb={1}>
                  Group details
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  label="Group name"
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  helperText="Saved with these addresses so you can find the group later."
                />
              </Box>
            ) : null}
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mt: 2, mb: 1 }}
            >
              <Typography fontWeight={700}>
                {mode === "group"
                  ? "Addresses in this group"
                  : "Address details"}
              </Typography>
              {mode === "group" ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${visibleSites.length} ${
                    visibleSites.length === 1 ? "address" : "addresses"
                  }`}
                />
              ) : null}
            </Stack>
            {mode === "single" && visibleSites[0]
              ? renderSiteFields(visibleSites[0])
              : null}
            {mode === "group"
              ? visibleSites.map((site) => {
                  const selected = site.key === active?.key;
                  const summary = [site.street, site.postcode]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <Box
                      key={site.key}
                      onClick={() => setActiveKey(site.key)}
                      sx={{
                        mb: 1,
                        p: 1.25,
                        borderRadius: 2,
                        border: 1,
                        cursor: "pointer",
                        borderColor: selected ? "primary.main" : "divider",
                        bgcolor: selected ? "action.hover" : "transparent",
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="flex-start"
                      >
                        <IconMapPin size={16} style={{ marginTop: 2 }} />
                        <Box flex={1} minWidth={0}>
                          <Typography fontWeight={700} noWrap>
                            {site.siteName.trim() || "New address"}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            noWrap
                          >
                            {summary || "Search to set this location"}
                          </Typography>
                        </Box>
                        {visibleSites.length > 1 ? (
                          <IconButton
                            size="small"
                            aria-label="Remove address"
                            onClick={(event) => {
                              event.stopPropagation();
                              const remaining = sites.filter(
                                (item) => item.key !== site.key,
                              );
                              setSites(remaining);
                              if (active?.key === site.key) {
                                setActiveKey(remaining[0]?.key || "");
                              }
                            }}
                          >
                            <IconX size={16} />
                          </IconButton>
                        ) : null}
                      </Stack>
                      {selected ? (
                        <Box
                          sx={{ mt: 1.5 }}
                          onClick={(event) => event.stopPropagation()}
                        >
                          {renderSiteFields(site)}
                        </Box>
                      ) : null}
                    </Box>
                  );
                })
              : null}
            {mode === "group" ? (
              <>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<IconPlus size={16} />}
                  sx={{ mt: 0.5, borderStyle: "dashed" }}
                  onClick={() => {
                    const next = emptySite();
                    setSites((current) => [...current, next]);
                    setActiveKey(next.key);
                  }}
                >
                  Add address
                </Button>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  mt={1}
                >
                  Each address keeps its own location and radius.
                </Typography>
              </>
            ) : (
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                mt={1.5}
              >
                Set the location, then choose a project under the map.
              </Typography>
            )}
          </Box>
          <Stack flex={1.15} minWidth={0} spacing={1.5}>
            <Box
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
                p: 1.5,
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                mb={1}
              >
                <Typography fontWeight={700}>
                  {mode === "group"
                    ? "Group location preview"
                    : "Location preview"}
                </Typography>
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${visibleSites.length} ${
                    visibleSites.length === 1 ? "address" : "addresses"
                  }`}
                />
              </Stack>
              <Box
                sx={{
                  height: 340,
                  borderRadius: 2,
                  overflow: "hidden",
                  border: 1,
                  borderColor: "divider",
                }}
              >
                <AllocationMap
                  mapsReady={mapsReady}
                  sites={visibleSites}
                  activeKey={active?.key || ""}
                  onSelect={setActiveKey}
                  onPlace={placeOnMap}
                />
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                mt={1}
              >
                {hasPoint(active?.lat, active?.lng)
                  ? `${active?.siteName.trim() || "Selected address"} · radius ${active?.radius ?? 100} m`
                  : "Search for an address, or click the map to place it."}
              </Typography>
            </Box>
            <Box
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
                p: 1.5,
              }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                alignItems={{ sm: "center" }}
                justifyContent="space-between"
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1.5,
                      bgcolor: "action.hover",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <IconMapPin size={18} />
                  </Box>
                  <Box>
                    <Typography fontWeight={700}>{allocationLabel}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedProject
                        ? selectedProject.name
                        : "No project selected"}
                    </Typography>
                  </Box>
                </Stack>
                <TextField
                  select
                  size="small"
                  value={projectId}
                  onChange={(event) => setProjectId(event.target.value)}
                  sx={{
                    minWidth: { sm: 240 },
                    width: { xs: "100%", sm: "auto" },
                  }}
                  SelectProps={{
                    displayEmpty: true,
                    MenuProps: { sx: { zIndex: 1600 } },
                    inputProps: { "aria-label": allocationLabel },
                  }}
                >
                  <MenuItem value="">No project selected</MenuItem>
                  {projects.map((project) => (
                    <MenuItem key={project.id} value={String(project.id)}>
                      {project.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </Box>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2 }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mr: "auto", pl: 1 }}
        >
          {mode === "group"
            ? selectedProject
              ? "All addresses will be allocated together."
              : "You can allocate this group later."
            : selectedProject
              ? "This address will be allocated to the selected project."
              : "You can allocate this address later."}
        </Typography>
        <Button color="inherit" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" disabled={saving} onClick={save}>
          {saving
            ? "Saving..."
            : mode === "group"
              ? "Save group"
              : "Save address"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function draftsToShow(mode: "single" | "group", sites: DraftSite[]) {
  return mode === "single" ? sites.slice(0, 1) : sites;
}

export default AddressWorkspace;
