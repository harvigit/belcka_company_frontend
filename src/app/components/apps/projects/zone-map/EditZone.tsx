"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import {
  Box,
  Button,
  Card,
  Checkbox,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  MenuItem,
  Select,
  Slider,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Grid } from "@mui/system";
import {
  Circle as GCircle,
  GoogleMap,
  Marker,
  Polygon,
  Polyline,
} from "@react-google-maps/api";
import { IconArrowLeft } from "@tabler/icons-react";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";

interface EditZoneProps {
  zone: any;
  onSaved: () => void;
  onCancel: () => void;
  projectId: number | null;
  companyId: number | null;
  addresses: any[];
  activeTab: number;
  projects?: any[];
}

type ZoneType = "circle" | "polygon";
type DrawMode = "pan" | "circle" | "polygon";

const CLOSE_THRESHOLD_PX = 20;

const HandSvg = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
    <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
    <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
    <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
  </svg>
);

const PolygonSvg = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="12 3 21 9 18 20 6 20 3 9" />
  </svg>
);

const CircleSvg = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="9" />
  </svg>
);

interface ToolbarProps {
  drawMode: DrawMode;
  onMode: (m: DrawMode) => void;
  pointCount: number;
  isActive: boolean;
  activeTab?: number;
}

const MapToolbar = ({
  drawMode,
  onMode,
  pointCount,
  isActive,
  activeTab,
}: ToolbarProps) => {
  const tools: { mode: DrawMode; icon: React.ReactNode; tip: string }[] = [
    { mode: "pan", icon: <HandSvg />, tip: "Pan / Move map" },
    { mode: "polygon", icon: <PolygonSvg />, tip: "Draw polygon" },
    { mode: "circle", icon: <CircleSvg />, tip: "Circle zone" },
  ];

  const visibleTools =
    activeTab === 1 ? tools.filter((t) => t.mode !== "polygon") : tools;

  const btn = {
    width: 30,
    height: 30,
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.13s",
    userSelect: "none" as const,
  };

  return (
    <Box
      sx={{
        position: "absolute",
        top: 10,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        gap: "3px",
        background: "rgba(255,255,255,0.98)",
        border: "1px solid #d0d0d0",
        borderRadius: "8px",
        px: "6px",
        py: "5px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
        pointerEvents: "all",
      }}
    >
      {visibleTools.map(({ mode, icon, tip }) => {
        const active = drawMode === mode;
        return (
          <Tooltip key={mode} title={tip} placement="bottom" arrow>
            <Box
              onClick={() => onMode(mode)}
              sx={{
                ...btn,
                color: active ? "#1565c0" : "#555",
                backgroundColor: active ? "#dbeafe" : "transparent",
                border: active
                  ? "1.5px solid #1976d2"
                  : "1.5px solid transparent",
                "&:hover": {
                  backgroundColor: active ? "#dbeafe" : "#f0f4ff",
                  color: "#1976d2",
                },
              }}
            >
              {icon}
            </Box>
          </Tooltip>
        );
      })}

      {isActive && pointCount > 0 && (
        <Box
          sx={{
            ml: "3px",
            px: "8px",
            py: "2px",
            borderRadius: "10px",
            backgroundColor: "#1976d2",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            lineHeight: 1.6,
            whiteSpace: "nowrap",
          }}
        >
          {pointCount} pts
        </Box>
      )}
    </Box>
  );
};

function latLngToPixel(
  map: google.maps.Map,
  latLng: { lat: number; lng: number },
) {
  const proj = map.getProjection();
  const bounds = map.getBounds();
  if (!proj || !bounds) return null;
  const ne = proj.fromLatLngToPoint(bounds.getNorthEast());
  const sw = proj.fromLatLngToPoint(bounds.getSouthWest());
  if (!ne || !sw) return null;
  const scale = Math.pow(2, map.getZoom() ?? 10);
  const pt = proj.fromLatLngToPoint(
    new google.maps.LatLng(latLng.lat, latLng.lng),
  );
  if (!pt) return null;
  return { x: (pt.x - sw.x) * scale, y: (pt.y - ne.y) * scale };
}

function pixelDistance(
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function initialProjectIds(zone: any, projectId: number | null): number[] {
  const ids: number[] = Array.isArray(zone?.project_ids)
    ? zone.project_ids.map((id: unknown) => Number(id))
    : zone?.project_id != null
      ? [Number(zone.project_id)]
      : [];

  if (projectId != null && Number(projectId) > 0) {
    ids.push(Number(projectId));
  }

  return [...new Set(ids.filter((id) => Number.isFinite(id) && id > 0))];
}

function viewportToPolygonPath(
  viewport: google.maps.LatLngBounds,
): { lat: number; lng: number }[] {
  const ne = viewport.getNorthEast();
  const sw = viewport.getSouthWest();
  return [
    { lat: ne.lat(), lng: sw.lng() },
    { lat: ne.lat(), lng: ne.lng() },
    { lat: sw.lat(), lng: ne.lng() },
    { lat: sw.lat(), lng: sw.lng() },
  ];
}

function geoJsonToLatLngPath(geometry: any): { lat: number; lng: number }[] {
  if (!geometry) return [];

  let ring: number[][] | null = null;
  if (geometry.type === "Polygon") {
    ring = geometry.coordinates?.[0] ?? null;
  } else if (geometry.type === "MultiPolygon") {
    ring = (geometry.coordinates ?? []).reduce(
      (best: number[][] | null, polygon: number[][][]) => {
        const outer = polygon?.[0];
        if (!outer) return best;
        if (!best || outer.length > best.length) return outer;
        return best;
      },
      null,
    );
  }

  if (!ring?.length) return [];

  const path = ring
    .map(([lng, lat]) => ({ lat: Number(lat), lng: Number(lng) }))
    .filter(
      (point) => Number.isFinite(point.lat) && Number.isFinite(point.lng),
    );

  if (path.length > 1) {
    const first = path[0];
    const last = path[path.length - 1];
    if (first.lat === last.lat && first.lng === last.lng) path.pop();
  }

  return path;
}

async function fetchOsmBoundaryPath(
  query: string,
): Promise<{ lat: number; lng: number }[]> {
  if (!query.trim()) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&polygon_geojson=1&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const first = Array.isArray(data) ? data[0] : null;
  return geoJsonToLatLngPath(first?.geojson);
}

function boundsFromPath(
  path: { lat: number; lng: number }[],
): google.maps.LatLngBounds | null {
  if (!path.length || typeof google === "undefined") return null;
  const bounds = new google.maps.LatLngBounds();
  path.forEach((point) => bounds.extend(point));
  return bounds;
}

function boundsFromCircle(
  center: { lat: number; lng: number },
  radiusMeters: number,
): google.maps.LatLngBounds | null {
  if (
    typeof google === "undefined" ||
    !Number.isFinite(center.lat) ||
    !Number.isFinite(center.lng)
  ) {
    return null;
  }

  const radius = Math.max(Number(radiusMeters) || 0, 1);
  const latDelta = radius / 111320;
  const lngScale = Math.cos((center.lat * Math.PI) / 180);
  const lngDelta = radius / (111320 * (Math.abs(lngScale) < 0.01 ? 0.01 : lngScale));
  const bounds = new google.maps.LatLngBounds();
  bounds.extend({ lat: center.lat + latDelta, lng: center.lng + lngDelta });
  bounds.extend({ lat: center.lat - latDelta, lng: center.lng - lngDelta });
  return bounds;
}

const EditZone = ({
  zone,
  onSaved,
  onCancel,
  projectId,
  companyId,
  addresses,
  activeTab,
  projects = [],
}: EditZoneProps) => {
  const [name, setName] = useState(zone.name);
  const [color, setColor] = useState(zone.color || "#1976d2");
  const [address, setAddress] = useState(zone.address);
  const [radius, setRadius] = useState(Number(zone.radius || 10000));
  const [isSaving, setIsSaving] = useState(false);
  const [addressId, setAddressId] = useState<number | null>(
    zone.address_id || null,
  );
  const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>(() =>
    initialProjectIds(zone, projectId),
  );
  const [projectSearch, setProjectSearch] = useState("");
  const initType: ZoneType =
    activeTab === 1
      ? "circle"
      : zone.type === "polyline"
        ? "polygon"
        : zone.type || "circle";
  const [zoneType, setZoneType] = useState<ZoneType>(initType);
  const [drawMode, setDrawMode] = useState<DrawMode>(
    initType === "circle" ? "circle" : "pan",
  );
  const [location, setLocation] = useState({
    lat: Number(zone.latitude),
    lng: Number(zone.longitude),
  });
  const [drawPath, setDrawPath] = useState<{ lat: number; lng: number }[]>(
    zone.coordinates || [],
  );
  const [isClosed, setIsClosed] = useState(
    initType === "polygon" && (zone.coordinates?.length ?? 0) >= 3,
  );
  const [cursorLatLng, setCursorLatLng] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [nearStart, setNearStart] = useState(false);
  const [typedAddress, setTypedAddress] = useState(false);
  const [boundaryFromSearch, setBoundaryFromSearch] = useState(false);
  const [predictions, setPredictions] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);

  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const pendingFitBoundsRef = useRef<google.maps.LatLngBounds | null>(null);

  const stateRef = useRef({
    drawMode: (initType === "circle" ? "circle" : "pan") as DrawMode,
    drawPath: (zone.coordinates || []) as { lat: number; lng: number }[],
    isClosed: initType === "polygon" && (zone.coordinates?.length ?? 0) >= 3,
  });

  stateRef.current.drawMode = drawMode;
  stateRef.current.drawPath = drawPath;
  stateRef.current.isClosed = isClosed;

  const isDrawingActive = drawMode === "polygon";

  useEffect(() => {
    if (!pendingFitBoundsRef.current || !mapRef.current) return;
    const bounds = pendingFitBoundsRef.current;
    pendingFitBoundsRef.current = null;
    mapRef.current.fitBounds(bounds);
  }, [drawPath, location]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const showingCircle =
      drawMode === "circle" || (drawMode === "pan" && zoneType === "circle");
    if (!showingCircle) return;

    const bounds = boundsFromCircle(location, radius);
    if (!bounds) return;
    mapRef.current.fitBounds(bounds, 48);
  }, [mapReady, radius, location.lat, location.lng, drawMode, zoneType]);

  const getCenter = (pts: { lat: number; lng: number }[]) =>
    pts.length
      ? {
          lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length,
          lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length,
        }
      : location;

  // ── Circle handlers ──────────────────────────────────────────────────────
  const onMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const nl = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setLocation(nl);
    circleRef.current?.setCenter(nl);
  };

  const onRadiusChanged = () => {
    if (!circleRef.current) return;
    const r = circleRef.current.getRadius();
    if (r > 10000) {
      circleRef.current.setRadius(10000);
      setRadius(10000);
    } else setRadius(Math.round(r));
  };

  const syncFromPolygon = () => {
    if (!polygonRef.current) return;
    setDrawPath(
      polygonRef.current
        .getPath()
        .getArray()
        .map((p) => ({ lat: p.lat(), lng: p.lng() })),
    );
  };

  // ── Search helpers ───────────────────────────────────────────────────────
  const fetchPredictions = (input: string) => {
    if (!input) return setPredictions([]);
    new google.maps.places.AutocompleteService().getPlacePredictions(
      { input },
      (p) => setPredictions(p || []),
    );
  };

  const resetMapFromClearedSearch = () => {
    pendingFitBoundsRef.current = null;
    setPredictions([]);
    setTypedAddress(false);
    setDrawPath(zone.coordinates || []);
    const originalClosed =
      initType === "polygon" && (zone.coordinates?.length ?? 0) >= 3;
    setIsClosed(originalClosed);
    setCursorLatLng(null);
    setNearStart(false);
    setBoundaryFromSearch(false);
    stateRef.current.drawPath = zone.coordinates || [];
    stateRef.current.isClosed = originalClosed;
    if (stateRef.current.drawMode !== "polygon") {
      setZoneType(initType);
    }
    const loc = { lat: Number(zone.latitude), lng: Number(zone.longitude) };
    setLocation(loc);
    mapRef.current?.panTo(loc);
    mapRef.current?.setZoom(17);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddress(value);
    if (!value.trim()) {
      resetMapFromClearedSearch();
      return;
    }
    setTypedAddress(true);
    fetchPredictions(value);
  };

  const selectPrediction = (placeId: string) => {
    new google.maps.places.PlacesService(
      document.createElement("div"),
    ).getDetails(
      { placeId, fields: ["formatted_address", "name", "geometry"] },
      (place, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
          setTypedAddress(false);
          setPredictions([]);
          return;
        }

        void (async () => {
          const label = place.formatted_address || place.name || "";
          setAddress(label);
          const loc = place.geometry?.location
            ? {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
              }
            : null;
          if (loc) setLocation(loc);

          const viewport = place.geometry?.viewport;
          const keepCircleTool = stateRef.current.drawMode === "circle";

          if (!keepCircleTool) {
            let path: { lat: number; lng: number }[] = [];
            try {
              path = await fetchOsmBoundaryPath(place.name || label);
            } catch (error) {
              console.error("OSM boundary lookup failed", error);
            }
            if (path.length < 3 && viewport) {
              path = viewportToPolygonPath(viewport);
            }

            if (path.length >= 3) {
              const bounds = boundsFromPath(path) ?? viewport ?? null;
              setZoneType("polygon");
              setDrawPath(path);
              setIsClosed(true);
              setCursorLatLng(null);
              setNearStart(false);
              setBoundaryFromSearch(true);
              stateRef.current.drawPath = path;
              stateRef.current.isClosed = true;
              pendingFitBoundsRef.current = bounds;
              if (bounds) mapRef.current?.fitBounds(bounds);
            } else if (loc) {
              mapRef.current?.panTo(loc);
              mapRef.current?.setZoom(15);
            }
          } else if (loc) {
            mapRef.current?.panTo(loc);
            mapRef.current?.setZoom(15);
          }

          setTypedAddress(false);
          setPredictions([]);
        })();
      },
    );
  };

  // ── Mode switch ──────────────────────────────────────────────────────────
  const handleModeChange = (mode: DrawMode) => {
    const hasSearchPolygon =
      boundaryFromSearch &&
      zoneType === "polygon" &&
      isClosed &&
      drawPath.length >= 3;

    if (hasSearchPolygon && (mode === "polygon" || mode === "pan")) {
      setDrawMode(mode);
      setZoneType("polygon");
      setCursorLatLng(null);
      setNearStart(false);
      stateRef.current.drawMode = mode;
      stateRef.current.isClosed = true;
      stateRef.current.drawPath = drawPath;
      mapRef.current?.setOptions({
        draggableCursor: mode === "polygon" ? "crosshair" : "",
      });
      return;
    }

    setDrawMode(mode);
    setCursorLatLng(null);
    setNearStart(false);
    setIsClosed(false);
    setBoundaryFromSearch(false);
    stateRef.current.drawMode = mode;
    stateRef.current.isClosed = false;
    stateRef.current.drawPath = [];
    mapRef.current?.setOptions({
      draggableCursor: mode === "polygon" ? "crosshair" : "",
    });
    if (mode === "circle") {
      setZoneType("circle");
      setDrawPath([]);
    }
    if (mode === "polygon") {
      setZoneType("polygon");
      setDrawPath([]);
    }
  };

  // ── Mouse move ───────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: google.maps.MapMouseEvent) => {
    if (stateRef.current.drawMode !== "polygon" || stateRef.current.isClosed)
      return;
    if (!e.latLng) return;
    const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setCursorLatLng(pos);
    if (stateRef.current.drawPath.length >= 3 && mapRef.current) {
      const sp = latLngToPixel(mapRef.current, stateRef.current.drawPath[0]);
      const cp = latLngToPixel(mapRef.current, pos);
      if (sp && cp) setNearStart(pixelDistance(sp, cp) < CLOSE_THRESHOLD_PX);
    } else {
      setNearStart(false);
    }
  }, []);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (stateRef.current.drawMode !== "polygon") return;
    if (stateRef.current.isClosed) return;
    if (!e.latLng) return;
    if ((e as any).placeId) {
      e.stop?.();
      return;
    }

    const pt = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    const currentPath = stateRef.current.drawPath;

    if (currentPath.length >= 3 && mapRef.current) {
      const sp = latLngToPixel(mapRef.current, currentPath[0]);
      const cp = latLngToPixel(mapRef.current, pt);
      if (sp && cp && pixelDistance(sp, cp) < CLOSE_THRESHOLD_PX) {
        setIsClosed(true);
        stateRef.current.isClosed = true;
        setNearStart(false);
        setCursorLatLng(null);
        setZoneType("polygon");
        return;
      }
    }

    const newPath = [...currentPath, pt];
    stateRef.current.drawPath = newPath;
    setDrawPath(newPath);
  }, []);

  const previewPath =
    !isClosed && cursorLatLng && drawPath.length > 0
      ? [...drawPath, cursorLatLng]
      : drawPath;

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (zoneType === "polygon" && drawPath.length < 3) {
      toast.error("Please draw at least 3 points!");
      return;
    }
    setIsSaving(true);
    try {
      let boundary: any;
      let lat = location.lat,
        lng = location.lng;
      if (zoneType === "circle") {
        boundary = { lat, lng, radius };
      } else {
        boundary = drawPath;
        const c = getCenter(drawPath);
        lat = c.lat;
        lng = c.lng;
      }
      let res;
      if (activeTab === 0) {
        if (selectedProjectIds.length === 0) {
          toast.error("Please select at least one project!");
          setIsSaving(false);
          return;
        }
        res = await api.put("work-zone/update", {
          id: zone.id,
          company_id: companyId,
          project_ids: selectedProjectIds,
          name,
          address,
          address_id: zone.address_id || null,
          lat,
          lng,
          type: zoneType,
          boundary: JSON.stringify(boundary),
          color,
        });
      } else {
        res = await api.put("address/parent-update", {
          id: zone.id,
          company_id: companyId,
          name: zone.address_name || zone.name,
          short_name: zone.short_name,
          pin_code: zone.address || address,
          type: "location",
          latitude: lat,
          longitude: lng,
          boundary: JSON.stringify(boundary),
        });
      }
      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        onSaved();
        onCancel();
      }
    } catch (err) {
      console.error(err);
    }
    setIsSaving(false);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#f5f5f5",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          px: 3,
          py: 2,
          bgcolor: "white",
          borderBottom: "1px solid #e0e0e0",
        }}
      >
        <IconButton onClick={onCancel}>
          <IconArrowLeft />
        </IconButton>
        <Typography variant="h6" fontWeight={600}>
          Edit Zone
        </Typography>
      </Box>

      <Box sx={{ p: { xs: 1.5, sm: 3 }, flex: 1, overflowY: "auto" }}>
        <Grid container spacing={3} sx={{ height: "100%" }}>
          {activeTab == 0 && (
            <Grid size={{ xs: 12, md: 4 }}>
              <Card
                sx={{
                  p: 0,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 400,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                }}
              >
                <Tabs
                  value={0}
                  sx={{ borderBottom: 1, borderColor: "divider" }}
                >
                  <Tab label="PROJECTS" sx={{ fontWeight: 600 }} />
                </Tabs>

                <Box sx={{ p: 2, pb: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 1,
                        backgroundColor: "#f9f9f9",
                      },
                      "& input": { textAlign: "start" },
                    }}
                  />
                </Box>
                <List sx={{ flex: 1, overflowY: "auto", p: 0 }}>
                  {projects
                    .filter((p) =>
                      String(p.name || "")
                        .toLowerCase()
                        .includes(projectSearch.toLowerCase()),
                    )
                    .map((p: any) => {
                      const checked = selectedProjectIds.includes(p.id);
                      return (
                        <ListItem key={p.id} disablePadding divider>
                          <ListItemButton
                            onClick={() => {
                              if (activeTab === 0) {
                                if (checked) {
                                  setSelectedProjectIds(
                                    selectedProjectIds.filter(
                                      (id) => id !== p.id,
                                    ),
                                  );
                                } else {
                                  setSelectedProjectIds([
                                    ...selectedProjectIds,
                                    p.id,
                                  ]);
                                }
                              } else {
                                setSelectedProjectIds([p.id]);
                              }
                            }}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              py: 1,
                            }}
                          >
                            <Checkbox
                              checked={checked}
                              size="small"
                              disableRipple
                              sx={{
                                p: 0.5,
                                mr: 1,
                                "&.Mui-checked": { color: "primary.main" },
                              }}
                            />
                            <Typography
                              sx={{ flex: 1, fontWeight: 500, fontSize: 14 }}
                            >
                              {p.name}
                            </Typography>
                            <Box
                              component="span"
                              sx={{ color: "text.secondary", display: "flex" }}
                            >
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                              </svg>
                            </Box>
                          </ListItemButton>
                        </ListItem>
                      );
                    })}
                </List>
              </Card>
            </Grid>
          )}
          <Grid size={{ xs:12, md:activeTab == 1 ? 12 : 8 }}>
            <Card
              sx={{
                p: { xs: 1.5, sm: 2.5 },
                mb: 3,
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  mb: 2,
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  textAlign: "start",
                }}
              >
                <Box sx={{ flex: 1, minWidth: 200, textAlign: "start" }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600, mb: 0.5, display: "block" }}
                  >
                    zone name
                  </Typography>
                  <CustomTextField
                    fullWidth
                    size="small"
                    value={activeTab === 0 ? name : address}
                    onChange={(e: any) =>
                      activeTab === 0
                        ? setName(e.target.value)
                        : setAddress(e.target.value)
                    }
                    sx={{
                      "& .MuiOutlinedInput-root": { borderRadius: 1 },
                      "& input": { textAlign: "center" },
                    }}
                  />
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSave}
                  disabled={isSaving}
                  sx={{
                    mt: 2.5,
                    px: 4,
                    borderRadius: 1.5,
                    fontWeight: 600,
                    textTransform: "none",
                  }}
                >
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </Box>

              <Box sx={{ position: "relative", mb: 2 }}>
                {activeTab === 1 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 600, mb: 0.5, display: "block" }}
                    >
                      select address
                    </Typography>
                    <Select
                      fullWidth
                      size="small"
                      value={zone.id || ""}
                      displayEmpty
                      disabled
                    >
                      <MenuItem value={zone.id}>{zone.name}</MenuItem>
                    </Select>
                  </Box>
                )}

                {activeTab === 0 && (
                  <Box sx={{ position: "relative", mb: 2, textAlign: "start" }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 600, mb: 0.5, display: "block" }}
                    >
                      search location
                    </Typography>
                    <CustomTextField
                      fullWidth
                      size="small"
                      value={address}
                      onChange={handleInputChange}
                      sx={{ "& input": { textAlign: "start" } }}
                      placeholder="Search location..."
                    />
                    {typedAddress && predictions.length > 0 && (
                      <List
                        sx={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          zIndex: 9999,
                          border: "1px solid #ccc",
                          borderRadius: 1,
                          maxHeight: 200,
                          backgroundColor: "#fff",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                          overflow: "auto",
                        }}
                      >
                        {predictions.map((p) => (
                          <ListItem key={p.place_id} disablePadding>
                            <ListItemButton
                              onClick={() => selectPrediction(p.place_id)}
                            >
                              {p.description}
                            </ListItemButton>
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Box>
                )}

                {drawMode === "circle" && (
                  <>
                    <Typography
                      fontWeight={600}
                      mb={1}
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block" }}
                    >
                      Area size [{Math.round(radius)} Meter]
                    </Typography>
                    <Box
                      sx={{
                        px: 1.5,
                        boxSizing: "border-box",
                        width: "100%",
                        overflow: "hidden",
                      }}
                    >
                      <Slider
                        min={0}
                        max={10000}
                        value={radius}
                        onChange={(_, v) => setRadius(v as number)}
                        sx={{ width: "100%", display: "block" }}
                      />
                    </Box>
                  </>
                )}

                {isDrawingActive && (
                  <Box
                    sx={{
                      mb: 1.5,
                      px: 1.5,
                      py: 0.75,
                      borderRadius: 1.5,
                      backgroundColor: isClosed ? "#e8f5e9" : "#e3f2fd",
                      border: `1px solid ${isClosed ? "#a5d6a7" : "#90caf9"}`,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        flexShrink: 0,
                        backgroundColor: isClosed ? "#43a047" : "#1976d2",
                      }}
                    />
                    <Typography
                      variant="caption"
                      color={isClosed ? "success.main" : "primary"}
                      fontWeight={600}
                    >
                      {isClosed
                        ? `Zone closed · ${drawPath.length} points · ready to save ✓`
                        : `Click to add points${drawPath.length >= 3 ? " · click near start to close" : ""}${drawPath.length > 0 ? ` · ${drawPath.length} pt${drawPath.length !== 1 ? "s" : ""}` : ""}`}
                    </Typography>
                  </Box>
                )}

                <Box
                  sx={{
                    height: activeTab === 0 ? "45vh" : { xs: 320, sm: 400, md: 480 },
                    position: "relative",
                    borderRadius: 1.5,
                    overflow: "hidden",
                    backgroundColor: "#e8e8e8",
                    border: "1px solid #e0e0e0",
                  }}
                >
                  <GoogleMap
                    zoom={17}
                    center={location}
                    mapContainerStyle={{ width: "100%", height: "100%" }}
                    onMouseMove={handleMouseMove}
                    onClick={handleMapClick}
                    onLoad={(map) => {
                      mapRef.current = map;
                      setMapReady(true);
                    }}
                    options={{
                      clickableIcons: false,
                      disableDoubleClickZoom: true,
                      draggableCursor: isDrawingActive ? "crosshair" : "",
                    }}
                  >
                    {(drawMode === "circle" ||
                      (drawMode === "pan" && zoneType === "circle")) && (
                      <>
                        <Marker
                          position={location}
                          draggable
                          onDragEnd={onMarkerDragEnd}
                        />
                        <GCircle
                          center={location}
                          radius={radius}
                          options={{
                            fillColor: color + "33",
                            strokeColor: color,
                            editable: true,
                            draggable: true,
                          }}
                          onLoad={(c) => {
                            circleRef.current = c;
                          }}
                          onRadiusChanged={onRadiusChanged}
                          onDragEnd={onMarkerDragEnd}
                        />
                      </>
                    )}

                    {((drawMode === "polygon" && isClosed) ||
                      (drawMode === "pan" && zoneType === "polygon")) &&
                      drawPath.length >= 3 && (
                        <Polygon
                          paths={drawPath}
                          options={{
                            fillColor: color + "33",
                            strokeColor: color,
                            strokeWeight: 2,
                            editable:
                              !boundaryFromSearch || drawMode === "polygon",
                            draggable:
                              !boundaryFromSearch || drawMode === "polygon",
                          }}
                          onLoad={(p) => {
                            polygonRef.current = p;
                          }}
                          onMouseUp={syncFromPolygon}
                          onDragEnd={syncFromPolygon}
                        />
                      )}

                    {drawMode === "polygon" &&
                      !isClosed &&
                      previewPath.length >= 2 && (
                        <Polyline
                          path={previewPath}
                          options={{
                            strokeColor: nearStart ? "#ff5722" : color,
                            strokeWeight: 2.5,
                            strokeOpacity: 0.85,
                            clickable: false,
                            zIndex: 0,
                          }}
                        />
                      )}

                    {isDrawingActive &&
                      !(boundaryFromSearch && isClosed) &&
                      drawPath.map((pt, i) => {
                        const isFirst = i === 0;
                        const canClose =
                          isFirst && drawPath.length >= 3 && !isClosed;
                        return (
                          <Marker
                            key={`dp-${i}`}
                            position={pt}
                            clickable={canClose}
                            icon={{
                              path: google.maps.SymbolPath.CIRCLE,
                              scale: isFirst
                                ? 8
                                : i === drawPath.length - 1
                                  ? 6
                                  : 5,
                              fillColor: isFirst ? "#ff5722" : color,
                              fillOpacity: 1,
                              strokeColor: "#fff",
                              strokeWeight: 2,
                            }}
                            onClick={
                              canClose
                                ? () => {
                                    setIsClosed(true);
                                    stateRef.current.isClosed = true;
                                    setNearStart(false);
                                    setCursorLatLng(null);
                                  }
                                : undefined
                            }
                            cursor={canClose ? "pointer" : undefined}
                          />
                        );
                      })}

                    {nearStart && drawPath.length > 0 && (
                      <GCircle
                        center={drawPath[0]}
                        radius={30}
                        options={{
                          strokeColor: "#ff5722",
                          strokeWeight: 2,
                          fillColor: "#ff572233",
                          clickable: false,
                        }}
                      />
                    )}
                  </GoogleMap>

                  <MapToolbar
                    drawMode={drawMode}
                    onMode={handleModeChange}
                    pointCount={drawPath.length}
                    isActive={isDrawingActive}
                    activeTab={activeTab}
                  />
                </Box>
              </Box>
            </Card>

            {activeTab === 0 && (
              <Card sx={{ p: 2, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 600, mb: 1, display: "block" }}
                >
                  zone color
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box
                    sx={{
                      width: 80,
                      height: 32,
                      bgcolor: color,
                      borderRadius: 1,
                      border: "1px solid #ccc",
                    }}
                  />
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {[
                      "#388e3c",
                      "#d32f2f",
                      "#1976d2",
                      "#000000",
                      "#fbc02d",
                      "#29b6f6",
                      "#7b1fa2",
                      "#f57c00",
                    ].map((c) => (
                      <Box
                        key={c}
                        onClick={() => setColor(c)}
                        sx={{
                          width: 28,
                          height: 28,
                          bgcolor: c,
                          borderRadius: 0.5,
                          cursor: "pointer",
                          border:
                            color === c ? "2px solid #333" : "1px solid #eee",
                        }}
                      />
                    ))}
                  </Box>
                  <input
                    type="color"
                    value={color || "#000000"}
                    onChange={(e) => setColor(e.target.value)}
                    style={{
                      width: 0,
                      height: 0,
                      opacity: 0,
                      position: "absolute",
                    }}
                  />
                </Box>
              </Card>
            )}
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default EditZone;
