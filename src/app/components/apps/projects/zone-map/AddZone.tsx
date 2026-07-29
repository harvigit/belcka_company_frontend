"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import {
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  MenuItem,
  Select,
  Slider,
  TextField,
  Tooltip,
  Typography,
  Card,
  Checkbox,
  Tabs,
  Tab,
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

const LONDON_CENTER = { lat: 51.5074, lng: -0.1278 };
const CLOSE_THRESHOLD_PX = 20;

interface AddZoneProps {
  projectId: number | null;
  companyId: number | null;
  addresses: any[];
  projects?: any[];
  activeTab: number;
  onAdded: () => void;
  onCancel: () => void;
}

type ZoneType = "circle" | "polygon";
type DrawMode = "pan" | "circle" | "polygon";

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
}

const MapToolbar = ({
  drawMode,
  onMode,
  pointCount,
  isActive,
}: ToolbarProps) => {
  const tools: { mode: DrawMode; icon: React.ReactNode; tip: string }[] = [
    { mode: "pan", icon: <HandSvg />, tip: "Pan / Move map" },
    { mode: "polygon", icon: <PolygonSvg />, tip: "Draw polygon" },
    { mode: "circle", icon: <CircleSvg />, tip: "Circle zone" },
  ];

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
      {tools.map(({ mode, icon, tip }) => {
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

const AddZone = ({
  onAdded,
  onCancel,
  projectId,
  companyId,
  addresses,
  projects = [],
  activeTab,
}: AddZoneProps) => {
  const [addressId, setAddressId] = useState<number | null>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>(
    projectId ? [projectId] : [],
  );
  const [filteredAddresses, setFilteredAddresses] = useState<any[]>(addresses);
  const isMapPage = projectId === null;

  useEffect(() => {
    if (selectedProjectIds.length > 0) {
      api
        .get("address/get", { params: { project_id: selectedProjectIds[0] } })
        .then((res) => setFilteredAddresses(res.data.info || []))
        .catch((err) => console.error(err));
    } else {
      setFilteredAddresses(addresses);
    }
  }, [selectedProjectIds, addresses]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [color, setColor] = useState("#1976d2");
  const [radius, setRadius] = useState(100);
  const [isSaving, setIsSaving] = useState(false);
  const [location, setLocation] = useState(LONDON_CENTER);
  const [typedAddress, setTypedAddress] = useState(false);
  const [predictions, setPredictions] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);

  const [drawMode, setDrawMode] = useState<DrawMode>("pan");
  const [zoneType, setZoneType] = useState<ZoneType>("circle");
  const [drawPath, setDrawPath] = useState<{ lat: number; lng: number }[]>([]);
  const [cursorLatLng, setCursorLatLng] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [nearStart, setNearStart] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  const mapRef = useRef<google.maps.Map | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const lastCenterRef = useRef<{ lat: number; lng: number } | null>(null);

  const stateRef = useRef({
    drawMode: "pan" as DrawMode,
    drawPath: [] as { lat: number; lng: number }[],
    isClosed: false,
  });

  const isDrawingActive = drawMode === "polygon";

  stateRef.current.drawMode = drawMode;
  stateRef.current.drawPath = drawPath;
  stateRef.current.isClosed = isClosed;

  // ── Address helpers ──────────────────────────────────────────────────────
  const handleAddressChange = (id: number) => {
    setAddressId(id);
    const addr = addresses.find((a: any) => a.id === id);
    if (addr) {
      const loc = { lat: Number(addr.latitude), lng: Number(addr.longitude) };
      setLocation(loc);
      setRadius(addr.radius || 200);
      mapRef.current?.panTo(loc);
    }
  };

  const fetchPredictions = (input: string) => {
    if (!input) return setPredictions([]);
    new google.maps.places.AutocompleteService().getPlacePredictions(
      { input },
      (p) => setPredictions(p || []),
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(e.target.value);
    setTypedAddress(true);
    fetchPredictions(e.target.value);
  };

  const selectPrediction = (placeId: string) => {
    new google.maps.places.PlacesService(
      document.createElement("div"),
    ).getDetails({ placeId }, (place, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && place) {
        setAddress(place.formatted_address || place.name || "");
        if (place.geometry?.location) {
          const loc = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };
          setLocation(loc);
          mapRef.current?.panTo(loc);
          mapRef.current?.setZoom(15);
        }
      }
      setTypedAddress(false);
      setPredictions([]);
    });
  };

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
    } else {
      setRadius(Math.round(r));
    }
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

  // ── Mode switch ──────────────────────────────────────────────────────────
  const handleModeChange = (mode: DrawMode) => {
    setDrawMode(mode);
    setCursorLatLng(null);
    setNearStart(false);
    setIsClosed(false);
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

  // ── Mouse move for live preview and near-start snap ──────────────────────
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

  const handleSave = async () => {
    if (selectedProjectIds.length === 0) {
      toast.error("Please select at least one project!");
      return;
    }
    if (activeTab === 1 && !addressId) {
      toast.error("Please select address!");
      return;
    }
    if (zoneType === "polygon" && drawPath.length < 3) {
      toast.error("Please draw at least 3 points on the map!");
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
        lat = drawPath.reduce((s, p) => s + p.lat, 0) / drawPath.length;
        lng = drawPath.reduce((s, p) => s + p.lng, 0) / drawPath.length;
      }
      const payload: any = {
        company_id: companyId,
        name: activeTab === 0 ? name : address,
        address: address ? address : name,
        lat,
        lng,
        type: zoneType,
        color,
        boundary: JSON.stringify(boundary),
        project_ids:
          activeTab === 1 && selectedProjectIds.length > 0
            ? [selectedProjectIds[0]]
            : selectedProjectIds,
      };
      if (activeTab === 1) payload.address_id = addressId;

      const res = await api.post("work-zone/create", payload);
      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        onAdded();
        onCancel();
      }
    } catch (err) {
      console.error(err);
    }
    setIsSaving(false);
  };

  const [projectSearch, setProjectSearch] = useState("");

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
          Add Zone
        </Typography>
      </Box>

      <Box sx={{ p: { xs: 1.5, sm: 3 }, flex: 1, overflowY: "auto" }}>
        <Grid container spacing={3} sx={{ height: "100%" }}>
          {/* LEFT COLUMN: PROJECTS */}
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
              <Tabs value={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
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
                    p.name.toLowerCase().includes(projectSearch.toLowerCase()),
                  )
                  .map((p: any) => {
                    const checked = selectedProjectIds.includes(p.id);
                    return (
                      <ListItem key={p.id} disablePadding divider>
                        <ListItemButton
                          onClick={() => {
                            if (isMapPage && activeTab === 0) {
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
                          sx={{ display: "flex", alignItems: "center", py: 1 }}
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

          {/* RIGHT COLUMN: MAP & DETAILS */}
          <Grid size={{ xs: 12, md: 8 }}>
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
                      "& input": { textAlign: "start" },
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

              {/* MAP */}
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
                      value={addressId || ""}
                      onChange={(e) =>
                        handleAddressChange(Number(e.target.value))
                      }
                      displayEmpty
                    >
                      <MenuItem value="" disabled>
                        Select Address
                      </MenuItem>
                      {filteredAddresses.map((a: any) => (
                        <MenuItem key={a.id} value={a.id}>
                          {a.name}
                        </MenuItem>
                      ))}
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
                    height: { xs: 320, sm: 400, md: 480 },
                    position: "relative",
                    borderRadius: 1.5,
                    overflow: "hidden",
                    backgroundColor: "#e8e8e8",
                    border: "1px solid #e0e0e0",
                  }}
                >
                  <GoogleMap
                    zoom={13}
                    center={location}
                    mapContainerStyle={{ width: "100%", height: "100%" }}
                    onMouseMove={handleMouseMove}
                    onClick={handleMapClick}
                    onLoad={(map) => {
                      mapRef.current = map;
                    }}
                    options={{
                      clickableIcons: false,
                      disableDoubleClickZoom: true,
                      draggableCursor: isDrawingActive ? "crosshair" : "",
                    }}
                  >
                    {drawMode === "circle" && (
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
                            strokeColor: color,
                            fillColor: color + "33",
                            editable: true,
                            draggable: true,
                          }}
                          onRadiusChanged={onRadiusChanged}
                          onLoad={(circle) => {
                            circleRef.current = circle;
                            circle.addListener("center_changed", () => {
                              const c = circle.getCenter();
                              if (!c) return;
                              const nl = { lat: c.lat(), lng: c.lng() };
                              if (
                                lastCenterRef.current?.lat === nl.lat &&
                                lastCenterRef.current?.lng === nl.lng
                              )
                                return;
                              lastCenterRef.current = nl;
                              setLocation(nl);
                            });
                          }}
                        />
                      </>
                    )}

                    {((drawMode === "polygon" && isClosed) ||
                      (drawMode === "pan" && zoneType === "polygon")) &&
                      drawPath.length >= 3 && (
                        <Polygon
                          paths={drawPath}
                          options={{
                            strokeColor: color,
                            fillColor: color + "33",
                            strokeWeight: 2,
                            editable: true,
                            draggable: true,
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
                      drawPath.map((pt, i) => {
                        const isFirst = i === 0;
                        const canClose =
                          isFirst && drawPath.length >= 3 && !isClosed;
                        return (
                          <Marker
                            key={`pt-${i}`}
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
                  />
                </Box>
              </Box>
            </Card>

            {/* Zone Color Card */}
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
                <Box sx={{ display: "flex", gap: 1 }}>
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
                  value={color}
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
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default AddZone;
