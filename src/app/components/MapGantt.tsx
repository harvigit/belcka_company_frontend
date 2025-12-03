"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Table,
  TableRow,
  TableBody,
  TableHead,
  TableCell,
  Typography,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Button,
  TextField,
  Slider,
  List,
  ListItem,
  ListItemButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
  Drawer,
  Autocomplete,
} from "@mui/material";

import {
  GoogleMap,
  useJsApiLoader,
  Polygon,
  Circle,
  Marker,
  OverlayView,
} from "@react-google-maps/api";
import { Circle as GCircle } from "@react-google-maps/api";
import { IconEye, IconTrash, IconX, IconEdit } from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import { AxiosResponse } from "axios";
import { Grid, width } from "@mui/system";
import { IconSearch } from "@tabler/icons-react";
import CustomTextField from "./forms/theme-elements/CustomTextField";

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: number | null;
  companyId: number | null;
};

const GOOGLE_MAP_LIBRARIES = ["places", "drawing"];

export default function MapGantt({
  open,
  onClose,
  projectId,
  companyId,
}: Props) {
  const [geofences, setGeofences] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [addZoneOpen, setAddZoneOpen] = useState(false);
  const [projectList, setProjectList] = useState<any[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
    libraries: GOOGLE_MAP_LIBRARIES as any,
  });

  const fetchProjects = async () => {
    try {
      const res = await api.get(`project/get?company_id=${companyId}`);
      if (res.data?.info) {
        setProjectList(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch projects", err);
    }
  };

  const fetchProjectDetail = async (pid: number | null) => {
    if (!pid) return;
    try {
      const res: AxiosResponse<any> = await api.get("address/zones", {
        params: { project_id: pid },
      });

      setGeofences(res.data.info?.zones ?? []);
    } catch (err) {
      console.error("Geofence fetch error:", err);
    }
  };

  const loadAddressList = async () => {
    try {
      const res = await api.get("address/get", {
        params: { project_id: activeProjectId },
      });
      setAddresses(res.data.info || []);
    } catch (err) {
      console.error("Address list fetch error:", err);
    }
  };

  useEffect(() => {
    if (addZoneOpen || selected?.mode === "edit") {
      loadAddressList();
    }
  }, [addZoneOpen, selected]);

  useEffect(() => {
    if (open) {
      fetchProjects();
      setActiveProjectId(projectId);
      fetchProjectDetail(projectId);
    }
  }, [open]);

  // Delete Zone
  const handleDeleteZone = async () => {
    if (!deleteId) return;

    try {
      const res = await api.delete(`work-zone/delete?id=${deleteId}`);

      if (res.data.IsSuccess) {
        toast.success("Zone deleted");

        setGeofences((prev) => prev.filter((z) => z.id !== deleteId));
        setDeleteConfirmOpen(false);
        setDeleteId(null);

        fetchProjectDetail(activeProjectId!);
      }
    } catch (e) {
      console.error(e);
    }
  };
  const filterData = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return geofences;

    return geofences.filter(
      (item) =>
        item.address?.toLowerCase().includes(search) ||
        item.address_name?.toLowerCase().includes(search) ||
        item.name?.toLowerCase().includes(search)
    );
  }, [geofences, searchTerm]);

  return (
    <Box p={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box display={"flex"} width={"80%"} gap={3} alignItems={"center"}>
          <Typography variant="h5" fontWeight={700}>
            Address Zones
          </Typography>
          <TextField
            id="search"
            type="text"
            size="small"
            placeholder="Search..."
            className="project_search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconSearch size={16} />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: "90%", sm: "50%", md: "30%", lg: "25%" } }}
          />

          <Autocomplete
            id="project_id"
            className="zone-project-selection"
            options={projectList}
            value={projectList.find((p) => p.id === activeProjectId) ?? null}
            onChange={(event, newValue) => {
              const newId = newValue?.id ?? null;

              setActiveProjectId(newId);

              if (newId) {
                fetchProjectDetail(newId);
              }
            }}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            sx={{ minWidth: 200 ,minHeight: 20}}
            renderInput={(params) => (
              <CustomTextField
                {...params}
                InputProps={{
                  ...params.InputProps,
                  readOnly: true,
                  style: { caretColor: "transparent" },
                }}
                placeholder="Projects"
              />
            )}
          />
        </Box>

        {/* ADD BUTTON + CLOSE */}
        <Box display="flex" alignItems="center">
          <Button
            variant="contained"
            color="primary"
            onClick={() => setAddZoneOpen(true)}
            sx={{ mr: 2 }}
          >
            Add Zone
          </Button>

          <IconButton onClick={onClose}>
            <IconX />
          </IconButton>
        </Box>
      </Box>

      {/* CONTENT */}
      <Box display="flex" gap={2} mt={2} height="calc(100vh - 120px)">
        {/* LEFT TABLE */}
        <Box width="35%" overflow="auto">
          <Paper>
            <Table>
              <TableHead>
                <TableRow sx={{ background: "#f5f5f5" }}>
                  <TableCell>
                    <b>Name</b>
                  </TableCell>
                  <TableCell width={150}>
                    <b>Action</b>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filterData.map((z) => (
                  <TableRow key={z.id}>
                    <TableCell>
                      <Typography>{z.name}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {z.address_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex">
                        <IconButton
                          color="success"
                          onClick={() => setSelected({ ...z, mode: "view" })}
                        >
                          <IconEye size={20} />
                        </IconButton>

                        <IconButton
                          color="primary"
                          onClick={() => setSelected({ ...z, mode: "edit" })}
                        >
                          <IconEdit size={20} />
                        </IconButton>

                        <IconButton
                          color="error"
                          onClick={() => {
                            setDeleteId(z.id);
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          <IconTrash size={20} />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}

                {filterData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                      No zones found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </Box>

        {/* RIGHT MAP AREA */}
        <Box width="65%" display="flex" flexDirection="column" overflow="auto">
          {!selected && <AllZonesMap zones={filterData} isLoaded={isLoaded} />}

          {selected?.mode === "view" && (
            <ViewZoneMap
              key={selected.id}
              zone={selected}
              isLoaded={isLoaded}
            />
          )}

          {selected?.mode === "edit" && (
            <EditZone
              key={selected.id}
              zone={selected}
              onSaved={() => fetchProjectDetail(activeProjectId!)}
              onCancel={() => setSelected(null)}
              projectId={activeProjectId}
              companyId={companyId}
              addresses={addresses}
            />
          )}
        </Box>
      </Box>

      {/* DELETE CONFIRMATION */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>
          Delete Zone
          <IconButton
            onClick={() => setDeleteConfirmOpen(false)}
            sx={{ position: "absolute", right: 12, top: 8 }}
          >
            <IconX size={40} />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Typography color="textSecondary">
            Are you sure you want to delete this zone?
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => setDeleteConfirmOpen(false)}
          >
            Cancel
          </Button>

          <Button variant="contained" color="error" onClick={handleDeleteZone}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* ADD ZONE DRAWER */}
      {addZoneOpen && (
        <AddZone
          projectId={activeProjectId}
          companyId={companyId}
          addresses={addresses}
          onAdded={() => {
            fetchProjectDetail(activeProjectId!);
            setAddZoneOpen(false);
          }}
          onCancel={() => setAddZoneOpen(false)}
        />
      )}
    </Box>
  );
}

const AllZonesMap = ({ zones, isLoaded }: any) => {
  if (!isLoaded) return <p>Loading map...</p>;

  const defaultCenter = { lat: 20.5937, lng: 78.9629 };

  const mapCenter = zones.length
    ? { lat: Number(zones[0].latitude), lng: Number(zones[0].longitude) }
    : defaultCenter;
  const mapRef = useRef<google.maps.Map | null>(null);

  const onZoneClick = (zone: any) => {
    console.log(zone, mapRef);
    if (!mapRef.current) return;

    const newCenter = {
      lat: Number(zone.latitude),
      lng: Number(zone.longitude),
    };

    mapRef.current.panTo(newCenter);
    mapRef.current.setZoom(18);
  };

  return (
    <Paper sx={{ height: "90%", width: "100%" }}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        zoom={5}
        center={mapCenter}
        onLoad={(map) => {
          mapRef.current = map;
        }}
      >
        {zones.map((zone: any) => {
          const center = {
            lat: Number(zone.latitude),
            lng: Number(zone.longitude),
          };

          return (
            <React.Fragment key={zone.id}>
              <OverlayView
                position={center}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <Box
                  onClick={() => onZoneClick(zone)}
                  sx={{
                    cursor: "pointer",
                    display: "flex",
                    color: `${zone.color}`,
                    width: "max-content",
                  }}
                  className="map-site-label"
                >
                  <Typography> {zone.name}</Typography>
                </Box>
              </OverlayView>

              <Marker
                position={center}
                icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 0 }}
              />

              <Circle
                center={center}
                radius={Number(zone.radius)}
                options={{
                  strokeColor: zone.color || "#1976d2",
                  fillColor: (zone.color || "#1976d2") + "33",
                }}
              />
            </React.Fragment>
          );
        })}
      </GoogleMap>
    </Paper>
  );
};

// VIEW ZONE MAP
const DEFAULT_ZOOM = 18;

const ViewZoneMap = ({ zone, isLoaded }: any) => {
  if (!isLoaded) return <p>Loading map...</p>;

  const center = {
    lat: Number(zone.latitude),
    lng: Number(zone.longitude),
  };

  const handleMapLoad = (map: google.maps.Map) => {
    const bounds = new google.maps.LatLngBounds();

    if (zone.type === "circle") {
      const circleCenter = new google.maps.LatLng(center.lat, center.lng);
      const radius = Number(zone.radius);

      bounds.extend(
        google.maps.geometry.spherical.computeOffset(circleCenter, radius, 0)
      );
      bounds.extend(
        google.maps.geometry.spherical.computeOffset(circleCenter, radius, 90)
      );
      bounds.extend(
        google.maps.geometry.spherical.computeOffset(circleCenter, radius, 180)
      );
      bounds.extend(
        google.maps.geometry.spherical.computeOffset(circleCenter, radius, 270)
      );

      map.fitBounds(bounds);
      map.setZoom(DEFAULT_ZOOM);
    }

    if (zone.type === "polygon" && zone.coordinates?.length > 0) {
      zone.coordinates.forEach((point: any) =>
        bounds.extend(new google.maps.LatLng(point.lat, point.lng))
      );

      map.fitBounds(bounds);
      map.setZoom(DEFAULT_ZOOM);
    }
  };

  return (
    <Paper sx={{ height: "90%" }}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        zoom={DEFAULT_ZOOM}
        center={center}
        onLoad={handleMapLoad}
      >
        <Marker
          position={center}
          label={{
            text: zone.name || "",
            color: zone.color || "#1976d2",
            className: "map-site-label",
          }}
          icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 0 }}
        />

        {zone.type === "circle" && (
          <Circle
            center={center}
            radius={Number(zone.radius)}
            options={{
              strokeColor: zone.color || "#1976d2",
              fillColor: `${zone.color || "#1976d2"}33`,
            }}
          />
        )}

        {zone.type === "polygon" && (
          <Polygon
            paths={zone.coordinates}
            options={{
              strokeColor: zone.color,
              fillColor: `${zone.color}33`,
            }}
          />
        )}
      </GoogleMap>
    </Paper>
  );
};

// ADD ZONE COMPONENT
const AddZone = ({
  onAdded,
  onCancel,
  projectId,
  companyId,
  addresses,
}: any) => {
  const [addressId, setAddressId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [radius, setRadius] = useState(10);
  const [isSaving, setIsSaving] = useState(false);

  const [location, setLocation] = useState({ lat: 20.5937, lng: 78.9629 });

  const mapRef = useRef<google.maps.Map | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const lastCenterRef = useRef<{ lat: number; lng: number } | null>(null);

  const [typedAddress, setTypedAddress] = useState(false);
  const [predictions, setPredictions] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);

  // When Address dropdown selected
  const handleAddressChange = (id: number) => {
    setAddressId(id);

    const addr = addresses.find((a: any) => a.id === id);
    if (addr) {
      setLocation({
        lat: Number(addr.latitude),
        lng: Number(addr.longitude),
      });
      setRadius(addr.radius || 10);
    }
  };

  // Google search input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setTypedAddress(true);
    fetchPredictions(e.target.value);
  };

  const fetchPredictions = (input: string) => {
    if (!input) return setPredictions([]);

    new google.maps.places.AutocompleteService().getPlacePredictions(
      { input },
      (preds) => setPredictions(preds || [])
    );
  };

  const onMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const newLoc = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setLocation(newLoc);
    if (circleRef.current) circleRef.current.setCenter(newLoc);
  };

  const onRadiusChanged = () => {
    if (circleRef.current) {
      const newRadius = circleRef.current.getRadius();

      if (newRadius > 100) {
        circleRef.current.setRadius(100);
        setRadius(100);
      } else {
        setRadius(newRadius);
      }
    }
  };

  const selectPrediction = (placeId: string) => {
    new google.maps.places.PlacesService(
      document.createElement("div")
    ).getDetails({ placeId }, (place, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && place) {
        setName(place.formatted_address || place.name || "");

        if (place.geometry?.location) {
          setLocation({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          });
        }
      }
      setTypedAddress(false);
      setPredictions([]);
    });
  };

  const handleSave = async () => {
    try {
      if (!addressId) {
        toast.error("Please select address!");
        return;
      }
      setIsSaving(true);

      const payload = {
        company_id: companyId,
        project_id: projectId,
        name,
        address: name,
        address_id: addressId,
        lat: location.lat,
        lng: location.lng,
        type: "circle",
        color: "#1976d2",
        boundary: JSON.stringify({
          lat: location.lat,
          lng: location.lng,
          radius,
        }),
      };

      const res: AxiosResponse<any> = await api.post(
        "work-zone/create",
        payload
      );
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

  return (
    <Drawer
      anchor="right"
      open={onAdded}
      onClose={onCancel}
      sx={{
        width: 500,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: 500,
          padding: 2,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#f9f9f9",
        },
      }}
    >
      <Box
        display={"flex"}
        justifyContent={"space-between"}
        alignItems={"center"}
      >
        <Typography variant="h6" fontWeight={600}>
          Add Zone
        </Typography>
        <IconButton onClick={onCancel}>
          <IconX />
        </IconButton>
      </Box>
      {/* <Box display="flex" flexDirection="column" height="100%"> */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          paddingRight: 1,
        }}
      >
        <Box className="task-form">
          <Grid container mt={3}>
            <Grid size={{ lg: 12, xs: 12 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Address</InputLabel>
                <Select
                  value={addressId || ""}
                  label="Select Address"
                  onChange={(e) => handleAddressChange(Number(e.target.value))}
                >
                  {addresses.map((a: any) => (
                    <MenuItem key={a.id} value={a.id}>
                      {a.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Address Search Box */}
              <TextField
                fullWidth
                label="Search location"
                value={name}
                onChange={handleInputChange}
                placeholder="Search location..."
                sx={{ mb: 2 }}
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

              <Typography fontWeight={600}>
                Area Radius [{radius} Meter]
              </Typography>
              <Slider
                min={0}
                max={100}
                value={radius}
                onChange={(e, v) => setRadius(v as number)}
                sx={{ mb: 2 }}
              />
              <Box
                sx={{
                  height: 400,
                  overflow: "auto",
                  mb: 2,
                  mt: 2,
                }}
              >
                <GoogleMap
                  zoom={20}
                  center={location}
                  mapContainerStyle={{ width: "100%", height: "400px" }}
                  onLoad={(map) => {
                    mapRef.current = map;
                  }}
                >
                  <Marker
                    position={location}
                    draggable
                    onDragEnd={onMarkerDragEnd}
                  />
                  <GCircle
                    center={location}
                    radius={radius}
                    options={{
                      strokeColor: "#1976d2",
                      fillColor: "#1976d233",
                      editable: true,
                      draggable: true,
                    }}
                    onRadiusChanged={onRadiusChanged}
                    onLoad={(circle) => {
                      circleRef.current = circle;

                      circle.addListener("center_changed", () => {
                        const c = circle.getCenter();
                        if (!c) return;
                        if (circleRef.current) {
                          const newRadius = circleRef.current.getRadius();

                          if (newRadius > 100) {
                            circleRef.current.setRadius(100);
                            setRadius(100);
                          } else {
                            setRadius(newRadius);
                          }
                        }
                        const newLoc = { lat: c.lat(), lng: c.lng() };

                        if (
                          lastCenterRef.current &&
                          lastCenterRef.current.lat === newLoc.lat &&
                          lastCenterRef.current.lng === newLoc.lng
                        ) {
                          return;
                        }

                        lastCenterRef.current = newLoc;
                        setLocation(newLoc);
                      });
                    }}
                  />
                </GoogleMap>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "start",
          gap: 2,
          mt: 2,
        }}
      >
        <Button
          color="primary"
          onClick={handleSave}
          variant="contained"
          size="large"
          type="submit"
          disabled={isSaving}
          sx={{ borderRadius: 3 }}
          className="drawer_buttons"
        >
          {isSaving ? "Saving..." : "Save"}
        </Button>
        <Button
          color="inherit"
          onClick={onCancel}
          variant="contained"
          size="large"
          sx={{
            backgroundColor: "transparent",
            borderRadius: 3,
            color: "GrayText",
          }}
        >
          Cancel
        </Button>
      </Box>
      {/* </Box> */}
    </Drawer>
  );
};

type EditZoneProps = {
  zone: any;
  onSaved: () => void;
  onCancel: () => void;
  projectId: number | null;
  companyId: number | null;
  addresses: any;
};

const EditZone = ({
  zone,
  onSaved,
  onCancel,
  projectId,
  companyId,
  addresses,
}: EditZoneProps) => {
  const [name, setName] = useState(zone.name);
  const [radius, setRadius] = useState(Number(zone.radius));
  const [isSaving, setIsSaving] = useState(false);

  const [location, setLocation] = useState({
    lat: Number(zone.latitude),
    lng: Number(zone.longitude),
  });
  const [typedAddress, setTypedAddress] = useState(false);
  const [predictions, setPredictions] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);
  const [addressId, setAddressId] = useState<number | null>(
    zone.address_id || null
  );
  const circleRef = useRef<google.maps.Circle | null>(null);
  const lastCenterRef = useRef<{ lat: number; lng: number } | null>(null);

  const onMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const newLoc = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setLocation(newLoc);
    if (circleRef.current) circleRef.current.setCenter(newLoc);
  };

  const onRadiusChanged = () => {
    if (circleRef.current) {
      const newRadius = circleRef.current.getRadius();
      if (newRadius > 100) {
        circleRef.current.setRadius(100);
        setRadius(100);
      } else {
        setRadius(newRadius);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setTypedAddress(true);
    fetchPredictions(e.target.value);
  };

  const handleAddressChange = (addressId: number) => {
    setAddressId(addressId);
  };

  const fetchPredictions = (input: string) => {
    if (!input) return setPredictions([]);
    const service = new google.maps.places.AutocompleteService();
    service.getPlacePredictions({ input }, (preds) => {
      setPredictions(preds || []);
    });
  };

  const selectPrediction = (placeId: string) => {
    const service = new google.maps.places.PlacesService(
      document.createElement("div")
    );
    service.getDetails({ placeId }, (place, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && place) {
        setName(place.formatted_address || place.name || "");
        if (place.geometry?.location) {
          setLocation({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          });
        }
        setTypedAddress(false);
        setPredictions([]);
      }
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        id: zone.id,
        company_id: companyId,
        project_id: projectId,
        name,
        address: name,
        address_id: addressId,
        lat: location.lat,
        lng: location.lng,
        type: "circle",
        boundary: JSON.stringify({
          lat: location.lat,
          lng: location.lng,
          radius,
        }),
      };

      const res: AxiosResponse<any> = await api.put(
        "work-zone/update",
        payload
      );
      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        onSaved();
        // onCancel();
      }
    } catch (err) {
      console.error(err);
    }
    setIsSaving(false);
  };

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f9f9f9",
        p: 2,
        width: "100%",
        overflowX: "hidden",
      }}
    >
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          pr: 1,
        }}
      >
        <Box className="address-form">
          <Grid container mt={3}>
            <Grid size={{ lg: 12, xs: 12 }}>
              <Typography variant="h6" mb={2}>
                Edit Zone
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Address title</InputLabel>
                <Select
                  value={addressId || ""}
                  label="Select Address"
                  onChange={(e) => handleAddressChange(Number(e.target.value))}
                >
                  {addresses.map((a: any) => (
                    <MenuItem key={a.id} value={a.id}>
                      {a.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Search location"
                name="zoneAddress"
                value={name}
                onChange={handleInputChange}
                sx={{ mb: 2 }}
                placeholder="Search for address..."
              />

              {typedAddress && predictions.length > 0 && (
                <List
                  sx={{
                    border: "1px solid #ccc",
                    maxHeight: 200,
                    mb: 2,
                  }}
                >
                  {predictions.map((prediction) => (
                    <ListItem key={prediction.place_id} disablePadding>
                      <ListItemButton
                        onClick={() => selectPrediction(prediction.place_id)}
                      >
                        {prediction.description}
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}

              <Typography fontWeight={600}>
                Area size [{radius} Meter]
              </Typography>

              <Slider
                min={0}
                max={100}
                value={radius}
                onChange={(e, v) => setRadius(v as number)}
                sx={{ mb: 2, width: "99%" }}
              />

              <Box
                sx={{
                  height: 400,
                  overflow: "auto",
                  mb: 2,
                  mt: 2,
                }}
              >
                <GoogleMap
                  zoom={17}
                  center={location}
                  mapContainerStyle={{ width: "100%", height: "400px" }}
                >
                  <Marker
                    position={location}
                    draggable
                    onDragEnd={onMarkerDragEnd}
                  />
                  <GCircle
                    center={location}
                    radius={radius}
                    options={{
                      strokeColor: "#1976d2",
                      fillColor: "#1976d233",
                      editable: true,
                      draggable: true,
                    }}
                    onRadiusChanged={onRadiusChanged}
                    onLoad={(circle) => {
                      circleRef.current = circle;

                      circle.addListener("center_changed", () => {
                        const c = circle.getCenter();
                        if (!c) return;
                        if (circleRef.current) {
                          const newLoc = { lat: c.lat(), lng: c.lng() };
                          const newRadius = circleRef.current.getRadius();

                          if (newRadius > 100) {
                            circleRef.current.setRadius(100);
                            setRadius(100);
                          } else {
                            setRadius(newRadius);
                          }
                          if (
                            lastCenterRef.current &&
                            lastCenterRef.current.lat === newLoc.lat &&
                            lastCenterRef.current.lng === newLoc.lng
                          ) {
                            return;
                          }
                          lastCenterRef.current = newLoc;
                          setLocation(newLoc);
                        }
                      });
                    }}
                  />
                </GoogleMap>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          pt: 2,
          mb: 3,
          mt: "auto",
          borderTop: "1px solid #ddd",
          background: "#f9f9f9",
        }}
      >
        <Button
          color="primary"
          onClick={handleSave}
          variant="contained"
          size="large"
          disabled={isSaving}
          sx={{ borderRadius: 3 }}
        >
          {isSaving ? "Saving..." : "Save"}
        </Button>

        <Button
          color="inherit"
          onClick={onCancel}
          variant="contained"
          size="large"
          sx={{
            backgroundColor: "transparent",
            borderRadius: 3,
            color: "GrayText",
          }}
        >
          Cancel
        </Button>
      </Box>
    </Box>
  );
};
