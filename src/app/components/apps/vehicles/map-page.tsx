"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  ButtonBase,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { GoogleMap, InfoWindow, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { GOOGLE_MAPS_SHARED_LOADER_OPTIONS } from "@/utils/googleMaps";
import FleetNav from "./fleet-nav";
import { DriverName, NoCompany, RegPlate } from "./shared";
import { DriverLocation } from "./types";
import { useVehicles } from "./useVehicles";

dayjs.extend(relativeTime);

const LONDON = { lat: 51.5574, lng: -0.0906 };
const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

// Dashed line between recorded stops (it is not the driven route).
const DASHED: google.maps.PolylineOptions = {
  strokeOpacity: 0,
  icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 0.9, strokeColor: "#1565c0", scale: 3 }, offset: "0", repeat: "14px" }],
};

const MapPage: React.FC = () => {
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null; name?: string | null };
  const store = useVehicles(user?.company_id, user?.name || "You");
  const { vehicles } = store;
  const { isLoaded, loadError } = useJsApiLoader({
    ...GOOGLE_MAPS_SHARED_LOADER_OPTIONS,
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
  });

  const [driverId, setDriverId] = useState<number | null>(null);
  const [day, setDay] = useState(dayjs().format("YYYY-MM-DD"));
  const [openPoint, setOpenPoint] = useState<number | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  // Each driver's latest point.
  const latest = useMemo(() => {
    const byDriver = new Map<number, DriverLocation>();
    [...store.locations]
      .sort((a, b) => a.at.localeCompare(b.at))
      .forEach((p) => byDriver.set(p.driver_id, p));
    return [...byDriver.values()].sort((a, b) => b.at.localeCompare(a.at));
  }, [store.locations]);

  const stops = useMemo(
    () =>
      driverId === null
        ? []
        : store.locations
            .filter((p) => p.driver_id === driverId && dayjs(p.at).format("YYYY-MM-DD") === day)
            .sort((a, b) => a.at.localeCompare(b.at)),
    [store.locations, driverId, day],
  );

  const shown = driverId === null ? latest : stops;

  // Fit the map to whatever is shown.
  useEffect(() => {
    if (!map || !isLoaded) return;
    if (!shown.length) {
      map.setCenter(LONDON);
      map.setZoom(11);
      return;
    }
    if (shown.length === 1) {
      map.setCenter({ lat: shown[0].lat, lng: shown[0].lng });
      map.setZoom(14);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    shown.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
    map.fitBounds(bounds, 60);
  }, [map, isLoaded, shown]);

  const plate = (id: number | null) => vehicles.find((v) => v.id === id)?.registration;
  const selected = latest.find((p) => p.driver_id === driverId);

  if (store.noCompany) return <NoCompany />;

  return (
    <Box sx={{ minHeight: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
      <FleetNav data={store} />

      <Box px={2} pt={2}>
        <Typography variant="h5" fontWeight={700}>
          Map
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Where drivers last recorded something in the app (checklist, fuel, expense, defect). The dashed line joins
          a driver&apos;s stops on one day; it is not the exact route driven.
        </Typography>
      </Box>

      <Grid container spacing={2} sx={{ p: 2, flex: 1 }}>
        {/* Drivers and stops */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ borderRadius: 2, height: { md: "calc(100vh - 290px)" }, overflow: "auto" }}>
            <ButtonBase
              onClick={() => {
                setDriverId(null);
                setOpenPoint(null);
              }}
              sx={{
                width: "100%",
                justifyContent: "flex-start",
                textAlign: "left",
                px: 2,
                py: 1.5,
                backgroundColor: driverId === null ? "primary.light" : "transparent",
              }}
            >
              <Box>
                <Typography fontWeight={700}>All drivers</Typography>
                <Typography variant="caption" color="textSecondary">
                  Last place of each driver
                </Typography>
              </Box>
            </ButtonBase>
            <Divider />
            {latest.length === 0 && (
              <Typography color="textSecondary" p={2}>
                No locations yet. They appear when drivers use the app.
              </Typography>
            )}
            {latest.map((p) => {
              const active = p.driver_id === driverId;
              return (
                <React.Fragment key={p.driver_id}>
                  <ButtonBase
                    onClick={() => {
                      setDriverId(p.driver_id);
                      setDay(dayjs(p.at).format("YYYY-MM-DD"));
                      setOpenPoint(null);
                    }}
                    sx={{
                      width: "100%",
                      justifyContent: "flex-start",
                      textAlign: "left",
                      px: 2,
                      py: 1.25,
                      backgroundColor: active ? "primary.light" : "transparent",
                    }}
                  >
                    <Stack spacing={0.5} width="100%">
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <DriverName name={p.driver_name} />
                        {plate(p.vehicle_id) && <RegPlate registration={plate(p.vehicle_id) as string} />}
                      </Stack>
                      <Typography variant="caption" color="textSecondary">
                        {p.action} · {p.place} · {dayjs(p.at).fromNow()}
                      </Typography>
                    </Stack>
                  </ButtonBase>
                  <Divider />
                </React.Fragment>
              );
            })}

            {selected && (
              <Box p={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                  <Typography fontWeight={700}>Stops</Typography>
                  <CustomTextField
                    type="date"
                    size="small"
                    value={day}
                    onChange={(e: any) => e.target.value && setDay(e.target.value)}
                    slotProps={{ htmlInput: { max: dayjs().format("YYYY-MM-DD") } }}
                  />
                </Stack>
                {stops.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    {selected.driver_name} recorded nothing on {dayjs(day).format("DD/MM/YYYY")}.
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {stops.map((s, i) => (
                      <ButtonBase
                        key={s.id}
                        onClick={() => setOpenPoint(s.id)}
                        sx={{ justifyContent: "flex-start", textAlign: "left", borderRadius: 1, p: 0.5 }}
                      >
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Chip size="small" color="primary" label={i + 1} sx={{ minWidth: 28 }} />
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {dayjs(s.at).format("HH:mm")} · {s.action}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {s.place}
                            </Typography>
                          </Box>
                        </Stack>
                      </ButtonBase>
                    ))}
                  </Stack>
                )}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Map */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper
            variant="outlined"
            sx={{ borderRadius: 2, overflow: "hidden", height: { xs: 420, md: "calc(100vh - 290px)" }, position: "relative" }}
          >
            {loadError || !process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ? (
              <Box p={2}>
                <Alert severity="warning">The map can&apos;t load right now. The list of drivers and stops still works.</Alert>
              </Box>
            ) : !isLoaded ? (
              <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                <CircularProgress />
              </Box>
            ) : (
              <GoogleMap
                center={LONDON}
                zoom={11}
                onLoad={setMap}
                onUnmount={() => setMap(null)}
                mapContainerStyle={{ width: "100%", height: "100%" }}
                options={{
                  gestureHandling: "greedy",
                  zoomControl: true,
                  mapTypeControl: false,
                  streetViewControl: false,
                  fullscreenControl: true,
                  clickableIcons: false,
                }}
              >
                {driverId !== null && stops.length > 1 && (
                  <Polyline path={stops.map((s) => ({ lat: s.lat, lng: s.lng }))} options={DASHED} />
                )}
                {shown.map((p, i) => (
                  <Marker
                    key={p.id}
                    position={{ lat: p.lat, lng: p.lng }}
                    label={{
                      text: driverId === null ? initials(p.driver_name) : String(i + 1),
                      color: "#ffffff",
                      fontSize: "11px",
                      fontWeight: "700",
                    }}
                    onClick={() => setOpenPoint(p.id)}
                  />
                ))}
                {shown
                  .filter((p) => p.id === openPoint)
                  .map((p) => (
                    <InfoWindow key={p.id} position={{ lat: p.lat, lng: p.lng }} onCloseClick={() => setOpenPoint(null)}>
                      <Box sx={{ minWidth: 180 }}>
                        <Typography variant="body2" fontWeight={700}>
                          {p.driver_name}
                          {plate(p.vehicle_id) ? ` · ${plate(p.vehicle_id)}` : ""}
                        </Typography>
                        <Typography variant="body2">{p.action}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {p.place} · {dayjs(p.at).format("DD/MM/YYYY HH:mm")}
                        </Typography>
                      </Box>
                    </InfoWindow>
                  ))}
              </GoogleMap>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MapPage;
