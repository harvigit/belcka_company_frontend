"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Drawer,
  FormControlLabel,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  TextField,
  Typography,
} from "@mui/material";
import { IconArrowLeft, IconX } from "@tabler/icons-react";
import { useJsApiLoader } from "@react-google-maps/api";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import { GOOGLE_MAPS_SHARED_LOADER_OPTIONS } from "@/utils/googleMaps";
import ParentAddressAreaMap from "./parent-address-area-map";

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

type ParentAddressFormDrawerProps = {
  open: boolean;
  onClose: () => void;
  companyId?: number | null;
  address?: any | null;
  onSaved: () => void;
};

const isIEPostcode = (value: string) =>
  /^(D6W|[AC-FHKNPRTV-Y]\d{2})\s?[A-Z0-9]{4}$/i.test(value.trim());
const isAUPostcode = (value: string) => /^\d{4}$/.test(value.trim());
const isNZPostcode = (value: string) => /^\d{4}$/.test(value.trim());

const ParentAddressFormDrawer: React.FC<ParentAddressFormDrawerProps> = ({
  open,
  onClose,
  companyId,
  address,
  onSaved,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [postcode, setPostcode] = useState("");
  const [type, setType] = useState("address");
  const [radius, setRadius] = useState(200);
  const [maxRadius, setMaxRadius] = useState(200);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [predictions, setPredictions] = useState<UnifiedPrediction[]>([]);
  const [typedAddress, setTypedAddress] = useState(false);
  const lastRadiusRef = useRef<number>(200);

  const { isLoaded } = useJsApiLoader({
    ...GOOGLE_MAPS_SHARED_LOADER_OPTIONS,
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
  });

  useEffect(() => {
    const fetchGeneralSettings = async () => {
      try {
        const res = await api.get("setting/general-settings");
        if (
          res.data?.IsSuccess &&
          res.data.data?.location_radius !== undefined
        ) {
          setMaxRadius(res.data.data.location_radius);
        }
      } catch (err) {
        console.error("Failed to fetch general settings", err);
      }
    };
    fetchGeneralSettings();
  }, []);

  const hydrateFromAddress = useCallback(
    (item?: any | null) => {
      setPredictions([]);
      setTypedAddress(false);
      setIsSaving(false);

      if (item && item.id) {
        const addrName = item.name || "";
        const addrShortName = item.short_name || "";
        const addrPincode = item.pincode || item.pin_code || "";
        const addrType = item.type || "address";
        setName(addrName);
        setShortName(addrShortName);
        setPostcode(addrPincode);
        setType(addrType);

        let boundaryData: any = null;
        if (item.boundary) {
          try {
            boundaryData =
              typeof item.boundary === "string"
                ? JSON.parse(item.boundary)
                : item.boundary;
          } catch {
            boundaryData = null;
          }
        }

        const rawLat = item.lat ?? item.latitude ?? boundaryData?.lat;
        const rawLng = item.lng ?? item.longitude ?? boundaryData?.lng;
        const lat = Number(rawLat);
        const lng = Number(rawLng);
        const hasCoords =
          rawLat != null &&
          rawLat !== "" &&
          rawLng != null &&
          rawLng !== "" &&
          Number.isFinite(lat) &&
          Number.isFinite(lng);

        let nextRadius = Number(item.radius ?? boundaryData?.radius);
        if (!Number.isFinite(nextRadius) || nextRadius <= 0) {
          nextRadius = maxRadius || 200;
        } else {
          nextRadius = Math.round(nextRadius);
        }
        setRadius(nextRadius);
        lastRadiusRef.current = nextRadius;

        if (hasCoords) {
          setSelectedLocation({ lat, lng });
        } else if (window.google && (addrName || addrPincode)) {
          setSelectedLocation(null);
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode(
            { address: `${addrName}, ${addrPincode}` },
            (results, status) => {
              if (status === "OK" && results?.[0]?.geometry?.location) {
                setSelectedLocation({
                  lat: results[0].geometry.location.lat(),
                  lng: results[0].geometry.location.lng(),
                });
              } else {
                setSelectedLocation(null);
              }
            },
          );
        } else {
          setSelectedLocation(null);
        }
        return;
      }

      setName("");
      setShortName("");
      setPostcode("");
      setType("address");
      setSelectedLocation(null);
      setRadius(maxRadius || 200);
      lastRadiusRef.current = maxRadius || 200;
    },
    [maxRadius],
  );

  useEffect(() => {
    if (open) hydrateFromAddress(address);
  }, [open, address, hydrateFromAddress]);

  const handleSearchClick = async () => {
    const query = name.trim();
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
        `https://ws.postcoder.com/pcw/${
          process.env.NEXT_PUBLIC_POSTCODER_KEY
        }/address/${country}/${encodeURIComponent(query)}?format=json`,
      );
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("json")) {
        const data = await res.json();
        setPredictions(data || []);
        return;
      }
    } catch (err) {
      console.error("Postcoder failed, falling back to Google", err);
    }

    const service = new google.maps.places.AutocompleteService();
    service.getPlacePredictions({ input: query }, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        setPredictions(results.map((r) => ({ ...r, source: "google" })));
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
        let nextPostcode = "";
        place.address_components?.forEach((component) => {
          if (component.types.includes("postal_code")) {
            nextPostcode = component.long_name;
          }
        });
        setName(place.formatted_address || "");
        setPostcode(nextPostcode);
        setSelectedLocation({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
        setPredictions([]);
      }
    });
  };

  const applyLocationFromMap = useCallback((lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    if (!window.google) {
      toast.error("Address and Post Code are still required");
      return;
    }
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        const place = results[0];
        let nextPostcode = "";
        place.address_components?.forEach((component) => {
          if (component.types.includes("postal_code")) {
            nextPostcode = component.long_name;
          }
        });
        setName(place.formatted_address || "");
        setPostcode(nextPostcode);
        return;
      }
      toast.error("Address and Post Code are still required");
    });
  }, []);

  const selectPostcoderPrediction = (
    item: { source: "postcoder" } & PostcoderAddress,
  ) => {
    setName(item.summaryline);
    setPostcode(item.postcode || "");
    if (window.google) {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode(
        { address: `${item.summaryline}, ${item.postcode}` },
        (results, status) => {
          if (status === "OK" && results?.[0]?.geometry?.location) {
            setSelectedLocation({
              lat: results[0].geometry.location.lat(),
              lng: results[0].geometry.location.lng(),
            });
          }
        },
      );
    }
    setPredictions([]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.error("Address name is required");
      return;
    }
    if (!postcode) {
      toast.error("Post Code is required");
      return;
    }

    setIsSaving(true);
    try {
      let boundaryData: any = null;
      if (selectedLocation) {
        boundaryData = JSON.stringify({
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
          radius: Number.isFinite(lastRadiusRef.current)
            ? lastRadiusRef.current
            : radius,
        });
      }

      const payload = {
        company_id: companyId,
        name,
        short_name: shortName,
        pin_code: postcode,
        type,
        latitude: selectedLocation?.lat,
        longitude: selectedLocation?.lng,
        boundary: boundaryData,
      };

      const res = address
        ? await api.put("address/parent-update", { ...payload, id: address.id })
        : await api.post("address/parent-create", payload);

      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        onSaved();
        onClose();
      }
    } catch (err) {
      console.error(err);
    }
    setIsSaving(false);
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: 0,
          height: "92vh",
          boxShadow: "none",
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#fff",
        },
      }}
    >
      <Box display="flex" flexDirection="column" height="100%">
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          flexShrink={0}
          px={{ xs: 2, md: 3 }}
          py={1.5}
          sx={{ borderBottom: "1px solid #eef2f7" }}
        >
          <Box display={"flex"} alignItems={"center"}>
            <IconButton onClick={onClose}>
              <IconArrowLeft />
            </IconButton>
            <Typography variant="h6" fontWeight={700}>
              {address ? "Edit Address" : "Add Address"}
            </Typography>
          </Box>
          <IconButton onClick={onClose}>
            <IconX />
          </IconButton>
        </Box>
        <form
          onSubmit={handleSave}
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          className="category-form"
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          }}
        >
          <Box
            className="form_inputs"
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              px: { xs: 2, md: 3 },
              py: 2,
            }}
          >
            <Grid container spacing={2} sx={{ width: "100%", m: 0 }}>
              <Grid size={{ xs: 12, md: 5 }}>
                <Typography variant="subtitle2" mb={1}>
                  Name
                </Typography>
                <TextField
                  placeholder="Name.."
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  variant="outlined"
                  fullWidth
                  inputProps={{ style: { textAlign: "left" } }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 7 }}>
                <Typography variant="subtitle2" mb={1}>
                  Address
                </Typography>
                <Box display={"flex"} justifyContent={"space-between"} gap={2}>
                  <TextField
                    placeholder="Search for address.."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    variant="outlined"
                    fullWidth
                    inputProps={{ style: { textAlign: "left" } }}
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSearchClick}
                    sx={{ flexShrink: 0, minHeight: 40, px: 3 }}
                  >
                    Search
                  </Button>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Post Code: {postcode || "-"}
                </Typography>
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
              </Grid>
              <Grid
                size={{ xs: 12 }}
                display="flex"
                alignItems="center"
                sx={{ mt: -0.5 }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={type === "location"}
                      onChange={(e) =>
                        setType(e.target.checked ? "location" : "address")
                      }
                    />
                  }
                  label="Location"
                />
              </Grid>
              <Grid size={{ xs: 12 }} sx={{ minWidth: 0 }}>
                <ParentAddressAreaMap
                  key={address?.id ?? "new"}
                  isLoaded={isLoaded}
                  selectedLocation={selectedLocation}
                  radius={radius}
                  maxRadius={maxRadius}
                  onSelectLocation={applyLocationFromMap}
                  onRadiusCommit={(nextRadius) => {
                    lastRadiusRef.current = nextRadius;
                    setRadius(nextRadius);
                  }}
                  lastRadiusRef={lastRadiusRef}
                />
              </Grid>
            </Grid>
          </Box>
          <Box
            display="flex"
            justifyContent="flex-start"
            alignItems="center"
            gap={2}
            flexShrink={0}
            sx={{
              borderTop: "1px solid #eee",
              backgroundColor: "#fff",
              zIndex: 2,
              px: { xs: 2, md: 3 },
              py: 1.5,
            }}
          >
            <Button
              color="primary"
              variant="contained"
              size="large"
              type="submit"
              disabled={isSaving}
              sx={{ borderRadius: 3, minWidth: 120, px: 4 }}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <Button
              color="inherit"
              onClick={onClose}
              variant="contained"
              size="large"
              sx={{
                backgroundColor: "transparent",
                borderRadius: 3,
                color: "GrayText",
                minWidth: 100,
              }}
            >
              Cancel
            </Button>
          </Box>
        </form>
      </Box>
    </Drawer>
  );
};

export default ParentAddressFormDrawer;
