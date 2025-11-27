"use client";

import React, { useEffect, useRef, useState } from "react";
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
} from "@mui/material";

import {
  GoogleMap,
  useJsApiLoader,
  Polygon,
  Circle,
  Marker,
} from "@react-google-maps/api";
import { Circle as GCircle } from "@react-google-maps/api";
import { IconEye, IconTrash, IconX, IconEdit } from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";

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

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [addZoneOpen, setAddZoneOpen] = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
    libraries: GOOGLE_MAP_LIBRARIES as any,
  });

  useEffect(() => {
    if (projectId) {
      fetchProjectDetail();
    }
  }, [projectId]);

  const fetchProjectDetail = async () => {
    try {
      const res = await api.get("address/zones", {
        params: { project_id: projectId },
      });

      const fences = res.data.info?.zones ?? [];
      setGeofences(fences);
    } catch (err) {
      console.error("Geofence fetch error:", err);
    }
  };

  // Delete zone
  const handleDeleteZone = async () => {
    if (!deleteId) return;

    try {
      const res = await api.delete(`work-zone/delete?id=${deleteId}`);

      if (res.data.IsSuccess) {
        toast.success("Zone deleted");
        setGeofences((prev) => prev.filter((z) => z.id !== deleteId));
        setDeleteConfirmOpen(false);
        setDeleteId(null);
        fetchProjectDetail();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Box p={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" fontWeight={700}>
          Address Zones
        </Typography>

        <Box>
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

      <Box display="flex" gap={2} mt={2} height="calc(100vh - 100px)" mb={3}>
        <Box width="35%" overflow="auto" maxHeight="100%" mb={5}>
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
                {geofences.map((z) => (
                  <TableRow key={z.id}>
                    <TableCell>
                      <Box>
                        <Typography>{z.name}</Typography>
                        <Typography
                          color="textSecondary"
                          variant="h5"
                          fontSize={"14px !important"}
                          mb={0}
                        >
                          {z.address_name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display={"flex"}>
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

                {geofences.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      align="center"
                      sx={{ py: 4, color: "gray" }}
                    >
                      No zones are found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </Box>

        <Box
          width="65%"
          display="flex"
          flexDirection="column"
          maxHeight="100%"
          overflow="auto"
        >
          {!selected && (
            <Paper sx={{ p: 4, textAlign: "center", flexShrink: 0 }}>
              <Typography color="gray">
                Select a zone to view or edit.
              </Typography>
            </Paper>
          )}

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
              onSaved={fetchProjectDetail}
              onCancel={() => setSelected(null)}
              projectId={projectId}
              companyId={companyId}
            />
          )}
        </Box>
      </Box>

      {/* delete zone */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>
          <Typography>Delete Zone</Typography>
          <IconButton
            onClick={() => setDeleteConfirmOpen(false)}
            sx={{
              position: "absolute",
              right: 12,
              top: 8,
            }}
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

      {addZoneOpen && (
        <Dialog
          open={addZoneOpen}
          onClose={() => setAddZoneOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogContent>
            <AddZone
              projectId={projectId}
              companyId={companyId}
              onAdded={() => {
                fetchProjectDetail();
                setAddZoneOpen(false);
              }}
              onCancel={() => setAddZoneOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
}

// VIEW ZONE MAP
const ViewZoneMap = ({ zone, isLoaded }: any) => {
  if (!isLoaded) return <p>Loading map...</p>;

  const center = {
    lat: Number(zone.latitude),
    lng: Number(zone.longitude),
  };

  return (
    <Paper sx={{ height: 500 }}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        zoom={17}
        center={center}
      >
        <Marker
          position={center}
          label={{
            text: zone.name ? zone.name : " ",
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
              fillColor: (zone.color || "#1976d2") + "33",
            }}
          />
        )}

        {zone.type === "polygon" && (
          <Polygon
            paths={zone.coordinates}
            options={{
              strokeColor: zone.color,
              fillColor: zone.color + "33",
            }}
          />
        )}
      </GoogleMap>
    </Paper>
  );
};

// ADD ZONE COMPONENT
const AddZone = ({ onAdded, onCancel, projectId, companyId }: any) => {
  const [addresses, setAddresses] = useState<any[]>([]);

  const [addressId, setAddressId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [radius, setRadius] = useState(50);

  const [location, setLocation] = useState({ lat: 51.509865, lng: -0.118092 });

  const mapRef = useRef<google.maps.Map | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);

  const [typedAddress, setTypedAddress] = useState(false);
  const [predictions, setPredictions] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);

  // Fetch Address List
  useEffect(() => {
    if (projectId) loadAddressList();
  }, [projectId]);

  const loadAddressList = async () => {
    try {
      const res = await api.get("address/get", {
        params: { project_id: projectId },
      });

      setAddresses(res.data.info || []);
    } catch (err) {
      console.error("Error fetching address list:", err);
    }
  };

  // When Address dropdown selected
  const handleAddressChange = (id: number) => {
    setAddressId(id);

    const addr = addresses.find((a) => a.id === id);
    if (addr) {
      setLocation({
        lat: Number(addr.latitude),
        lng: Number(addr.longitude),
      });
      setRadius(addr.radius || 50);
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
      { input, types: ["geocode"] },
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

      const res = await api.post("work-zone/create", payload);
      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        onAdded();
        onCancel();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box>
      <Box
        display={"flex"}
        justifyContent={"space-between"}
        alignItems={"center"}
      >
        <Typography variant="h6" mb={2}>
          Add Zone
        </Typography>
        <IconButton onClick={onCancel} sx={{ mb: 1 }}>
          <IconX />
        </IconButton>
      </Box>
      {/* Address Dropdown */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Select Address</InputLabel>
        <Select
          value={addressId || ""}
          label="Select Address"
          onChange={(e) => handleAddressChange(Number(e.target.value))}
        >
          {addresses.map((a) => (
            <MenuItem key={a.id} value={a.id}>
              {a.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Address Search Box */}
      <TextField
        fullWidth
        label="Enter location"
        value={name}
        onChange={handleInputChange}
        placeholder="Search location..."
        sx={{ mb: 2 }}
      />

      {typedAddress && predictions.length > 0 && (
        <List
          sx={{ border: "1px solid #ccc", maxHeight: 200, overflow: "auto" }}
        >
          {predictions.map((p) => (
            <ListItem key={p.place_id} disablePadding>
              <ListItemButton onClick={() => selectPrediction(p.place_id)}>
                {p.description}
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}

      <Typography fontWeight={600}>Area Radius [{radius} Meter]</Typography>
      <Slider
        min={0}
        max={100}
        value={radius}
        onChange={(e, v) => setRadius(v as number)}
        sx={{ mb: 2 }}
      />

      <Box height={400} mt={2}>
        <GoogleMap
          zoom={17}
          center={location}
          mapContainerStyle={{ width: "100%", height: "400px" }}
          onLoad={(map) => {
            mapRef.current = map;
          }}
        >
          <Marker position={location} draggable onDragEnd={onMarkerDragEnd} />

          <GCircle
            center={location}
            radius={radius}
            editable
            draggable
            options={{
              strokeColor: "#1976d2",
              fillColor: "#1976d233",
            }}
            onLoad={(circle) => (circleRef.current = circle)}
            onRadiusChanged={onRadiusChanged}
            onDragEnd={onMarkerDragEnd}
          />
        </GoogleMap>
      </Box>

      <Box display="flex" gap={2} mt={2}>
        <Button variant="contained" onClick={handleSave}>
          Add
        </Button>
        <Button variant="outlined" onClick={onCancel}>
          Cancel
        </Button>
      </Box>
    </Box>
  );
};

type EditZoneProps = {
  zone: any;
  onSaved: () => void;
  onCancel: () => void;
  projectId: number | null;
  companyId: number | null;
};

const EditZone = ({
  zone,
  onSaved,
  onCancel,
  projectId,
  companyId,
}: EditZoneProps) => {
  const [name, setName] = useState(zone.name);
  const [radius, setRadius] = useState(Number(zone.radius));
  const [location, setLocation] = useState({
    lat: Number(zone.latitude),
    lng: Number(zone.longitude),
  });

  const circleRef = useRef<google.maps.Circle | null>(null);

  const [typedAddress, setTypedAddress] = useState(false);
  const [predictions, setPredictions] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);

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

  // const onCircleCenterChanged = () => {
  //   const newCenter = circleRef?.current?.getCenter();

  //   if (newCenter) {
  //     setLocation({ lat: newCenter.lat(), lng: newCenter.lng() });
  //   }
  // };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setTypedAddress(true);
    fetchPredictions(e.target.value);
  };

  const fetchPredictions = (input: string) => {
    if (!input) return setPredictions([]);
    const service = new google.maps.places.AutocompleteService();
    service.getPlacePredictions({ input, types: ["geocode"] }, (preds) => {
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

  // --- Save changes ---
  const handleSave = async () => {
    try {
      const payload = {
        id: zone.id,
        company_id: companyId,
        project_id: projectId,
        name,
        address: name,
        lat: location.lat,
        lng: location.lng,
        type: "circle",
        boundary: JSON.stringify({
          lat: location.lat,
          lng: location.lng,
          radius,
        }),
      };

      const res = await api.put("work-zone/update", payload);
      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        onSaved();
        // onCancel();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box width={"99%"} mb={5}>
      <Typography variant="h6" mb={2}>
        Edit Zone
      </Typography>

      {/* Google-style searchable input */}
      <TextField
        fullWidth
        label="Zone Name"
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
            overflow: "auto",
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

      <Typography fontWeight={600}>Area size [{radius} Meter]</Typography>
      <Slider
        min={0}
        max={100}
        value={radius}
        onChange={(e, v) => setRadius(v as number)}
        sx={{ mb: 2 }}
      />

      <Box height={400} mt={2}>
        <GoogleMap
          zoom={17}
          center={location}
          mapContainerStyle={{ width: "100%", height: "400px" }}
        >
          <Marker position={location} draggable onDragEnd={onMarkerDragEnd} />
          <GCircle
            center={location}
            radius={radius}
            editable
            draggable
            options={{
              strokeColor: "#1976d2",
              fillColor: "#1976d233",
            }}
            onLoad={(circle) => (circleRef.current = circle)}
            onRadiusChanged={onRadiusChanged}
            onDragEnd={onMarkerDragEnd}
          />
        </GoogleMap>
      </Box>

      <Box display="flex" gap={2} mt={2}>
        <Button variant="contained" onClick={handleSave}>
          Save
        </Button>
        <Button variant="outlined" onClick={onCancel}>
          Cancel
        </Button>
      </Box>
    </Box>
  );
};
