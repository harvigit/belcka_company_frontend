"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Drawer,
  Grid,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import { IconArrowLeft } from "@tabler/icons-react";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import { GOOGLE_MAPS_SHARED_LOADER_OPTIONS } from "@/utils/googleMaps";
import {
  Circle,
  GoogleMap,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";

interface CaseAddDrawerProps {
  open: boolean;
  onClose: () => void;
  projects: any[];
  parentAddresses: any[];
  companyId?: number | null;
  cases?: any[];
  onSave: () => void;
}

const defaultRadius = 200;

export default function CaseAddDrawer({
  open,
  onClose,
  projects,
  parentAddresses,
  companyId,
  cases = [],
  onSave,
}: CaseAddDrawerProps) {
  const [formData, setFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded } = useJsApiLoader({
    ...GOOGLE_MAPS_SHARED_LOADER_OPTIONS,
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        project_id: null,
        parent_address_id: null,
        company_id: companyId ?? null,
        name: "",
        radius: defaultRadius,
        color: "#FF0000",
        lat: null,
        lng: null,
      });
      setSelectedLocation(null);
      setIsSaving(false);
    }
  }, [open, companyId]);

  useEffect(() => {
    if (mapRef.current && circleRef.current) {
      const bounds = circleRef.current.getBounds();
      if (bounds) {
        mapRef.current.fitBounds(bounds);
      }
    }
  }, [formData.radius, selectedLocation]);

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.project_id) {
      toast.error("Please select a project.");
      return;
    }
    if (!formData.parent_address_id || !formData.name) {
      toast.error("Please select an address.");
      return;
    }
    if (!selectedLocation && (formData.lat == null || formData.lng == null)) {
      toast.error("Please select a valid location on the map.");
      return;
    }

    setIsSaving(true);
    try {
      let payload: any = {
        ...formData,
        type: "circle",
      };
      if (!payload.boundary && selectedLocation) {
        payload.boundary = JSON.stringify({
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
          radius: formData.radius ?? defaultRadius,
        });
      }

      const result = await api.post("address/create", payload);
      if (result.data.IsSuccess === true) {
        toast.success(result.data.message);
        handleClose();
        onSave();
      }
    } catch (error) {
      console.error("Error creating address:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleParentAddressChange = async (_e: any, newVal: any) => {
    if (!newVal) {
      setFormData((prev: any) => ({
        ...prev,
        parent_address_id: null,
        name: "",
        lat: null,
        lng: null,
      }));
      setSelectedLocation(null);
      return;
    }

    let newLat: any = undefined;
    let newLng: any = undefined;
    const currentProject = projects?.find(
      (p: any) => p.id === Number(formData.project_id),
    );
    let newRadius = currentProject?.radius ?? defaultRadius;
    let newColor: string | undefined = undefined;
    let newName = "";

    const existingCases = (cases || []).filter(
      (c: any) => c.parent_address_id === newVal.id,
    );

    if (existingCases && existingCases.length > 0) {
      const firstCase = existingCases[0];
      newName = firstCase.parent_addresses_name || newVal.name || "";
      newLat = firstCase.lat || firstCase.latitude;
      newLng = firstCase.lng || firstCase.longitude;
      newRadius = firstCase.radius || defaultRadius;
      newColor = firstCase.color;
    } else if (newVal.lat && newVal.lng) {
      newLat = newVal.lat;
      newLng = newVal.lng;
      newName = newVal.name || "";
    } else {
      const query = `${newVal.name ?? ""} ${newVal.pin_code ?? ""}`.trim();
      newName = newVal.name || "";
      if (query && window.google) {
        try {
          const geocoder = new window.google.maps.Geocoder();
          const results = await new Promise<any>((resolve, reject) => {
            geocoder.geocode({ address: query }, (res, status) => {
              if (status === "OK") resolve(res);
              else reject(status);
            });
          });
          if (results?.[0]?.geometry?.location) {
            newLat = results[0].geometry.location.lat();
            newLng = results[0].geometry.location.lng();
          }
        } catch (err) {
          console.error("Geocoding failed", err);
        }
      }
    }

    setFormData((prev: any) => ({
      ...prev,
      parent_address_id: newVal.id,
      name: newName,
      radius: newRadius,
      lat: newLat !== undefined ? newLat : null,
      lng: newLng !== undefined ? newLng : null,
      ...(newColor ? { color: newColor } : {}),
    }));

    if (
      newLat !== undefined &&
      newLng !== undefined &&
      newLat !== null &&
      newLng !== null
    ) {
      setSelectedLocation({
        lat: parseFloat(String(newLat)),
        lng: parseFloat(String(newLng)),
      });
    } else {
      setSelectedLocation(null);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      sx={{
        width: 500,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: 500,
          padding: 2,
          backgroundColor: "#f9f9f9",
        },
      }}
    >
      <Box display="flex" flexDirection="column" height="100%">
        <Box height={"100%"}>
          <form onSubmit={handleSubmit} className="address-form">
            <Grid container>
              <Grid size={{ xs: 12 }}>
                <Box
                  display={"flex"}
                  alignContent={"center"}
                  alignItems={"center"}
                  flexWrap={"wrap"}
                >
                  <IconButton onClick={handleClose}>
                    <IconArrowLeft />
                  </IconButton>
                  <Typography variant="h6" color="inherit" fontWeight={700}>
                    Add Case
                  </Typography>
                </Box>

                <Box mb={2} mt={2}>
                  <Autocomplete
                    fullWidth
                    options={projects || []}
                    value={
                      (projects || []).find(
                        (p: any) => p.id === formData.project_id,
                      ) || null
                    }
                    onChange={(_e, newVal: any) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        project_id: newVal ? newVal.id : null,
                        ...(newVal?.radius != null
                          ? { radius: newVal.radius }
                          : {}),
                        ...(newVal?.color ? { color: newVal.color } : {}),
                      }))
                    }
                    getOptionLabel={(option: any) => option.name || ""}
                    isOptionEqualToValue={(option: any, value: any) =>
                      option.id === value.id
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Project"
                        placeholder="Project"
                      />
                    )}
                  />
                </Box>

                <Box mb={2} mt={2}>
                  <Autocomplete
                    fullWidth
                    options={
                      parentAddresses.filter((item) => !item.is_conflict) || []
                    }
                    value={
                      parentAddresses
                        ?.filter((item) => !item.is_conflict)
                        .find(
                          (p: any) => p.id === formData.parent_address_id,
                        ) || null
                    }
                    onChange={handleParentAddressChange}
                    getOptionLabel={(option: any) => option.name || ""}
                    isOptionEqualToValue={(option: any, value: any) =>
                      option.id === value?.id
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Address"
                        placeholder="Address"
                      />
                    )}
                  />
                </Box>

                {isLoaded && selectedLocation && (
                  <Box
                    sx={{ marginTop: 3 }}
                    width={"98%"}
                    className="slider_wrapper"
                  >
                    <GoogleMap
                      zoom={17}
                      center={selectedLocation}
                      onLoad={(map) => {
                        mapRef.current = map;
                      }}
                      mapContainerStyle={{
                        width: "100%",
                        height: "400px",
                        marginTop: "20px",
                      }}
                    >
                      <Marker position={selectedLocation} />

                      <Circle
                        center={selectedLocation}
                        radius={formData.radius}
                        onLoad={(circle) => {
                          circleRef.current = circle;
                          if (mapRef.current) {
                            const bounds = circle.getBounds();
                            if (bounds) {
                              mapRef.current.fitBounds(bounds);
                            }
                          }
                        }}
                        options={{
                          draggable: false,
                          editable: false,
                          clickable: false,
                          fillColor: formData.color ?? "#FF0000",
                          fillOpacity: 0.3,
                          strokeColor: formData.color ?? "#FF0000",
                          strokeOpacity: 1,
                          strokeWeight: 1,
                        }}
                      />
                    </GoogleMap>
                  </Box>
                )}
              </Grid>
            </Grid>

            <Box
              sx={{
                display: "flex",
                justifyContent: "start",
                gap: 2,
                marginTop: 3,
              }}
            >
              <Button
                color="primary"
                variant="contained"
                size="large"
                type="submit"
                sx={{ borderRadius: 3 }}
                className="drawer_buttons"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button
                color="inherit"
                onClick={handleClose}
                variant="contained"
                size="large"
                sx={{
                  backgroundColor: "transparent",
                  borderRadius: 3,
                  color: "GrayText",
                }}
              >
                Close
              </Button>
            </Box>
          </form>
        </Box>
      </Box>
    </Drawer>
  );
}
