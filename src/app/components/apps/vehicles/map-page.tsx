"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  Paper,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  IconCamera,
  IconCarCrash,
  IconChecklist,
  IconGasStation,
  IconGauge,
  IconInfoCircle,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconMapPinPlus,
  IconX,
  IconReceipt,
  IconRoute,
  IconWheel,
} from "@tabler/icons-react";
import { GoogleMap, InfoWindow, OverlayViewF, OVERLAY_MOUSE_TARGET, Polyline, useJsApiLoader } from "@react-google-maps/api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { GOOGLE_MAPS_SHARED_LOADER_OPTIONS } from "@/utils/googleMaps";
import ChecklistDialog from "./checklist-dialog";
import FleetNav from "./fleet-nav";
import { DriverName, NoCompany, RegPlate } from "./shared";
import { DriverLocation, FleetPlace, LOCATION_KIND, LocationKind, PLACE_KIND } from "./types";
import { PlaceBadge, PlaceDialog, PlaceDraft, PlacePin } from "./map-places";
import ConfirmDialog from "../inventory-new/shared/ConfirmDialog";
import toast from "react-hot-toast";
import { useVehicles } from "./useVehicles";

dayjs.extend(relativeTime);

const LONDON = { lat: 51.5574, lng: -0.0906 };
const ALERT_COLOR = LOCATION_KIND.accident.color;

const KIND_ICON: Record<LocationKind, React.ElementType> = {
  daily_check: IconChecklist,
  fuel: IconGasStation,
  mileage: IconGauge,
  tyre_check: IconWheel,
  photo_check: IconCamera,
  accident: IconCarCrash,
  expense: IconReceipt,
  mileage_claim: IconRoute,
};

const OPEN_LABEL: Record<LocationKind, string> = {
  daily_check: "Open checklist",
  fuel: "Open fuel log",
  mileage: "Open mileage",
  tyre_check: "Open tyres",
  photo_check: "Open photo checks",
  accident: "Open accident report",
  expense: "Open expenses",
  mileage_claim: "Open expenses",
};

const VEHICLE_TAB: Partial<Record<LocationKind, string>> = {
  fuel: "fuel",
  mileage: "mileage",
  tyre_check: "tyres",
  photo_check: "photos",
};

const colorOf = (p: Pick<DriverLocation, "kind" | "alert">) => (p.alert ? ALERT_COLOR : LOCATION_KIND[p.kind].color);

/** Round coloured badge with the icon of what was recorded. */
const KindBadge: React.FC<{ point: Pick<DriverLocation, "kind" | "alert">; size?: number }> = ({ point, size = 28 }) => {
  const Icon = KIND_ICON[point.kind];
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: colorOf(point),
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon size={Math.round(size * 0.58)} stroke={2} />
    </Box>
  );
};

/** Pin on the map: badge + a short label (plate or stop number), pointing at the place. */
const MapPin: React.FC<{ point: DriverLocation; label: string; active: boolean; onClick: () => void }> = ({
  point,
  label,
  active,
  onClick,
}) => (
  <Box sx={{ position: "relative", pb: "7px", transform: active ? "scale(1.1)" : undefined, transformOrigin: "bottom center" }}>
    <ButtonBase
      onClick={onClick}
      title={`${point.driver_name} · ${LOCATION_KIND[point.kind].label}`}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        pl: 0.25,
        pr: 1,
        py: 0.25,
        borderRadius: 99,
        backgroundColor: "#fff",
        border: `2px solid ${colorOf(point)}`,
        boxShadow: active ? 4 : 2,
        whiteSpace: "nowrap",
      }}
    >
      <KindBadge point={point} size={24} />
      <Typography variant="caption" fontWeight={700} color="#111">
        {label}
      </Typography>
    </ButtonBase>
    {/* little pointer under the pill */}
    <Box
      sx={{
        position: "absolute",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: 0,
        height: 0,
        borderLeft: "6px solid transparent",
        borderRight: "6px solid transparent",
        borderTop: `8px solid ${colorOf(point)}`,
      }}
    />
  </Box>
);

// Dashed line between recorded stops (it is not the driven route).
const DASHED: google.maps.PolylineOptions = {
  strokeOpacity: 0,
  icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 0.9, strokeColor: "#1565c0", scale: 3 }, offset: "0", repeat: "14px" }],
};

const MapPage: React.FC = () => {
  const router = useRouter();
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
  const [checklistId, setChecklistId] = useState<number | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  // list of drivers can be hidden to make the map bigger
  const [showList, setShowList] = useState(true);
  const [legendOpen, setLegendOpen] = useState(true);
  // company places (office, fuel station, hospital...)
  const [showPlaces, setShowPlaces] = useState(true);
  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState<PlaceDraft | null>(null);
  const [openPlace, setOpenPlace] = useState<number | null>(null);
  const [toRemove, setToRemove] = useState<FleetPlace | null>(null);

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
    map.fitBounds(bounds, 80);
  }, [map, isLoaded, shown]);

  const plate = (id: number | null) => vehicles.find((v) => v.id === id)?.registration;
  const selected = latest.find((p) => p.driver_id === driverId);
  const checklist = store.checklists.find((c) => c.id === checklistId) ?? null;

  // Open the record this place came from.
  const openRecord = (p: DriverLocation) => {
    if (p.kind === "daily_check" && p.checklist_id) {
      setChecklistId(p.checklist_id);
      return;
    }
    if (p.kind === "accident" && p.defect_id) {
      router.push(`/apps/vehicles/action-centre?defect=${p.defect_id}`);
      return;
    }
    if (p.kind === "expense" || p.kind === "mileage_claim") {
      router.push("/apps/vehicles/expenses");
      return;
    }
    if (p.vehicle_id) {
      const tab = VEHICLE_TAB[p.kind];
      router.push(`/apps/vehicles/${p.vehicle_id}${tab ? `?tab=${tab}` : ""}`);
    }
  };

  // "Add place": the next click on the map sets where the place is.
  const pickPlace = (e: google.maps.MapMouseEvent) => {
    if (!picking || !e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setPicking(false);
    setDraft({ lat, lng, address: "" });
    new google.maps.Geocoder().geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        const address = results[0].formatted_address;
        setDraft((d) => (d && d.lat === lat && d.lng === lng && !d.address ? { ...d, address } : d));
      }
    });
  };
  const places = store.places;
  const placeKinds = [...new Set(places.map((p) => p.kind))];

  const describe = (p: DriverLocation) => `${LOCATION_KIND[p.kind].label}${p.action ? ` · ${p.action}` : ""}`;

  if (store.noCompany) return <NoCompany />;

  return (
    <Box sx={{ minHeight: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
      <FleetNav data={store} />

      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "flex-end" }} spacing={1.5} px={2} pt={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Map
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Where drivers recorded something in the app, and your company places (office, fuel stations, hospitals...).
            The dashed line joins one day&apos;s stops; it is not the exact route driven.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
          <FormControlLabel
            control={<Switch checked={showPlaces} onChange={(e) => setShowPlaces(e.target.checked)} />}
            label={`Places (${places.length})`}
            sx={{ mr: 0.5 }}
          />
          <Button
            variant={picking ? "outlined" : "contained"}
            startIcon={<IconMapPinPlus size={18} />}
            onClick={() => {
              setPicking((v) => !v);
              setShowPlaces(true);
            }}
            disabled={!isLoaded || !!loadError}
          >
            {picking ? "Cancel" : "Add place"}
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={2} sx={{ p: 2, flex: 1 }}>
        {/* Drivers and stops */}
        <Grid size={{ xs: 12, md: 4 }} sx={{ display: showList ? undefined : "none" }}>
          <Paper variant="outlined" sx={{ borderRadius: 2, height: { md: "calc(100vh - 290px)" }, overflow: "auto" }}>
            <Stack direction="row" alignItems="stretch" sx={{ backgroundColor: driverId === null ? "primary.light" : "transparent" }}>
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
                flex: 1,
              }}
            >
              <Box>
                <Typography fontWeight={700}>All drivers</Typography>
                <Typography variant="caption" color="textSecondary">
                  Last place of each driver
                </Typography>
              </Box>
            </ButtonBase>
              <Tooltip title="Hide the list (bigger map)">
                <IconButton onClick={() => setShowList(false)} sx={{ alignSelf: "center", mr: 1 }} aria-label="Hide the list">
                  <IconLayoutSidebarLeftCollapse size={20} />
                </IconButton>
              </Tooltip>
            </Stack>
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
                    <Stack spacing={0.75} width="100%">
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <DriverName name={p.driver_name} />
                        {plate(p.vehicle_id) && <RegPlate registration={plate(p.vehicle_id) as string} />}
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <KindBadge point={p} size={20} />
                        <Typography variant="caption" color="textSecondary">
                          {describe(p)} · {p.place} · {dayjs(p.at).fromNow()}
                        </Typography>
                      </Stack>
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
                  <Stack spacing={0.5}>
                    {stops.map((s, i) => (
                      <ButtonBase
                        key={s.id}
                        onClick={() => setOpenPoint(s.id)}
                        sx={{
                          justifyContent: "flex-start",
                          textAlign: "left",
                          borderRadius: 1,
                          p: 0.75,
                          backgroundColor: openPoint === s.id ? "action.selected" : "transparent",
                        }}
                      >
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Typography variant="caption" fontWeight={700} color="textSecondary" width={14} textAlign="right">
                            {i + 1}
                          </Typography>
                          <KindBadge point={s} />
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {dayjs(s.at).format("HH:mm")} · {describe(s)}
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
        <Grid size={{ xs: 12, md: showList ? 8 : 12 }}>
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
                onClick={pickPlace}
                mapContainerStyle={{ width: "100%", height: "100%" }}
                options={{
                  draggableCursor: picking ? "crosshair" : undefined,
                  gestureHandling: "greedy",
                  zoomControl: true,
                  mapTypeControl: false,
                  streetViewControl: false,
                  fullscreenControl: true,
                  clickableIcons: false,
                }}
              >
                {showPlaces &&
                  places.map((pl) => (
                    <OverlayViewF
                      key={`place${pl.id}`}
                      position={{ lat: pl.lat, lng: pl.lng }}
                      mapPaneName={OVERLAY_MOUSE_TARGET}
                      getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h })}
                      zIndex={openPlace === pl.id ? 9 : 0}
                    >
                      <PlacePin
                        place={pl}
                        active={openPlace === pl.id}
                        onClick={() => {
                          setOpenPoint(null);
                          setOpenPlace(pl.id);
                        }}
                      />
                    </OverlayViewF>
                  ))}
                {showPlaces &&
                  places
                    .filter((pl) => pl.id === openPlace)
                    .map((pl) => (
                      <InfoWindow
                        key={`placeinfo${pl.id}`}
                        position={{ lat: pl.lat, lng: pl.lng }}
                        onCloseClick={() => setOpenPlace(null)}
                        options={{ pixelOffset: new google.maps.Size(0, -40), headerDisabled: true }}
                      >
                        <Box sx={{ minWidth: 210, maxWidth: 260 }}>
                          <Stack direction="row" spacing={1} alignItems="center" mb={0.75}>
                            <PlaceBadge kind={pl.kind} size={22} />
                            <Typography variant="body2" fontWeight={700} flex={1}>
                              {pl.name}
                            </Typography>
                            <IconButton size="small" aria-label="Close" onClick={() => setOpenPlace(null)} sx={{ m: -0.5 }}>
                              <IconX size={16} />
                            </IconButton>
                          </Stack>
                          <Typography variant="body2" color="textSecondary" lineHeight={1.4}>
                            {PLACE_KIND[pl.kind].label}
                          </Typography>
                          {pl.address && (
                            <Typography variant="caption" color="textSecondary" display="block">
                              {pl.address}
                            </Typography>
                          )}
                          {pl.note && (
                            <Typography variant="body2" lineHeight={1.4} mt={0.5}>
                              {pl.note}
                            </Typography>
                          )}
                          <Stack direction="row" spacing={1} mt={1}>
                            <Button
                              size="small"
                              variant="outlined"
                              fullWidth
                              href={`https://www.google.com/maps/dir/?api=1&destination=${pl.lat},${pl.lng}`}
                              target="_blank"
                              rel="noopener"
                            >
                              Directions
                            </Button>
                            <Button size="small" variant="outlined" color="error" fullWidth onClick={() => setToRemove(pl)}>
                              Remove
                            </Button>
                          </Stack>
                        </Box>
                      </InfoWindow>
                    ))}
                {driverId !== null && stops.length > 1 && (
                  <Polyline path={stops.map((s) => ({ lat: s.lat, lng: s.lng }))} options={DASHED} />
                )}
                {shown.map((p, i) => (
                  <OverlayViewF
                    key={p.id}
                    position={{ lat: p.lat, lng: p.lng }}
                    mapPaneName={OVERLAY_MOUSE_TARGET}
                    // anchor the pin's pointer on the place
                    getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h })}
                    zIndex={openPoint === p.id ? 10 : 1}
                  >
                    <MapPin
                      point={p}
                      label={driverId === null ? plate(p.vehicle_id) ?? p.driver_name : String(i + 1)}
                      active={openPoint === p.id}
                      onClick={() => {
                        setOpenPlace(null);
                        setOpenPoint(p.id);
                      }}
                    />
                  </OverlayViewF>
                ))}
                {shown
                  .filter((p) => p.id === openPoint)
                  .map((p) => (
                    <InfoWindow
                      key={p.id}
                      position={{ lat: p.lat, lng: p.lng }}
                      onCloseClick={() => setOpenPoint(null)}
                      // own header: Google's header row leaves a big gap around the close button
                      options={{ pixelOffset: new google.maps.Size(0, -40), headerDisabled: true }}
                    >
                      <Box sx={{ minWidth: 210, maxWidth: 260 }}>
                        <Stack direction="row" spacing={1} alignItems="center" mb={0.75}>
                          <KindBadge point={p} size={22} />
                          <Typography variant="body2" fontWeight={700} flex={1}>
                            {LOCATION_KIND[p.kind].label}
                          </Typography>
                          <IconButton size="small" aria-label="Close" onClick={() => setOpenPoint(null)} sx={{ m: -0.5 }}>
                            <IconX size={16} />
                          </IconButton>
                        </Stack>
                        {p.action && (
                          <Typography variant="body2" lineHeight={1.4}>
                            {p.action}
                          </Typography>
                        )}
                        <Typography variant="body2" color="textSecondary" lineHeight={1.4}>
                          {p.driver_name}
                          {plate(p.vehicle_id) ? ` · ${plate(p.vehicle_id)}` : ""}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" display="block">
                          {p.place} · {dayjs(p.at).format("DD/MM/YYYY HH:mm")}
                        </Typography>
                        <Button size="small" variant="outlined" fullWidth sx={{ mt: 1 }} onClick={() => openRecord(p)}>
                          {OPEN_LABEL[p.kind]}
                        </Button>
                      </Box>
                    </InfoWindow>
                  ))}
              </GoogleMap>
            )}

            {/* What the icons mean: a small card that can be folded away */}
            {isLoaded && !loadError && process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY && (
              legendOpen ? (
                <Paper
                  elevation={3}
                  sx={{
                    position: "absolute",
                    left: 10,
                    bottom: 28,
                    width: { xs: "calc(100% - 20px)", sm: 300 },
                    maxHeight: "calc(100% - 90px)",
                    overflow: "auto",
                    borderRadius: 2,
                    p: 1.5,
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      What the icons mean
                    </Typography>
                    <Tooltip title="Hide">
                      <IconButton size="small" onClick={() => setLegendOpen(false)} aria-label="Hide the icon list" sx={{ m: -0.5 }}>
                        <IconX size={16} />
                      </IconButton>
                    </Tooltip>
                  </Stack>

                  <Typography variant="caption" color="textSecondary" fontWeight={600} display="block" mb={0.75}>
                    DRIVER RECORDS (ROUND)
                  </Typography>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 1.5, rowGap: 0.75 }}>
                    {(Object.keys(LOCATION_KIND) as LocationKind[]).map((k) => (
                      <Stack key={k} direction="row" spacing={1} alignItems="center" minWidth={0}>
                        <KindBadge point={{ kind: k }} size={20} />
                        <Typography variant="caption" noWrap>
                          {LOCATION_KIND[k].label}
                        </Typography>
                      </Stack>
                    ))}
                    <Stack direction="row" spacing={1} alignItems="center" minWidth={0}>
                      <KindBadge point={{ kind: "daily_check", alert: true }} size={20} />
                      <Typography variant="caption" noWrap>
                        Defect found
                      </Typography>
                    </Stack>
                  </Box>

                  {showPlaces && placeKinds.length > 0 && (
                    <>
                      <Divider sx={{ my: 1.25 }} />
                      <Typography variant="caption" color="textSecondary" fontWeight={600} display="block" mb={0.75}>
                        COMPANY PLACES (SQUARE)
                      </Typography>
                      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 1.5, rowGap: 0.75 }}>
                        {placeKinds.map((k) => (
                          <Stack key={k} direction="row" spacing={1} alignItems="center" minWidth={0}>
                            <PlaceBadge kind={k} size={20} />
                            <Typography variant="caption" noWrap>
                              {PLACE_KIND[k].label}
                            </Typography>
                          </Stack>
                        ))}
                      </Box>
                    </>
                  )}
                </Paper>
              ) : (
                <Button
                  variant="contained"
                  color="inherit"
                  size="small"
                  startIcon={<IconInfoCircle size={18} />}
                  onClick={() => setLegendOpen(true)}
                  sx={{ position: "absolute", left: 10, bottom: 28, backgroundColor: "background.paper", boxShadow: 2 }}
                >
                  Icons
                </Button>
              )
            )}

            {/* Show the drivers list again */}
            {!showList && (
              <Tooltip title="Show the drivers list">
                <Button
                  variant="contained"
                  color="inherit"
                  size="small"
                  startIcon={<IconLayoutSidebarLeftExpand size={18} />}
                  onClick={() => setShowList(true)}
                  sx={{ position: "absolute", top: 10, left: 10, backgroundColor: "background.paper", boxShadow: 2 }}
                >
                  Drivers
                </Button>
              </Tooltip>
            )}

            {/* Picking a spot for a new place */}
            {picking && (
              <Alert
                severity="info"
                icon={<IconMapPinPlus size={20} />}
                sx={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", boxShadow: 3, maxWidth: "calc(100% - 140px)" }}
                action={
                  <Button color="inherit" size="small" onClick={() => setPicking(false)}>
                    Cancel
                  </Button>
                }
              >
                Click on the map where the place is.
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>

      <ChecklistDialog
        checklist={checklist}
        vehicle={vehicles.find((v) => v.id === checklist?.vehicle_id) ?? null}
        onClose={() => setChecklistId(null)}
      />

      <PlaceDialog draft={draft} onClose={() => setDraft(null)} onSave={store.addPlace} />

      <ConfirmDialog
        open={!!toRemove}
        title="Remove place"
        message={toRemove ? `Remove ${toRemove.name} from the map?` : ""}
        confirmLabel="Remove"
        onClose={() => setToRemove(null)}
        onConfirm={async () => {
          if (!toRemove) return;
          await store.removePlace(toRemove.id);
          toast.success(`${toRemove.name} removed.`);
          setOpenPlace(null);
          setToRemove(null);
        }}
      />
    </Box>
  );
};

export default MapPage;
