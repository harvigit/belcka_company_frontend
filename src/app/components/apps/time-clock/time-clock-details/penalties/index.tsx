"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "@/utils/axios";
import {
    Box,
    Typography,
    CircularProgress,
    IconButton,
    Button,
    Divider,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
} from "@mui/material";
import { IconArrowLeft, IconMapPin } from "@tabler/icons-react";
import toast from "react-hot-toast";
import {
    Circle,
    GoogleMap,
    OverlayView,
    Polygon,
    Polyline,
    useJsApiLoader,
} from "@react-google-maps/api";
import { GOOGLE_MAPS_SHARED_LOADER_OPTIONS } from "@/utils/googleMaps";

interface ChecklogsPageProps {
    worklogId: number;
    onClose: () => void;
}

interface PenaltyItem {
    appeal_note: string;
    penalty_id?: number;
    payable_hours?: string | number | null;
    formatted_start_time?: string;
    formatted_end_time?: string;
    penalty_type?: string | null;
    penalty_minutes?: string | null;
    is_penalty_appeal?: boolean;
    appeal_id?: number;
    geofences?: PenaltyGeofenceApi[] | null;
    start_work_location?: PenaltyLocation | null;
    stop_work_location?: PenaltyLocation | null;
}

type PenaltyLocation = {
    latitude?: string | number | null;
    longitude?: string | number | null;
    location?: string | null;
};

type PenaltyGeofenceType = "circle" | "polygon" | "polyline";

type PenaltyGeofenceApi = {
    id?: number | string | null;
    name?: string | null;
    latitude?: string | number | null;
    longitude?: string | number | null;
    radius?: string | number | null;
    type?: string | null;
    color?: string | null;
    coordinates?: unknown;
};

type PenaltyGeofence = {
    id: string;
    name: string;
    type: PenaltyGeofenceType;
    center: google.maps.LatLngLiteral;
    radius: number;
    color: string;
    path: google.maps.LatLngLiteral[];
};

type PenaltyMapPoint = {
    label: "Start" | "Stop";
    color: string;
    position: google.maps.LatLngLiteral;
    address?: string | null;
    time?: string | null;
};

const OUTSIDE_BOUNDARY = "Outside Boundary";
const DEFAULT_CENTER = { lat: 51.5074, lng: -0.1278 };
const DEFAULT_ZOOM = 16;

const isOutsideBoundaryPenalty = (penaltyType?: string | null) =>
    String(penaltyType ?? "").trim().toLowerCase() === OUTSIDE_BOUNDARY.toLowerCase();

const isValidLatLng = (lat: number, lng: number) =>
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

const normalizeLocationPoint = (
    label: "Start" | "Stop",
    color: string,
    location?: PenaltyLocation | null,
    time?: string | null,
): PenaltyMapPoint | null => {
    const lat = Number(location?.latitude);
    const lng = Number(location?.longitude);

    if (!isValidLatLng(lat, lng)) return null;

    return {
        label,
        color,
        position: { lat, lng },
        address: location?.location,
        time,
    };
};

const parseGeofencePath = (raw: unknown): google.maps.LatLngLiteral[] => {
    if (!Array.isArray(raw)) return [];

    return raw
        .map((point) => {
            if (!point || typeof point !== "object") return null;
            const value = point as Record<string, unknown>;
            const lat = Number(value.lat ?? value.latitude);
            const lng = Number(value.lng ?? value.longitude);

            return isValidLatLng(lat, lng) ? { lat, lng } : null;
        })
        .filter((point): point is google.maps.LatLngLiteral => point !== null);
};

const normalizeGeofences = (geofences?: PenaltyGeofenceApi[] | null): PenaltyGeofence[] =>
    (Array.isArray(geofences) ? geofences : [])
        .map((zone, index) => {
            const type: PenaltyGeofenceType =
                zone?.type === "polygon" || zone?.type === "polyline" ? zone.type : "circle";
            const lat = Number(zone?.latitude);
            const lng = Number(zone?.longitude);
            const center = isValidLatLng(lat, lng) ? { lat, lng } : null;
            const path = parseGeofencePath(zone?.coordinates);
            const radius = Number(zone?.radius);
            const validRadius = Number.isFinite(radius) && radius > 0 ? radius : 0;

            if (type === "circle" && (!center || validRadius <= 0)) return null;
            if (type === "polygon" && path.length < 3) return null;
            if (type === "polyline" && path.length < 2) return null;

            const fallbackCenter = center ?? path[0];
            if (!fallbackCenter) return null;

            return {
                id: String(zone?.id ?? `zone-${index}`),
                name: String(zone?.name ?? "Work zone"),
                type,
                center: fallbackCenter,
                radius: validRadius,
                color: typeof zone?.color === "string" && zone.color.trim() ? zone.color : "#1976d2",
                path,
            };
        })
        .filter((zone): zone is PenaltyGeofence => zone !== null);

const extendBoundsWithGeofence = (bounds: google.maps.LatLngBounds, geofence: PenaltyGeofence) => {
    if (geofence.type === "circle") {
        const latDelta = geofence.radius / 111320;
        const lngDelta = geofence.radius / (111320 * Math.cos((geofence.center.lat * Math.PI) / 180) || 1);

        bounds.extend({ lat: geofence.center.lat + latDelta, lng: geofence.center.lng + lngDelta });
        bounds.extend({ lat: geofence.center.lat - latDelta, lng: geofence.center.lng - lngDelta });
        return;
    }

    geofence.path.forEach((point) => bounds.extend(point));
};

const MapPinOverlay = ({ point }: { point: PenaltyMapPoint }) => (
    <OverlayView position={point.position} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
        <Box
            sx={{
                transform: "translate(-50%, -100%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.5,
            }}
        >
            <Box
                sx={{
                    px: 1,
                    py: 0.35,
                    borderRadius: 1,
                    bgcolor: "#fff",
                    border: `1px solid ${point.color}`,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                    fontSize: 11,
                    fontWeight: 700,
                    color: point.color,
                    whiteSpace: "nowrap",
                }}
            >
                {point.label}
            </Box>
            <IconMapPin size={30} color={point.color} />
        </Box>
    </OverlayView>
);

const GeofenceOverlay = ({ zone }: { zone: PenaltyGeofence }) => {
    if (zone.type === "circle") {
        return (
            <Circle
                center={zone.center}
                radius={zone.radius}
                options={{
                    strokeColor: zone.color,
                    strokeWeight: 2,
                    fillColor: zone.color,
                    fillOpacity: 0.16,
                }}
            />
        );
    }

    if (zone.type === "polygon") {
        return (
            <Polygon
                paths={zone.path}
                options={{
                    strokeColor: zone.color,
                    strokeWeight: 2,
                    fillColor: zone.color,
                    fillOpacity: 0.16,
                }}
            />
        );
    }

    return (
        <Polyline
            path={zone.path}
            options={{
                strokeColor: zone.color,
                strokeWeight: 3,
            }}
        />
    );
};

const OutsideBoundaryMap = ({ penalty }: { penalty: PenaltyItem }) => {
    const mapRef = useRef<google.maps.Map | null>(null);
    const { isLoaded } = useJsApiLoader({
        ...GOOGLE_MAPS_SHARED_LOADER_OPTIONS,
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
    });

    const points = useMemo(
        () =>
            [
                normalizeLocationPoint("Start", "#1976d2", penalty.start_work_location, penalty.formatted_start_time),
                normalizeLocationPoint("Stop", "#fc4b6c", penalty.stop_work_location, penalty.formatted_end_time),
            ].filter((point): point is PenaltyMapPoint => point !== null),
        [penalty.start_work_location, penalty.stop_work_location, penalty.formatted_start_time, penalty.formatted_end_time],
    );
    const geofences = useMemo(() => normalizeGeofences(penalty.geofences), [penalty.geofences]);
    const hasMapData = points.length > 0 || geofences.length > 0;

    const fitMap = useCallback((map: google.maps.Map) => {
        const bounds = new google.maps.LatLngBounds();
        let hasBounds = false;

        points.forEach((point) => {
            bounds.extend(point.position);
            hasBounds = true;
        });
        geofences.forEach((zone) => {
            extendBoundsWithGeofence(bounds, zone);
            hasBounds = true;
        });

        if (!hasBounds) {
            map.setCenter(DEFAULT_CENTER);
            map.setZoom(12);
            return;
        }

        if (points.length === 1 && geofences.length === 0) {
            map.panTo(points[0].position);
            map.setZoom(DEFAULT_ZOOM);
            return;
        }

        map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    }, [geofences, points]);

    useEffect(() => {
        if (mapRef.current && isLoaded) {
            fitMap(mapRef.current);
        }
    }, [fitMap, isLoaded]);

    if (!hasMapData) {
        return (
            <Typography variant="body2" color="text.secondary">
                No start/stop location or work-zone boundary data available.
            </Typography>
        );
    }

    if (!isLoaded) {
        return (
            <Box height={260} display="flex" alignItems="center" justifyContent="center">
                <CircularProgress size={24} />
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ height: 260, borderRadius: 1.5, overflow: "hidden", border: "1px solid #e5e7eb" }}>
                <GoogleMap
                    mapContainerStyle={{ width: "100%", height: "100%" }}
                    center={points[0]?.position ?? geofences[0]?.center ?? DEFAULT_CENTER}
                    zoom={DEFAULT_ZOOM}
                    onLoad={(map) => {
                        mapRef.current = map;
                        fitMap(map);
                    }}
                    options={{
                        streetViewControl: false,
                        mapTypeControl: false,
                        fullscreenControl: true,
                    }}
                >
                    {geofences.map((zone) => (
                        <GeofenceOverlay key={zone.id} zone={zone} />
                    ))}
                    {points.map((point) => (
                        <MapPinOverlay key={point.label} point={point} />
                    ))}
                </GoogleMap>
            </Box>

            <Box mt={1} display="flex" flexDirection="column" gap={0.75}>
                {points.map((point) => (
                    <Typography key={point.label} variant="caption" color="text.secondary">
                        <strong style={{ color: point.color }}>{point.label} Address:</strong>{" "}
                        {point.address || `${point.position.lat}, ${point.position.lng}`}  {" | "}  {point.time || "--"}
                    </Typography>
                ))}
            </Box>
        </Box>
    );
};

export default function Penalties({ worklogId, onClose }: ChecklogsPageProps) {
    const [loading, setLoading] = useState(false);
    const [penalties, setPenalties] = useState<PenaltyItem[]>([]);
    const [day, setDay] = useState("");
    const [date, setDate] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [processingAppealId, setProcessingAppealId] = useState<number | null>(null);

    // Admin note dialog state
    const [openAdminNoteDialog, setOpenAdminNoteDialog] = useState(false);
    const [adminNote, setAdminNote] = useState("");
    const [selectedPenalty, setSelectedPenalty] = useState<PenaltyItem | null>(null);
    const [appealAction, setAppealAction] = useState<boolean>(false); // true = approve, false = reject

    useEffect(() => {
        if (worklogId > 0) fetchPenalties();
    }, [worklogId]);

    const fetchPenalties = async () => {
        setLoading(true);
        try {
            const res = await api.get(`user-worklog/get-worklog-penalties?worklog_id=${worklogId}`);
            if (res.data?.IsSuccess) {
                setPenalties(res.data.info || []);
                setDay(res.data.worklog_day || "");
                setDate(res.data.worklog_date || "");
            }
        } catch (err) {
            toast.error("Failed to fetch penalties");
        } finally {
            setLoading(false);
        }
    };

    const openAdminNotePrompt = (penalty: PenaltyItem, isApproved: boolean) => {
        setSelectedPenalty(penalty);
        setAppealAction(isApproved);
        setAdminNote("");
        setOpenAdminNoteDialog(true);
    };

    const handleAdminNoteSubmit = async () => {
        if (!selectedPenalty?.appeal_id) {
            toast.error("Appeal ID not found");
            return;
        }

        try {
            setProcessingAppealId(selectedPenalty.appeal_id);
            const res = await api.post("time-clock/appeal-action", {
                appeal_id: selectedPenalty.appeal_id,
                status: appealAction ? 5 : 12,
                admin_note: adminNote.trim() || null,
            });

            if (res.data?.IsSuccess) {
                toast.success(appealAction ? "Appeal approved" : "Appeal rejected");
                fetchPenalties();
                onClose();
                handleCloseDialog();
            } else {
                toast.error(res.data?.message || "Failed to process appeal");
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setProcessingAppealId(null);
        }
    };

    const handleCloseDialog = () => {
        setOpenAdminNoteDialog(false);
        setAdminNote("");
        setSelectedPenalty(null);
    };

    const handleDeletePenalty = async (penalty: PenaltyItem) => {
        try {
            setIsDeleting(true);
            const res = await api.post("time-clock/delete-penalty", {
                penalty_id: penalty.penalty_id,
            });

            if (res.data?.IsSuccess) {
                fetchPenalties();
                onClose();
            }
        } catch {
        } finally {
            setIsDeleting(false);
        }
    };

    const formatHour = (val: string | number | null | undefined): string => {
        if (val === null || val === undefined) return "-";
        const num = parseFloat(val.toString());
        if (isNaN(num)) return "-";

        const h = Math.floor(num);
        const m = Math.round((num - h) * 60);
        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box p={2}>
            {/* Header */}
            <Box display="flex" alignItems="center" mb={3}>
                <IconButton onClick={onClose}>
                    <IconArrowLeft />
                </IconButton>
                <Typography variant="h6" fontWeight={700}>
                    {date} {day}
                </Typography>
            </Box>

            {/* Penalty Cards */}
            {penalties.length > 0 ? (
                penalties.map((penalty, idx) => (
                    <Box
                        key={idx}
                        mb={2}
                        sx={{
                            borderRadius: 1,
                            p: 2,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                        }}
                    >
                        {/* Top Row */}
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Box display="flex" alignItems="center" gap={1}>
                                <Typography fontWeight={700}>
                                    {penalty.penalty_type || "Penalty"}
                                </Typography>
                                {penalty.is_penalty_appeal && (
                                    <Chip
                                        label="Appeal"
                                        size="small"
                                        color="warning"
                                    />
                                )}
                            </Box>

                            {/* Conditional Buttons */}
                            {penalty.is_penalty_appeal ? (
                                <Box display="flex" gap={1}>
                                    <Button
                                        variant="contained"
                                        color="success"
                                        size="small"
                                        disabled={processingAppealId === penalty.appeal_id}
                                        onClick={() => openAdminNotePrompt(penalty, true)}
                                        sx={{ borderRadius: 2, textTransform: "none" }}
                                    >
                                        Approve
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        size="small"
                                        disabled={processingAppealId === penalty.appeal_id}
                                        onClick={() => openAdminNotePrompt(penalty, false)}
                                        sx={{ borderRadius: 2, textTransform: "none" }}
                                    >
                                        Reject
                                    </Button>
                                </Box>
                            ) : (
                                <Button
                                    variant="outlined"
                                    color="error"
                                    size="small"
                                    disabled={isDeleting}
                                    onClick={() => handleDeletePenalty(penalty)}
                                    sx={{ borderRadius: 2, textTransform: "none" }}
                                >
                                    Delete
                                </Button>
                            )}
                        </Box>

                        <Divider sx={{ my: 1 }} />

                        {/* Info Section */}
                        <Box display="flex" flexDirection="column" gap={1}>
                            <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body2">
                                    Worklog Time:{" "}
                                    {formatHour(penalty.payable_hours)} H
                                    ({penalty.formatted_start_time || "-"}-{penalty.formatted_end_time || "-"})
                                </Typography>
                            </Box>

                            <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body2">
                                    Penalty Minute:{" "}
                                    <strong>{penalty.penalty_minutes || 0} Minutes</strong>
                                </Typography>
                            </Box>
                            {penalty.appeal_note !== null && (
                                <Box display="flex" alignItems="center" gap={1}>
                                    <Typography variant="body2">
                                        Appeal Note:{" "}
                                        <strong>{penalty.appeal_note}</strong>
                                    </Typography>
                                </Box>
                            )}
                            {isOutsideBoundaryPenalty(penalty.penalty_type) && (
                                <Box mt={1.5}>
                                    <OutsideBoundaryMap penalty={penalty} />
                                </Box>
                            )}
                        </Box>
                    </Box>
                ))
            ) : (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                    <Typography color="text.secondary">No penalties found.</Typography>
                </Box>
            )}

            {/* Admin Note Dialog */}
            <Dialog
                open={openAdminNoteDialog}
                onClose={handleCloseDialog}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {appealAction ? "Approve Appeal" : "Reject Appeal"}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Admin Note (optional)"
                        placeholder="Enter your note here..."
                        multiline
                        rows={4}
                        fullWidth
                        variant="outlined"
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button
                        onClick={handleCloseDialog}
                        sx={{ textTransform: "none" }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAdminNoteSubmit}
                        variant="contained"
                        color={appealAction ? "success" : "error"}
                        disabled={processingAppealId !== null}
                        sx={{ textTransform: "none" }}
                    >
                        {appealAction ? "Approve" : "Reject"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
