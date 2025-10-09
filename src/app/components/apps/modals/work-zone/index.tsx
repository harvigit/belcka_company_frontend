"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  Divider,
  TextField,
  List,
  ListItem,
  ListItemButton,
  Autocomplete,
  Paper,
  DialogContent,
  DialogActions,
  Tooltip,
} from "@mui/material";
import {
  GoogleMap,
  Circle,
  Polygon,
  Polyline,
  DrawingManager,
} from "@react-google-maps/api";
import { IconPlus, IconX, IconEdit, IconTrash } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import api from "@/utils/axios";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import toast from "react-hot-toast";

const containerStyle = { width: "100%", height: "100%" };
const defaultCenter = { lat: 20.5937, lng: 78.9629 };

interface Props {
  open: boolean;
  onClose: () => void;
  isLoaded: boolean;
  onSiteUpdate?: (siteId: number) => void;
}

export default function WorkZone({
  open,
  onClose,
  onSiteUpdate,
  isLoaded,
}: Props) {
  const [sites, setSites] = useState<any[]>([]);
  const [activeSite, setActiveSite] = useState<any | null>(null);
  const [project, setProject] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [addressInput, setAddressInput] = useState("");
  const [typedAddress, setTypedAddress] = useState(false);
  const [predictions, setPredictions] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);
  const [circleCenter, setCircleCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };

  const circleRef = useRef<google.maps.Circle | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const drawingOverlayRef = useRef<google.maps.MVCObject | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(
    null
  );

  const getWorkzones = async () => {
    if (!user?.company_id) return;
    setLoading(true);
    try {
      const res = await api.get(
        `work-zone/get?company_id=${user.company_id}&is_project=${true}`
      );
      setSites(res.data.info || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getJobList = async () => {
    if (!user?.company_id) return;
    try {
      const res = await api.get(`project/get?company_id=${user.company_id}`);
      if (res.data.IsSuccess) setProject(res.data.info);
    } catch (err) {}
  };

  useEffect(() => {
    if (open) {
      getWorkzones();
      getJobList();
    }
  }, [open, user?.company_id]);

  useEffect(() => {
    if (!isLoaded || !addressInput || !typedAddress) return;
    const service = new google.maps.places.AutocompleteService();

    const input = /^[0-9]{5,6}$/.test(addressInput.trim())
      ? `India ${addressInput.trim()}`
      : addressInput;

    service.getPlacePredictions({ input }, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        setPredictions(results);
      } else {
        setPredictions([]);
      }
    });
  }, [addressInput, typedAddress, isLoaded]);

  const selectPrediction = (placeId: string) => {
    if (!map || !isLoaded) return;
    const service = new google.maps.places.PlacesService(map);
    service.getDetails({ placeId }, (place, status) => {
      if (
        status === google.maps.places.PlacesServiceStatus.OK &&
        place?.geometry?.location
      ) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setCircleCenter({ lat, lng });
        setAddressInput(place.formatted_address || "");
        setTypedAddress(false);
        setPredictions([]);
        if (activeSite) {
          setActiveSite((prev: any) => ({
            ...prev,
            address: place.formatted_address,
            lat,
            lng,
          }));
        }
      }
    });
  };

  const updateActiveSite = (field: string, value: any) => {
    setActiveSite((prev: any) => ({ ...prev, [field]: value }));
  };

  const getBoundaryPath = () => {
    if (!activeSite?.boundary) return [];
    try {
      const parsed = JSON.parse(activeSite.boundary);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const getCircleData = () => {
    if (!activeSite?.boundary) return null;
    try {
      const parsed = JSON.parse(activeSite.boundary);
      if (parsed?.lat && parsed?.lng && parsed?.radius) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  };

  const clearExistingOverlays = () => {
    if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }
    if (polygonRef.current) {
      polygonRef.current.setMap(null);
      polygonRef.current = null;
    }
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
    if (drawingOverlayRef.current) {
      (drawingOverlayRef.current as any).setMap(null);
      drawingOverlayRef.current = null;
    }
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setDrawingMode(null);
    }
  };

  const handleSaveSite = async () => {
    if (!activeSite) return;

    try {
      setLoading(true);
      let boundary: any = null;

      if (activeSite.type === "circle") {
        const center = circleRef.current?.getCenter();
        const radius = circleRef.current?.getRadius();

        boundary =
          center && radius
            ? {
                lat: center.lat(),
                lng: center.lng(),
                radius,
              }
            : {
                lat: activeSite.lat || 0,
                lng: activeSite.lng || 0,
                radius: activeSite.circleRadius || 0,
              };
      } else if (activeSite.type === "polygon") {
        const path =
          polygonRef.current?.getPath().getArray() ||
          activeSite.polygonPath ||
          [];
        boundary = path.map((p: any) => ({
          lat: typeof p.lat === "function" ? p.lat() : p.lat,
          lng: typeof p.lng === "function" ? p.lng() : p.lng,
        }));
      } else if (activeSite.type === "polyline") {
        const path =
          polylineRef.current?.getPath().getArray() ||
          activeSite.polylinePath ||
          [];
        boundary = path.map((p: any) => ({
          lat: typeof p.lat === "function" ? p.lat() : p.lat,
          lng: typeof p.lng === "function" ? p.lng() : p.lng,
        }));
      }
      const payload = {
        id: activeSite.id,
        company_id: user?.company_id,
        name: activeSite.name || "",
        address: activeSite.address || "",
        lat: boundary?.lat ?? circleCenter?.lat ?? Number(activeSite.lat || 0),
        lng: boundary?.lng ?? circleCenter?.lng ?? Number(activeSite.lng || 0),
        project_id: activeSite.project_id ? activeSite.project_id : null,
        color: activeSite.color || "#000000",
        type: activeSite.type,
        boundary: JSON.stringify(boundary),
      };

      const response = activeSite.id
        ? await api.put(`work-zone/update`, payload)
        : await api.post(`work-zone/create`, payload);

      if (response?.data?.IsSuccess) {
        toast.success(response.data.message);
        onSiteUpdate?.(response.data.info?.id || activeSite.id);
        clearExistingOverlays();
      } else {
        clearExistingOverlays();
        toast.error(response?.data?.message || "Something went wrong!");
      }

      await getWorkzones();
      setActiveSite(null);
      setAddressInput("");
      setCircleCenter(null);
      clearExistingOverlays();
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
      clearExistingOverlays();
    }
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setDrawingMode(null);
    }
  };

  const handleDialogClose = () => {
    clearExistingOverlays();
    setActiveSite(null);
    setAddressInput("");
    setCircleCenter(null);
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setDrawingMode(null);
    }

    onClose();
  };

  const handleClickDelete = (id: number) => {
    setSelectedId(id);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedId === null) return;
    await handleDeleteSite(selectedId);
    setConfirmOpen(false);
    setSelectedId(null);
  };

  const handleDeleteSite = async (id: number) => {
    try {
      setLoading(true);
      const response = await api.delete(`work-zone/delete?id=${id}`);
      toast.success(response.data.message);
      onSiteUpdate?.(response.data.info?.id || id);
      await getWorkzones();

      setSites((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog maxWidth="xl" fullWidth open={open} onClose={handleDialogClose}>
      <DialogTitle
        sx={{ display: "flex", justifyContent: "space-between", p: 1 }}
      >
        <Typography m="auto" color="textSecondary">
          Geo fence sites editor
        </Typography>
        <IconButton onClick={handleDialogClose}>
          <IconX size={20} />
        </IconButton>
      </DialogTitle>
      <Divider />
      <Box display="flex" height="100%">
        {/* Sidebar */}
        <Box sx={{ width: "30%", minWidth: "250px", backgroundColor: "#fff" }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            p={2}
          >
            <Typography variant="h6">Sites ({sites.length})</Typography>
            <Button
              variant="outlined"
              startIcon={<IconPlus size={16} />}
              sx={{ borderRadius: 30 }}
              color="primary"
              onClick={() => {
                clearExistingOverlays();
                setActiveSite({
                  name: "",
                  address: "",
                  project_id: null,
                  color: "#000000",
                });
                setAddressInput("");
                setTypedAddress(false);
                setCircleCenter(null);
                if (drawingManagerRef.current)
                  drawingManagerRef.current.setDrawingMode(null);
              }}
            >
              Add site
            </Button>
          </Box>
          <Divider />

          {/* Site list */}
          {sites.length > 0 && !activeSite && (
            <Box sx={{ p: 2 }}>
              {sites.map((s) => (
                <Paper
                  key={s.id}
                  sx={{
                    mb: 2,
                    p: 2,
                    borderRadius: 2,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    border:
                      activeSite?.id === s.id
                        ? `2px solid ${s.color || "#000000"}`
                        : "none",
                    backgroundColor:
                      activeSite?.id === s.id ? "#f0f0f0" : "#fff",
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {s.name}
                    </Typography>
                  </Box>
                  <Box>
                    <Tooltip title="Edit">
                      <IconButton
                        color="primary"
                        onClick={() => {
                          clearExistingOverlays();
                          setActiveSite(s);
                          setAddressInput(s.address || "");
                          setTypedAddress(false);
                          setCircleCenter({
                            lat: s.lat || s.latitude,
                            lng: s.lng || s.longitude,
                          });
                          if (drawingManagerRef.current) {
                            drawingManagerRef.current.setDrawingMode(null);
                          }
                        }}
                      >
                        <IconEdit size={18} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        color="error"
                        onClick={() => handleClickDelete(s.id)}
                      >
                        <IconTrash size={18} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}

          {/* Delete confirm dialog */}
          <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogContent>
              Are you sure you want to delete this site?
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button color="error" onClick={handleConfirmDelete}>
                Delete
              </Button>
            </DialogActions>
          </Dialog>

          {/* Form */}
          <Box
            sx={{ flex: 1, p: 2, mb: 2, maxHeight: "70vh", overflowY: "auto" }}
          >
            {activeSite ? (
              <>
                <Typography>Site name</Typography>
                <TextField
                  fullWidth
                  placeholder="Enter site name"
                  value={activeSite.name || ""}
                  onChange={(e) => updateActiveSite("name", e.target.value)}
                />

                <Typography mt={2}>Site address</Typography>
                <TextField
                  fullWidth
                  placeholder="Enter address / pincode"
                  value={addressInput}
                  onChange={(e) => {
                    setAddressInput(e.target.value);
                    setTypedAddress(true);
                  }}
                />
                {typedAddress && predictions.length > 0 && (
                  <List
                    sx={{
                      border: "1px solid #ccc",
                      maxHeight: 200,
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

                <Box mt={2}>
                  <Typography>Zone Color</Typography>
                  <input
                    type="color"
                    value={activeSite.color || "#000000"}
                    onChange={(e) => updateActiveSite("color", e.target.value)}
                    style={{
                      width: "100%",
                      height: "40px",
                      border: "none",
                      cursor: "pointer",
                    }}
                  />
                </Box>

                <Box mt={2}>
                  <Typography>Available Project</Typography>
                  <Autocomplete
                    fullWidth
                    options={project}
                    value={
                      project.find((p) => p.id === activeSite.project_id) ||
                      null
                    }
                    onChange={(event, newValue) =>
                      updateActiveSite(
                        "project_id",
                        newValue ? newValue.id : null
                      )
                    }
                    getOptionLabel={(option) => option.name}
                    isOptionEqualToValue={(option, value) =>
                      option.id === value.id
                    }
                    renderInput={(params) => (
                      <CustomTextField
                        {...params}
                        placeholder="Select project"
                      />
                    )}
                  />
                </Box>

                <Box display="flex" justifyContent="end" mt={2}>
                  <Button sx={{ mr: 2 }} onClick={() => setActiveSite(null)}>
                    Cancle
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSaveSite}
                    disabled={loading}
                  >
                    {activeSite.id ? "Update Site" : "Save Site"}
                  </Button>
                </Box>
              </>
            ) : (
              <Typography color="text.secondary" textAlign="center" mt={4}>
                Select a site to edit or click "Add site"
              </Typography>
            )}
          </Box>
        </Box>

        {/* Map */}
        <Box sx={{ flex: 1, position: "relative", height: "70vh" }}>
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={circleCenter || defaultCenter}
            zoom={circleCenter ? 14 : 4}
            onLoad={setMap}
          >
            {/* Circle */}
            {activeSite?.type === "circle" && (
              <Circle
                center={
                  circleCenter ||
                  (getCircleData()
                    ? { lat: getCircleData()!.lat, lng: getCircleData()!.lng }
                    : undefined)
                }
                radius={
                  activeSite.circleRadius ||
                  (getCircleData() ? getCircleData()!.radius : undefined)
                }
                options={{
                  fillColor: activeSite.color || "#000000",
                  fillOpacity: 0.2,
                  strokeColor: activeSite.color || "#000000",
                  strokeWeight: 2,
                  editable: true,
                  draggable: true,
                }}
                onLoad={(circle) => {
                  if (!circleRef.current) {
                    circleRef.current = circle;

                    const updateCircleData = () => {
                      const c = circle.getCenter();
                      if (!c) return;

                      const newCenter = { lat: c.lat(), lng: c.lng() };
                      const newRadius = circle.getRadius();

                      setCircleCenter((prev) =>
                        !prev ||
                        prev.lat !== newCenter.lat ||
                        prev.lng !== newCenter.lng
                          ? newCenter
                          : prev
                      );

                      setActiveSite((prev: any) => {
                        if (
                          !prev ||
                          (prev.circleRadius === newRadius &&
                            prev.boundary ===
                              JSON.stringify({
                                ...newCenter,
                                radius: newRadius,
                              }))
                        ) {
                          return prev;
                        }
                        return {
                          ...prev,
                          circleRadius: newRadius,
                          boundary: JSON.stringify({
                            ...newCenter,
                            radius: newRadius,
                          }),
                        };
                      });
                    };

                    circle.addListener("center_changed", updateCircleData);
                    circle.addListener("radius_changed", updateCircleData);
                  }
                }}
              />
            )}

            {/* Polygon */}
            {activeSite?.type === "polygon" && (
              <Polygon
                paths={getBoundaryPath()}
                options={{
                  fillColor: activeSite.color || "#000000",
                  fillOpacity: 0.2,
                  strokeColor: activeSite.color || "#000000",
                  strokeWeight: 2,
                  editable: true,
                }}
                onLoad={(polygon) => {
                  polygonRef.current = polygon;
                }}
              />
            )}

            {/* Polyline */}
            {activeSite?.type === "polyline" && (
              <Polyline
                path={getBoundaryPath()}
                options={{
                  strokeColor: activeSite.color || "#000000",
                  strokeWeight: 2,
                  editable: true,
                }}
                onLoad={(polyline) => {
                  polylineRef.current = polyline;
                }}
              />
            )}

            {/* Drawing Manager */}
            <DrawingManager
              options={{
                drawingControl: true,
                drawingControlOptions: {
                  position: google.maps.ControlPosition.TOP_CENTER,
                  drawingModes: [
                    google.maps.drawing.OverlayType.CIRCLE,
                    google.maps.drawing.OverlayType.POLYGON,
                    google.maps.drawing.OverlayType.POLYLINE,
                  ],
                },
              }}
              onOverlayComplete={(e) => {
                if (drawingOverlayRef.current) {
                  (drawingOverlayRef.current as any).setMap(null);
                }

                const overlayType = google.maps.drawing.OverlayType;
                if (e.type === overlayType.CIRCLE) {
                  const circle = e.overlay as google.maps.Circle;
                  const center = circle.getCenter();
                  if (center)
                    setCircleCenter({ lat: center.lat(), lng: center.lng() });

                  updateActiveSite("circleRadius", circle.getRadius());
                  updateActiveSite("type", "circle");

                  circle.addListener("center_changed", () => {
                    const c = circle.getCenter();
                    if (c) setCircleCenter({ lat: c.lat(), lng: c.lng() });
                  });
                  circle.addListener("radius_changed", () =>
                    updateActiveSite("circleRadius", circle.getRadius())
                  );

                  drawingOverlayRef.current = circle;
                } else if (e.type === overlayType.POLYGON) {
                  const polygon = e.overlay as google.maps.Polygon;
                  const path = polygon
                    .getPath()
                    .getArray()
                    .map((p) => ({
                      lat: p.lat(),
                      lng: p.lng(),
                    }));
                  updateActiveSite("polygonPath", path);
                  updateActiveSite("type", "polygon");
                  updateActiveSite("boundary", JSON.stringify(path));
                  drawingOverlayRef.current = polygon;
                } else if (e.type === overlayType.POLYLINE) {
                  const polyline = e.overlay as google.maps.Polyline;
                  const path = polyline
                    .getPath()
                    .getArray()
                    .map((p) => ({
                      lat: p.lat(),
                      lng: p.lng(),
                    }));
                  updateActiveSite("polylinePath", path);
                  updateActiveSite("type", "polyline");
                  updateActiveSite("boundary", JSON.stringify(path));
                  drawingOverlayRef.current = polyline;
                }
              }}
            />
          </GoogleMap>
        </Box>
      </Box>
    </Dialog>
  );
}
