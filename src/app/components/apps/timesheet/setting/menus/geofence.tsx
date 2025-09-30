"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Radio,
  Tooltip,
  Switch,
  CircularProgress,
} from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import { IconHelp, IconPlus } from "@tabler/icons-react";
import WorkZone from "../../../modals/work-zone";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import api from "@/utils/axios";
import {
  GoogleMap,
  useJsApiLoader,
  Circle,
  Polygon,
  Polyline,
  Marker,
} from "@react-google-maps/api";

interface GeneralSettingProps {
  onSaveSuccess: () => void;
}

const GOOGLE_MAP_LIBRARIES: (
  | "places"
  | "drawing"
  | "geometry"
  | "visualization"
)[] = ["places", "drawing"];

const Geofence: React.FC<GeneralSettingProps> = ({ onSaveSuccess }) => {
  const [selectedOption, setSelectedOption] = useState("checking-checkout");
  const [shareLocation, setShareLocation] = useState<boolean>(false);
  const [openSite, setOpenSite] = useState<boolean>(false);
  const [workZones, setWorkZones] = useState<any[]>([]);
  const [lastUpdatedSiteId, setLastUpdatedSiteId] = useState<number | null>(
    null
  );

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const [googleMaps, setGoogleMaps] = useState<typeof window.google | null>(
    null
  );

  const mapContainerStyle = {
    width: "100%",
    height: "300px",
  };

  // Load Google Maps
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
    libraries: GOOGLE_MAP_LIBRARIES,
  });

  // Fetch workzones
  const getWorkzones = async () => {
    if (!user?.company_id) return;
    try {
      const res = await api.get(`work-zone/get?company_id=${user.company_id}`);
      if (res.data.info) setWorkZones(res.data.info);
    } catch (err) {
      console.error(err);
    }
  };

  const getBoundaryPath = (site: any) => {
    if (!site.boundary) return [];
    try {
      const parsed = JSON.parse(site.boundary);
      if (Array.isArray(parsed)) return parsed;
      if (parsed.lat && parsed.lng)
        return [{ lat: parsed.lat, lng: parsed.lng }];
    } catch (err) {
      console.log("Invalid Boundary", err);
    }
    return [];
  };

  // Compute map center
  const mapCenter = (() => {
    const lastSite = workZones.find((w) => w.id === lastUpdatedSiteId);
    if (lastSite) {
      if (lastSite.type === "circle") {
        try {
          const parsed = JSON.parse(lastSite.boundary);
          return { lat: parsed.lat, lng: parsed.lng };
        } catch {}
      } else if (lastSite.type === "polygon" || lastSite.type === "polyline") {
        const path = getBoundaryPath(lastSite);
        if (path.length) return path[0];
      }
      return { lat: lastSite.latitude, lng: lastSite.longitude };
    }
    return workZones.length
      ? { lat: workZones[0].latitude, lng: workZones[0].longitude }
      : { lat: 51.5074, lng: -0.1278 };
  })();

  useEffect(() => {
    getWorkzones();
  }, [user?.company_id, lastUpdatedSiteId]);

  const options = [
    {
      id: "breadcrumbs",
      title: "Breadcrumbs (live-tracking)",
      description:
        "Track users' live location and route while they're on the clock",
      image: "/images/location/geolocation1.png",
    },
    {
      id: "checking-checkout",
      title: "Clock in & out",
      description: "Track users' clock in and clock out locations",
      image: "/images/location/geolocation2.png",
    },
    {
      id: "off",
      title: "Off",
      description: "Don't track users' location at all",
      image: "/images/location/geolocation3.png",
    },
  ];

  const styles = useMemo(
    () => ({
      tooltipStyles: {
        tooltip: {
          sx: {
            backgroundColor: "#1a1f29",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 400,
            lineHeight: 1.4,
            maxWidth: 320,
            p: "10px 14px",
            borderRadius: "6px",
            boxShadow: "0px 4px 12px rgba(0,0,0,0.25)",
            whiteSpace: "normal",
          },
        },
        arrow: { sx: { color: "#1a1f29" } },
      },
    }),
    []
  );

  if (!isLoaded)
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="300px"
      >
        <CircularProgress />
      </Box>
    );

  return (
    <Box display="flex" flexDirection="column" overflow="auto">
      <Box sx={{ flex: 1, p: 3 }} m="auto">
        {/* Top Section */}
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="space-between"
          sx={{ width: 120 }}
        >
          <Box display="flex" alignItems="center" gap={1} sx={{ height: 32 }}>
            <Typography variant="h1" fontSize={"20px !important"}>
              Geolocation
            </Typography>
            <Tooltip
              componentsProps={styles.tooltipStyles}
              title={<>Learn more</>}
              arrow
              placement="top"
            >
              <Box
                component="span"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <Link
                  style={{ display: "flex" }}
                  href={
                    "https://help.connecteam.com/en/articles/6489778-time-clock-gps-location-tracking-geolocation"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <IconHelp size={16} color="#9e9e9e" />
                </Link>
              </Box>
            </Tooltip>
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Select how location tracking is used for clocking in and out.
        </Typography>

        {/* Options Boxes */}
        <Box display="flex" gap={3} flexWrap="wrap" p={3}>
          {options.map((opt) => {
            const isSelected = selectedOption === opt.id;
            return (
              <Box
                key={opt.id}
                onClick={() => setSelectedOption(opt.id)}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  cursor: "pointer",
                  border: 1,
                  borderColor: isSelected ? "#9dd0ff" : "#f0f1f2",
                  bgcolor: isSelected ? "#eaf5ff" : "#fff",
                  transition: "all 0.2s ease",
                  width: 270,
                }}
              >
                <Image
                  src={opt.image}
                  alt={opt.title}
                  height={146}
                  width={238}
                  style={{ borderRadius: 5 }}
                />
                <Box display="flex" alignItems="center" mb={0}>
                  <Radio
                    size="small"
                    color="info"
                    checked={isSelected}
                    onChange={() => setSelectedOption(opt.id)}
                  />
                  <Typography fontWeight={400} color={"text.primary"}>
                    {opt.title}
                  </Typography>
                </Box>
                <Typography
                  ml={5}
                  fontSize="12px !important"
                  color="textSecondary"
                >
                  {opt.description}
                </Typography>
                {opt.id === "breadcrumbs" && (
                  <Link
                    style={{
                      display: "flex",
                      color: "#20B9C7",
                      marginLeft: 40,
                      fontSize: 14,
                    }}
                    href={
                      "https://help.connecteam.com/en/articles/6489778-time-clock-gps-location-tracking-geolocation"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Learn more
                  </Link>
                )}
              </Box>
            );
          })}
        </Box>

        {/* Clock-in/out switch */}
        {selectedOption === "checking-checkout" && (
          <Box display="flex" alignItems={"center"} flexWrap="wrap" p={3}>
            <Box
              bgcolor={"#eff0f0ff"}
              m={"auto"}
              p={2}
              display="flex"
              alignItems={"center"}
              borderRadius={2}
            >
              <Typography color="textSecondary">
                Users must share location to <br />
                clock in/out (optional when off)
              </Typography>
              <Switch
                color="info"
                checked={shareLocation}
                onChange={(e) => setShareLocation(e.target.checked)}
              />
            </Box>
          </Box>
        )}

        {/* Geo fence sites header */}
        <Box display="flex" justifyContent="space-between" mt={3}>
          <Box display="flex" alignItems="center" gap={1} sx={{ height: 32 }}>
            <Typography variant="h1" fontSize={"20px !important"}>
              Geo fence sites
            </Typography>
            <Tooltip
              componentsProps={styles.tooltipStyles}
              title={<>Learn more</>}
              arrow
              placement="top"
            >
              <Box
                component="span"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <Link
                  style={{ display: "flex" }}
                  href={
                    "https://help.connecteam.com/en/articles/3597710-how-to-create-a-geofence"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <IconHelp size={16} color="#9e9e9e" />
                </Link>
              </Box>
            </Tooltip>
          </Box>
          <Box>
            <Tooltip
              componentsProps={styles.tooltipStyles}
              arrow
              placement="top"
              title={
                selectedOption !== "breadcrumbs"
                  ? "You can add Geo fence sites only when Geolocation is required or Breadcrumbs are enabled"
                  : ""
              }
            >
              <span>
                <Button
                  variant="contained"
                  startIcon={<IconPlus size={16} />}
                  sx={{ borderRadius: 30 }}
                  onClick={() => setOpenSite(true)}
                  disabled={selectedOption !== "breadcrumbs" && !shareLocation}
                  color="info"
                >
                  {workZones.length > 0 ? "Edit Sites" : "Add sites"}
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary">
          Ensure your users can clock in and out only when they’re physically in
          the work location.
        </Typography>

        {/* Map Section */}
        <Box
          flexWrap="wrap"
          mt={3}
          className={
            selectedOption !== "breadcrumbs" && !shareLocation
              ? "disabled_location"
              : ""
          }
        >
          <Box
            bgcolor={"#eff0f0ff"}
            m={"auto"}
            p={2}
            display="flex"
            alignItems={"center"}
            justifyContent="space-between"
            borderRadius={2}
          >
            <Typography color="textSecondary">
              Require admin’s approval if users clock out outside the Geo fence
            </Typography>
            <Switch
              color="info"
              disabled={selectedOption !== "breadcrumbs" && !shareLocation}
            />
          </Box>
        </Box>

        {/* Map Section */}
        <Box
          sx={{ flex: 1, position: "relative" }}
          mt={2}
          mb={1}
          className={
            selectedOption !== "breadcrumbs" && !shareLocation
              ? "disabled_location"
              : ""
          }
        >
          {!workZones.length ? (
            <Image
              src="/images/location/geofence-map-placeholder.png"
              alt="placeholder"
              height={300}
              width={1000}
              style={{ borderRadius: 18 }}
            />
          ) : (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={12}
              onLoad={() => setGoogleMaps(window.google)}
            >
              {workZones.map((site) => {
                let markerPos = { lat: site.latitude, lng: site.longitude };
                let radius: number | undefined = site.circleRadius;

                if (site.type === "circle" && site.boundary) {
                  try {
                    const parsed = JSON.parse(site.boundary);
                    markerPos = { lat: parsed.lat, lng: parsed.lng };
                    radius = parsed.radius || site.circleRadius;
                  } catch {}
                }

                if (
                  (site.type === "polygon" || site.type === "polyline") &&
                  site.boundary
                ) {
                  const path = getBoundaryPath(site);
                  if (path.length) markerPos = path[0];
                }

                return (
                  <React.Fragment key={site.id}>
                    <Marker
                      position={markerPos}
                      label={{
                        text: site.name || `Site ${site.id}`,
                        color: site.color,
                        className: "map-site-label",
                      }}
                    />

                    {site.type === "circle" && radius && (
                      <Circle
                        center={markerPos}
                        radius={radius}
                        options={{
                          fillColor: site.color || "#1976d2",
                          fillOpacity: 0.3,
                          strokeColor: site.color || "#1976d2",
                          strokeWeight: 2,
                        }}
                      />
                    )}
                    {site.type === "polygon" && site.boundary && (
                      <Polygon
                        paths={getBoundaryPath(site)}
                        options={{
                          fillColor: site.color || "#1976d2",
                          fillOpacity: 0.3,
                          strokeColor: site.color || "#1976d2",
                          strokeWeight: 2,
                        }}
                      />
                    )}
                    {site.type === "polyline" &&
                      site.boundary &&
                      (() => {
                        const path = getBoundaryPath(site);
                        if (path.length < 3) {
                          // Too few points to fill, just draw line
                          return (
                            <Polyline
                              key={site.id}
                              path={path}
                              options={{
                                strokeColor: site.color || "#1976d2",
                                strokeWeight: 2,
                              }}
                            />
                          );
                        }

                        // Close path for polygon fill
                        const polygonPath = [...path, path[0]];
                        return (
                          <Polygon
                            key={site.id}
                            paths={polygonPath}
                            options={{
                              strokeColor: site.color || "#1976d2",
                              strokeWeight: 2,
                              fillColor: site.color || "#1976d2",
                              fillOpacity: 0.3,
                            }}
                          />
                        );
                      })()}
                  </React.Fragment>
                );
              })}
            </GoogleMap>
          )}
          <WorkZone
            open={openSite}
            isLoaded={isLoaded}
            onClose={() => setOpenSite(false)}
            onSiteUpdate={async (siteId) => {
              setLastUpdatedSiteId(siteId);
              await getWorkzones();
            }}
          />
        </Box>
      </Box>

      {/* Sticky Footer */}
      <Box
        sx={{
          borderTop: "1px solid #e0e0e0",
          p: 2,
          bgcolor: "#fff",
          position: "sticky",
          bottom: 0,
          textAlign: "right",
        }}
      >
        <Button variant="contained" color="primary" onClick={onSaveSuccess}>
          Save changes
        </Button>
      </Box>
    </Box>
  );
};

export default Geofence;
