"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Grid,
  Autocomplete,
  TextField,
  Button,
  List,
  ListItem,
  ListItemButton,
} from "@mui/material";
import { IconArrowLeft } from "@tabler/icons-react";
import CustomRangeSlider from "@/app/components/forms/theme-elements/CustomRangeSlider";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { GOOGLE_MAPS_SHARED_LOADER_OPTIONS } from "@/utils/googleMaps";
import {
  Circle,
  GoogleMap,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";

interface Boundary {
  lat: number;
  lng: number;
  radius: number;
}

type PostcoderAddress = {
  summaryline: string;
  addressline1: string;
  addressline2: string;
  posttown: string;
  postcode: string;
};

type GooglePrediction = google.maps.places.AutocompletePrediction;

type UnifiedPrediction =
  | ({ source: "google" } & GooglePrediction)
  | ({ source: "postcoder" } & PostcoderAddress);

interface CaseEditDrawerProps {
  open: boolean;
  onClose: () => void;
  selectedCase: any | null;
  projects: any[];
  onSave: () => void;
}

export default function CaseEditDrawer({
  open,
  onClose,
  selectedCase,
  projects,
  onSave,
}: CaseEditDrawerProps) {
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };

  const [formData, setFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [typedAddress, setTypedAddress] = useState(false);
  const [predictions, setPredictions] = useState<UnifiedPrediction[]>([]);
  const defaultRadius = 150;
  const circleRef = useRef<google.maps.Circle | null>(null);
  const lastCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastRadiusRef = useRef<number | null>(null);

  const isIEPostcode = (value: string) =>
    /^(D6W|[AC-FHKNPRTV-Y]\d{2})\s?[A-Z0-9]{4}$/i.test(value.trim());
  const isAUPostcode = (value: string) => /^\d{4}$/.test(value.trim());
  const isNZPostcode = (value: string) => /^\d{4}$/.test(value.trim());

  useEffect(() => {
    if (open && selectedCase) {
      setFormData({
        ...selectedCase,
        project_id: selectedCase.project_id || null,
        radius: selectedCase.radius || defaultRadius,
        color: selectedCase.color || "#FF0000",
      });

      if (selectedCase.latitude && selectedCase.longitude) {
        const parsedLat = Number(selectedCase.latitude);
        const parsedLng = Number(selectedCase.longitude);
        if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
          setSelectedLocation({
            lat: parsedLat,
            lng: parsedLng,
          });
        } else {
          setSelectedLocation(null);
        }
      } else {
        setSelectedLocation(null);
      }
      setPredictions([]);
      setTypedAddress(false);
    }
  }, [open, selectedCase]);

  const { isLoaded } = useJsApiLoader({
    ...GOOGLE_MAPS_SHARED_LOADER_OPTIONS,
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, name: e.target.value });
  };

  const handleSearchClick = async () => {
    const query = formData.name?.trim();
    if (!query) {
      setPredictions([]);
      return;
    }

    setTypedAddress(true);

    try {
      let country = "UK";
      if (isIEPostcode(query)) country = "IE";
      else if (isAUPostcode(query)) country = "AU";
      else if (isNZPostcode(query)) country = "NZ";

      const res = await fetch(
        `https://ws.postcoder.com/pcw/${process.env.NEXT_PUBLIC_POSTCODER_KEY}/address/${country}/${encodeURIComponent(
          query,
        )}?format=json`,
      );
      const data = await res.json();
      setPredictions(data || []);
      return;
    } catch (err) {
      console.error("Postcoder failed, falling back to Google", err);
    }

    const service = new google.maps.places.AutocompleteService();
    service.getPlacePredictions({ input: query }, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        setPredictions(
          results.map((r) => ({
            ...r,
            source: "google",
          })) as UnifiedPrediction[],
        );
      } else {
        setPredictions([]);
      }
    });
  };

  const selectGooglePrediction = (
    item: { source: "google" } & google.maps.places.AutocompletePrediction,
  ) => {
    const service = new google.maps.places.PlacesService(
      document.createElement("div"),
    );
    service.getDetails({ placeId: item.place_id }, (place, status) => {
      if (
        status === google.maps.places.PlacesServiceStatus.OK &&
        place?.geometry?.location
      ) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const boundary: Boundary = {
          lat,
          lng,
          radius: formData.radius ?? defaultRadius,
        };

        setFormData((prev: any) => ({
          ...prev,
          name: place.formatted_address || "",
          lat,
          lng,
          boundary: JSON.stringify(boundary),
        }));

        setSelectedLocation({ lat, lng });
        setPredictions([]);
      }
    });
  };

  const selectPostcoderPrediction = (
    item: { source: "postcoder" } & PostcoderAddress,
  ) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode(
      { address: `${item.summaryline}, ${item.postcode}` },
      (results, status) => {
        if (status === "OK" && results?.[0]?.geometry?.location) {
          const lat = results[0].geometry.location.lat();
          const lng = results[0].geometry.location.lng();
          const boundary: Boundary = {
            lat,
            lng,
            radius: formData.radius ?? defaultRadius,
          };

          setFormData((prev: any) => ({
            ...prev,
            name: item.summaryline,
            lat,
            lng,
            boundary: JSON.stringify(boundary),
          }));

          setSelectedLocation({ lat, lng });
          setPredictions([]);
        }
      },
    );
  };

  const handleRadiusChange = (event: Event, newValue: number | number[]) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    if (!selectedLocation) return;
    const newBoundary: Boundary = {
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      radius: value,
    };
    setFormData((prev: any) => ({
      ...prev,
      radius: value,
      boundary: JSON.stringify(newBoundary),
    }));
  };

  const handleAddressEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let payload = {
        id: selectedCase.id,
        lat: formData.lat,
        lng: formData.lng,
        ...formData,
        type: "circle",
      };

      if (!payload.boundary && selectedLocation) {
        payload.boundary = JSON.stringify({
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
          radius: formData.radius,
        });
      }

      const result = await api.put("address/update", payload);
      if (result.data.IsSuccess === true) {
        toast.success(result.data.message);
        onSave();
        onClose();
      } else {
      }
    } catch (error) {
      console.error("Error updating address:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
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
          <form onSubmit={handleAddressEdit} className="address-form">
            <Grid container>
              <Grid size={{ xs: 12 }}>
                <Box
                  display={"flex"}
                  alignContent={"center"}
                  alignItems={"center"}
                  flexWrap={"wrap"}
                >
                  <IconButton onClick={() => onClose()}>
                    <IconArrowLeft />
                  </IconButton>
                  <Typography variant="h6" color="inherit" fontWeight={700}>
                    Case Detail
                  </Typography>
                </Box>

                <Box mb={2} mt={2}>
                  <Autocomplete
                    fullWidth
                    disabled
                    options={projects || []}
                    value={
                      (projects || []).find(
                        (p: any) => p.id === formData.project_id,
                      ) || null
                    }
                    onChange={(e, newVal: any) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        project_id: newVal ? newVal.id : null,
                      }))
                    }
                    getOptionLabel={(option: any) => option.name}
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

                <Box display={"flex"} justifyContent={"space-between"} gap={3}>
                  <TextField
                    label="Address"
                    id="name"
                    name="name"
                    placeholder="Search for address.."
                    value={formData.name}
                    disabled
                    onChange={handleInputChange}
                    variant="outlined"
                    fullWidth
                  />

                  {/* <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSearchClick}
                  >
                    Search
                  </Button> */}
                </Box>
                <Box mt={2}>
                  <CustomTextField
                    fullWidth
                    disabled
                    label="Reference"
                    value={formData.ref || ""}
                    onChange={(e: any) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        ref: e.target.value,
                      }))
                    }
                  />
                </Box>
                {typedAddress && predictions.length > 0 && (
                  <List
                    sx={{
                      border: "1px solid #ccc",
                      maxHeight: 200,
                      overflow: "auto",
                      mt: 1,
                    }}
                  >
                    {predictions.map((item, index) => (
                      <ListItem key={index} disablePadding>
                        <ListItemButton
                          onClick={() =>
                            item.source === "google"
                              ? selectGooglePrediction(item)
                              : selectPostcoderPrediction(item)
                          }
                        >
                          {item.source === "google"
                            ? item.description
                            : item.summaryline}
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                )}

                {selectedLocation && (
                  <Box
                    sx={{ marginTop: 3 }}
                    width={"98%"}
                    className="slider_wrapper"
                  >
                    {/* <Typography variant="h6">
                      Area size [{formData?.radius} Meter]
                    </Typography>
                    <CustomRangeSlider
                      value={formData?.radius || 0}
                      onChange={handleRadiusChange}
                      min={0}
                      max={100}
                      step={1}
                      sx={{ height: "1px" }}
                    /> */}

                    <GoogleMap
                      zoom={17}
                      center={selectedLocation}
                      mapContainerStyle={{
                        width: "100%",
                        height: "400px",
                        marginTop: "20px",
                      }}
                      options={{
                        draggable: false,
                        scrollwheel: false,
                        disableDoubleClickZoom: true,
                        zoomControl: false,
                        streetViewControl: false,
                        mapTypeControl: false,
                        fullscreenControl: false,
                        keyboardShortcuts: false,
                      }}
                    >
                      <Marker position={selectedLocation} draggable={false} />

                      <Circle
                        center={selectedLocation}
                        radius={formData.radius}
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
                    {/* <Box mt={2}>
                      <Typography>Zone Color</Typography>
                      <input
                        type="color"
                        disabled
                        value={formData.color || "#000000"}
                        onChange={(e) =>
                          setFormData({ ...formData, color: e.target.value })
                        }
                        style={{
                          width: "100%",
                          height: "40px",
                          border: "none",
                        }}
                      />
                    </Box> */}
                  </Box>
                )}
              </Grid>
            </Grid>

            {/* <Box
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
                onClick={() => onClose()}
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
            </Box> */}
          </form>
        </Box>
      </Box>
    </Drawer>
  );
}
