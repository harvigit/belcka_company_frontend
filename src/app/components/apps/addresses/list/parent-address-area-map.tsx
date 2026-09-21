"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { Circle, GoogleMap, Marker } from "@react-google-maps/api";
import CustomRangeSlider from "@/app/components/forms/theme-elements/CustomRangeSlider";

const LONDON_CENTER = { lat: 51.5074, lng: -0.1278 };
const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" };
const MAP_OPTIONS = { clickableIcons: false };
const CIRCLE_OPTIONS = {
  draggable: true,
  editable: true,
  fillColor: "#FF0000",
  fillOpacity: 0.3,
  strokeColor: "#FF0000",
  strokeOpacity: 1,
  strokeWeight: 1,
};

type LatLng = { lat: number; lng: number };

type MapCanvasProps = {
  isLoaded: boolean;
  selectedLocation: LatLng | null;
  showCircle: boolean;
  onSelectLocation: (lat: number, lng: number) => void;
  onCircleRadiusChanged: () => void;
  mapRef: React.MutableRefObject<google.maps.Map | null>;
  circleRef: React.MutableRefObject<google.maps.Circle | null>;
  lastCenterRef: React.MutableRefObject<LatLng | null>;
  lastRadiusRef: React.MutableRefObject<number>;
};

const MapCanvas = React.memo(function MapCanvas({
  isLoaded,
  selectedLocation,
  showCircle,
  onSelectLocation,
  onCircleRadiusChanged,
  mapRef,
  circleRef,
  lastCenterRef,
  lastRadiusRef,
}: MapCanvasProps) {
  if (!isLoaded) return null;

  return (
    <Box
      height={{ xs: 280, md: 380 }}
      width="100%"
      borderRadius={2}
      overflow="hidden"
    >
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={selectedLocation ?? LONDON_CENTER}
        zoom={selectedLocation ? 15 : 11}
        onLoad={(map) => {
          mapRef.current = map;
          if (selectedLocation) {
            map.panTo(selectedLocation);
            map.setZoom(15);
          } else {
            map.panTo(LONDON_CENTER);
            map.setZoom(11);
          }
        }}
        onClick={(e) => {
          const lat = e.latLng?.lat();
          const lng = e.latLng?.lng();
          if (lat && lng) onSelectLocation(lat, lng);
        }}
        options={MAP_OPTIONS}
      >
        {selectedLocation && (
          <Marker
            position={selectedLocation}
            draggable={true}
            onDragEnd={(e) => {
              const lat = e.latLng?.lat();
              const lng = e.latLng?.lng();
              if (lat && lng) onSelectLocation(lat, lng);
            }}
          />
        )}
        {showCircle && selectedLocation && (
          <Circle
            center={selectedLocation}
            radius={lastRadiusRef.current > 0 ? lastRadiusRef.current : 0}
            options={CIRCLE_OPTIONS}
            onLoad={(circle) => {
              circleRef.current = circle;
              const liveRadius = lastRadiusRef.current;
              if (liveRadius > 0 && Math.round(circle.getRadius()) !== liveRadius) {
                circle.setRadius(liveRadius);
              }
            }}
            onCenterChanged={() => {
              if (!circleRef.current) return;
              const center = circleRef.current.getCenter();
              if (!center) return;
              const lat = center.lat();
              const lng = center.lng();
              if (
                lastCenterRef.current &&
                lastCenterRef.current.lat === lat &&
                lastCenterRef.current.lng === lng
              ) {
                return;
              }
              lastCenterRef.current = { lat, lng };
            }}
            onDragEnd={() => {
              if (!circleRef.current) return;
              const center = circleRef.current.getCenter();
              if (!center) return;
              onSelectLocation(center.lat(), center.lng());
            }}
            onRadiusChanged={onCircleRadiusChanged}
          />
        )}
      </GoogleMap>
    </Box>
  );
});

type ParentAddressAreaMapProps = {
  isLoaded: boolean;
  selectedLocation: LatLng | null;
  radius: number;
  maxRadius: number;
  onSelectLocation: (lat: number, lng: number) => void;
  onRadiusCommit: (radius: number) => void;
  lastRadiusRef: React.MutableRefObject<number>;
};

const ParentAddressAreaMap = React.memo(function ParentAddressAreaMap({
  isLoaded,
  selectedLocation,
  radius,
  maxRadius,
  onSelectLocation,
  onRadiusCommit,
  lastRadiusRef,
}: ParentAddressAreaMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const lastCenterRef = useRef<LatLng | null>(selectedLocation);
  const interactingRef = useRef(false);
  const [displayRadius, setDisplayRadius] = useState(radius);

  const clampRadius = useCallback(
    (value: number) => {
      const max = maxRadius > 0 ? maxRadius : 10000;
      return Math.max(0, Math.min(max, Math.round(value)));
    },
    [maxRadius],
  );

  const applyRadiusLocally = useCallback(
    (value: number) => {
      const next = clampRadius(value);
      lastRadiusRef.current = next;
      setDisplayRadius(next);
      if (circleRef.current) {
        const current = Math.round(circleRef.current.getRadius());
        if (current !== next) {
          circleRef.current.setRadius(next);
        }
      }
      return next;
    },
    [clampRadius, lastRadiusRef],
  );

  useEffect(() => {
    if (interactingRef.current) return;
    setDisplayRadius(radius);
    lastRadiusRef.current = radius;
    if (circleRef.current && radius >= 0) {
      const current = Math.round(circleRef.current.getRadius());
      if (current !== Math.round(radius)) {
        circleRef.current.setRadius(radius);
      }
    }
  }, [lastRadiusRef, radius]);

  useEffect(() => {
    if (interactingRef.current) return;
    lastCenterRef.current = selectedLocation;
    if (!mapRef.current) return;
    if (selectedLocation) {
      mapRef.current.panTo(selectedLocation);
      mapRef.current.setZoom(15);
      return;
    }
    mapRef.current.panTo(LONDON_CENTER);
    mapRef.current.setZoom(11);
  }, [selectedLocation]);

  useEffect(() => {
    const commitRadius = () => {
      if (lastRadiusRef.current === radius) return;
      onRadiusCommit(lastRadiusRef.current);
      interactingRef.current = false;
    };
    window.addEventListener("mouseup", commitRadius);
    window.addEventListener("touchend", commitRadius);
    return () => {
      window.removeEventListener("mouseup", commitRadius);
      window.removeEventListener("touchend", commitRadius);
    };
  }, [lastRadiusRef, onRadiusCommit, radius]);

  const handleSliderChange = useCallback(
    (_event: Event, newValue: number | number[]) => {
      interactingRef.current = true;
      const raw = Array.isArray(newValue) ? newValue[0] : newValue;
      applyRadiusLocally(raw);
    },
    [applyRadiusLocally],
  );

  const handleSliderCommit = useCallback(
    (_event: Event | React.SyntheticEvent, newValue: number | number[]) => {
      const raw = Array.isArray(newValue) ? newValue[0] : newValue;
      const next = applyRadiusLocally(raw);
      interactingRef.current = false;
      onRadiusCommit(next);
    },
    [applyRadiusLocally, onRadiusCommit],
  );

  const handleRadiusChanged = useCallback(() => {
    if (!circleRef.current) return;
    let newRadius = Math.round(circleRef.current.getRadius());

    if (newRadius > 10000) {
      newRadius = 10000;
      circleRef.current.setRadius(10000);
    }

    if (lastRadiusRef.current === newRadius) return;
    lastRadiusRef.current = newRadius;
    setDisplayRadius(newRadius);
  }, [lastRadiusRef]);

  return (
    <Stack spacing={3}>
      <Box width="100%">
        <Typography variant="subtitle2" mb={1}>
          Area size [{displayRadius} Meter]
        </Typography>
        <CustomRangeSlider
          value={displayRadius}
          onChange={handleSliderChange}
          onChangeCommitted={handleSliderCommit}
          min={0}
          max={maxRadius}
          step={1}
        />
      </Box>
      <MapCanvas
        isLoaded={isLoaded}
        selectedLocation={selectedLocation}
        showCircle={
          Boolean(selectedLocation) && (radius > 0 || displayRadius > 0)
        }
        onSelectLocation={onSelectLocation}
        onCircleRadiusChanged={handleRadiusChanged}
        mapRef={mapRef}
        circleRef={circleRef}
        lastCenterRef={lastCenterRef}
        lastRadiusRef={lastRadiusRef}
      />
    </Stack>
  );
});

export default ParentAddressAreaMap;
