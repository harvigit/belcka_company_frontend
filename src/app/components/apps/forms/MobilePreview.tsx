'use client';

import React, {useEffect, useRef, useState} from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    Divider,
    IconButton,
    Rating,
    Stack,
    Typography,
} from '@mui/material';
import {
    IconAntennaBars5,
    IconBatteryFilled,
    IconCamera,
    IconCalendar,
    IconChevronDown,
    IconClock,
    IconDownload,
    IconFile,
    IconMapPin,
    IconMicrophone,
    IconRefresh,
    IconScan,
    IconSend,
    IconSignature,
    IconVideo,
    IconWifi,
    IconX,
} from '@tabler/icons-react';
import {
    GoogleMap,
    MarkerF,
    useJsApiLoader,
} from '@react-google-maps/api';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/material.css';
import CustomTextField from '../../forms/theme-elements/CustomTextField';
import {
    calculateFormulaValue,
    fieldConditionMatches,
    FilePreview,
    flattenFormFields,
    FormField,
    getFieldOptions,
    inputSx,
    isAudioRecordingPreview,
    isDateTimePreview,
    isEmptyValue,
    isFilePreview,
    isFilePreviewArray,
    isLocationPreview,
    labelStyle,
    LocationPreview,
    NON_INPUT_TYPES,
    PreviewErrors,
    PreviewValue,
    PreviewValues,
    subLabelStyle,
    timeOptions,
} from './common';

const FieldShell = ({field, error, children}: {
    field: FormField;
    error?: string;
    children: React.ReactNode;
}) => (
    <Box>
        <Typography sx={labelStyle}>
            {field.label}
            {field.required && !NON_INPUT_TYPES.has(field.type) && (
                <Box component="span" sx={{color: 'error.main', ml: 0.25}}>*</Box>
            )}
        </Typography>
        {field.description && (
            <Typography sx={subLabelStyle}>{field.description}</Typography>
        )}
        {children}
        {error && (
            <Typography sx={{fontSize: 11, color: 'error.main', mt: 0.5}}>
                {error}
            </Typography>
        )}
    </Box>
);

type GroupFormField = FormField & { fields?: FormField[] };
type MediaPreviewType = 'image' | 'video';

const IMAGE_UPLOAD_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic'];
const VIDEO_UPLOAD_EXTENSIONS = ['mp4', 'm4v', 'mkv', 'webm'];
const IMAGE_UPLOAD_ACCEPT = [
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.heic',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
].join(',');
const VIDEO_UPLOAD_ACCEPT = [
    '.mp4',
    '.m4v',
    '.mkv',
    '.webm',
    'video/mp4',
    'video/x-m4v',
    'video/x-matroska',
    'video/webm',
].join(',');

const groupChildFields = (field: FormField): FormField[] => {
    const groupField = field as GroupFormField;

    return Array.isArray(groupField.fields) ? groupField.fields : [];
};

const getFileExtension = (fileName: string) => {
    const extension = fileName.split('.').pop();
    return extension ? extension.toLowerCase() : '';
};

const isAllowedImageFile = (file: File) => IMAGE_UPLOAD_EXTENSIONS.includes(getFileExtension(file.name));

const isAllowedVideoFile = (file: File) => VIDEO_UPLOAD_EXTENSIONS.includes(getFileExtension(file.name));

const OptionButton = ({label, selected, multiple, image, onClick}: {
    label: string;
    selected: boolean;
    multiple?: boolean;
    image?: string;
    onClick: () => void;
}) => (
    <Box
        onClick={onClick}
        sx={{
            cursor: 'pointer',
            py: 0.25,
            border: image ? '1px solid' : 'none',
            borderColor: selected ? 'primary.main' : 'transparent',
            borderRadius: image ? 1.5 : 0,
        }}
    >
        {image && (
            <Box
                component="img"
                src={image}
                alt={label}
                sx={{width: '100%', height: 88, objectFit: 'cover', borderRadius: 1.25, mb: 0.75}}
            />
        )}
        <Stack direction="row" alignItems="center" spacing={1}>
            <Box
                sx={{
                    width: 16,
                    height: 16,
                    borderRadius: multiple ? '3px' : '50%',
                    border: selected ? '5px solid' : '1.5px solid',
                    borderColor: selected ? 'primary.main' : '#9CA3AF',
                    bgcolor: '#fff',
                    flexShrink: 0,
                    boxSizing: 'border-box',
                }}
            />
            <Typography sx={{fontSize: 13, color: '#374151'}}>{label}</Typography>
        </Stack>
    </Box>
);

const TaskChecklistCard = ({label, selected, onClick}: {
    label: string;
    selected: boolean;
    onClick: () => void;
}) => (
    <Box
        onClick={onClick}
        sx={{
            width: '100%',
            minHeight: 52,
            px: 1.5,
            py: 1.25,
            borderRadius: '10px',
            bgcolor: '#fff',
            cursor: 'pointer',
            boxSizing: 'border-box',
            boxShadow: '0 1px 0 rgba(15, 23, 42, 0.02)',
        }}
    >
        <Stack direction="row" alignItems="center" spacing={1.25}>
            <Box
                sx={{
                    width: 14,
                    height: 14,
                    borderRadius: '3px',
                    border: '1px solid',
                    borderColor: selected ? '#0B8CFF' : '#CBD5E1',
                    bgcolor: selected ? '#0B8CFF' : '#fff',
                    flexShrink: 0,
                    position: 'relative',
                    '&:after': selected ? {
                        content: '""',
                        position: 'absolute',
                        left: 3.5,
                        top: 1,
                        width: 4,
                        height: 7,
                        border: 'solid #fff',
                        borderWidth: '0 1.5px 1.5px 0',
                        transform: 'rotate(45deg)',
                    } : {},
                }}
            />
            <Typography sx={{fontSize: 13, color: '#111827', lineHeight: 1.35}}>
                {label}
            </Typography>
        </Stack>
    </Box>
);

const formatPreviewDate = (value?: string) => {
    if (!value) return 'Select date';
    const [year, month, day] = value.split('-');
    return year && month && day ? `${day}/${month}/${year}` : value;
};

const UploadResultRow = ({file, onRemove}: {
    file: FilePreview;
    onRemove: () => void;
}) => (
    <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        sx={{
            minHeight: 28,
            maxWidth: '100%',
            color: '#111827',
            fontSize: 12,
        }}
    >
        <Box
            sx={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                bgcolor: '#19C2D1',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
            }}
        >
            <IconFile size={15} />
        </Box>
        <Typography noWrap sx={{fontSize: 12, flex: 1, minWidth: 0}}>
            {file.name}
        </Typography>
        <Box
            component="button"
            type="button"
            onClick={onRemove}
            sx={{
                border: 0,
                bgcolor: 'transparent',
                color: '#9CA3AF',
                cursor: 'pointer',
                p: 0,
                lineHeight: 1,
                fontSize: 16,
            }}
        >
            ×
        </Box>
    </Stack>
);

const MediaPreviewGrid = ({files, mediaType, onRemove}: {
    files: FilePreview[];
    mediaType: MediaPreviewType;
    onRemove: (index: number) => void;
}) => {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const activeFile = activeIndex === null ? null : files[activeIndex];
    const activeMediaUrl = activeFile?.preview || activeFile?.url || '';
    const mediaLabel = mediaType === 'video' ? 'video' : 'image';

    const downloadActiveMedia = () => {
        if (!activeFile || !activeMediaUrl) return;

        const link = document.createElement('a');
        link.href = activeMediaUrl;
        link.download = activeFile.name || `uploaded-${mediaLabel}-${(activeIndex ?? 0) + 1}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        if (activeIndex !== null && !files[activeIndex]) {
            setActiveIndex(null);
        }
    }, [activeIndex, files]);

    if (!files.length) return null;

    return (
        <>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 0.75,
                }}
            >
                {files.map((file, index) => {
                    const mediaUrl = file.preview || file.url;

                    if (!mediaUrl) {
                        return (
                            <UploadResultRow
                                key={`${file.name}-${index}`}
                                file={file}
                                onRemove={() => onRemove(index)}
                            />
                        );
                    }

                    return (
                        <Box
                            key={`${file.name}-${index}`}
                            sx={{
                                position: 'relative',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                bgcolor: '#F3F4F6',
                                border: '1px solid #E5E7EB',
                                aspectRatio: '1 / 1',
                            }}
                        >
                            <Box
                                component="button"
                                type="button"
                                onClick={() => setActiveIndex(index)}
                                sx={{
                                    border: 0,
                                    p: 0,
                                    m: 0,
                                    width: '100%',
                                    height: '100%',
                                    bgcolor: 'transparent',
                                    cursor: 'pointer',
                                    display: 'block',
                                }}
                            >
                                {mediaType === 'video' ? (
                                    <Box
                                        component="video"
                                        src={mediaUrl}
                                        muted
                                        preload="metadata"
                                        sx={{
                                            width: '100%',
                                            height: '100%',
                                            display: 'block',
                                            objectFit: 'cover',
                                            pointerEvents: 'none',
                                        }}
                                    />
                                ) : (
                                    <Box
                                        component="img"
                                        src={mediaUrl}
                                        alt={file.name || `Uploaded image ${index + 1}`}
                                        sx={{
                                            width: '100%',
                                            height: '100%',
                                            display: 'block',
                                            objectFit: 'cover',
                                        }}
                                    />
                                )}
                            </Box>
                            <Box
                                component="button"
                                type="button"
                                aria-label={`Remove uploaded ${mediaLabel}`}
                                onClick={() => onRemove(index)}
                                sx={{
                                    position: 'absolute',
                                    top: 3,
                                    right: 3,
                                    width: 18,
                                    height: 18,
                                    border: 0,
                                    borderRadius: '50%',
                                    bgcolor: 'rgba(17, 24, 39, 0.72)',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    p: 0,
                                    lineHeight: '18px',
                                    fontSize: 14,
                                }}
                            >
                                ×
                            </Box>
                        </Box>
                    );
                })}
            </Box>

            <Dialog
                open={Boolean(activeFile)}
                onClose={() => setActiveIndex(null)}
                fullScreen
                PaperProps={{
                    sx: {
                        bgcolor: 'rgba(0, 0, 0, 0.78)',
                    },
                }}
            >
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{
                        minHeight: 52,
                        px: 1.25,
                        bgcolor: 'rgba(17, 24, 39, 0.92)',
                        color: '#fff',
                    }}
                >
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<IconDownload size={16} />}
                        onClick={downloadActiveMedia}
                        sx={{
                            color: '#fff',
                            borderColor: 'rgba(255,255,255,0.6)',
                            textTransform: 'none',
                            fontSize: 12,
                            '&:hover': {
                                borderColor: '#fff',
                                bgcolor: 'rgba(255,255,255,0.08)',
                            },
                        }}
                    >
                        Download {mediaLabel}
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        onClick={() => setActiveIndex(null)}
                        sx={{
                            bgcolor: 'rgba(17, 24, 39, 0.88)',
                            color: '#fff',
                            borderRadius: '999px',
                            textTransform: 'none',
                            boxShadow: 'none',
                            '&:hover': {
                                bgcolor: 'rgba(17, 24, 39, 1)',
                                boxShadow: 'none',
                            },
                        }}
                    >
                        Close
                    </Button>
                </Stack>

                <Stack
                    alignItems="center"
                    justifyContent="center"
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        p: 2,
                    }}
                >
                    {activeMediaUrl && mediaType === 'video' && (
                        <Box
                            component="video"
                            src={activeMediaUrl}
                            controls
                            autoPlay
                            sx={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                bgcolor: '#000',
                                boxShadow: '0 16px 44px rgba(0,0,0,0.35)',
                            }}
                        />
                    )}
                    {activeMediaUrl && mediaType === 'image' && (
                        <Box
                            component="img"
                            src={activeMediaUrl}
                            alt={activeFile?.name || 'Uploaded image'}
                            sx={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain',
                                bgcolor: '#fff',
                                boxShadow: '0 16px 44px rgba(0,0,0,0.35)',
                            }}
                        />
                    )}
                </Stack>
            </Dialog>
        </>
    );
};

const UploadButton = ({label, icon, accept, multiple, onFiles}: {
    label: string;
    icon: React.ReactNode;
    accept?: string;
    multiple?: boolean;
    onFiles: (files: FileList | null) => void;
}) => (
    <Button
        component="label"
        variant="outlined"
        fullWidth
        sx={{
            minHeight: 40,
            borderColor: '#D7DCE1',
            borderRadius: '999px',
            bgcolor: '#fff',
            color: '#0B8CFF',
            textTransform: 'none',
            fontSize: 13,
            fontWeight: 600,
            '&:hover': {
                borderColor: '#D7DCE1',
                bgcolor: '#fff',
                color: '#0B8CFF',
                fontWeight: 600,
                textDecoration: 'none',
            },
        }}
    >
        <PillActionButton icon={icon} label={label} />
        <input
            hidden
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={(event) => {
                onFiles(event.target.files);
                event.target.value = '';
            }}
        />
    </Button>
);

const PillActionButton = ({icon, label, selected}: {
    icon: React.ReactNode;
    label: string;
    selected?: boolean;
}) => (
    <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
        <Box sx={{display: 'flex', color: selected ? 'primary.main' : '#2F80ED'}}>
            {icon}
        </Box>
        <Typography sx={{fontSize: 13, fontWeight: 600}}>
            {label}
        </Typography>
    </Stack>
);

const LocationMapPreview = ({location, onRefresh}: {
    location: LocationPreview;
    onRefresh?: () => void;
}) => {
    const latitude = String(location.latitude);
    const longitude = String(location.longitude);
    const numericLatitude = Number(location.latitude);
    const numericLongitude = Number(location.longitude);
    const hasValidCoordinates = Number.isFinite(numericLatitude) && Number.isFinite(numericLongitude);
    const position = hasValidCoordinates ? {lat: numericLatitude, lng: numericLongitude} : null;
    const {isLoaded: isMapLoaded, loadError: mapLoadError} = useJsApiLoader({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
    });

    return (
    <Box
        sx={{
            border: '1px solid #E5E7EB',
            borderRadius: '10px',
            overflow: 'hidden',
            bgcolor: '#fff',
        }}
    >
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{px: 1.25, py: 1}}>
            <Typography sx={{fontSize: 11, color: '#4B5563', lineHeight: 1.35}}>
                Latitude: {latitude}
                <br />
                Longitude: {longitude}
                {location.accuracy ? (
                    <>
                        <br />
                        Accuracy: {Math.round(location.accuracy)}m
                    </>
                ) : null}
            </Typography>
            {onRefresh && (
                <IconButton size="small" onClick={onRefresh} sx={{mt: -0.5, mr: -0.5}}>
                    <IconRefresh size={15} />
                </IconButton>
            )}
        </Stack>
        <Box sx={{height: 180, borderTop: '1px solid #E5E7EB', touchAction: 'none'}}>
            {position && isMapLoaded && !mapLoadError ? (
                <GoogleMap
                    mapContainerStyle={{width: '100%', height: '100%'}}
                    center={position}
                    zoom={16}
                    options={{
                        clickableIcons: false,
                        fullscreenControl: false,
                        gestureHandling: 'greedy',
                        mapTypeControl: false,
                        streetViewControl: false,
                        zoomControl: true,
                    }}
                >
                    <MarkerF position={position} />
                </GoogleMap>
            ) : (
                <Stack alignItems="center" justifyContent="center" sx={{height: '100%', px: 2}}>
                    <Typography sx={{fontSize: 11, color: '#9CA3AF', textAlign: 'center'}}>
                        {position ? 'Map is loading...' : 'Location coordinates are not valid.'}
                    </Typography>
                </Stack>
            )}
        </Box>
    </Box>
    );
};

const SignatureInput = ({value, onChange}: {
    value: string;
    onChange: (value: string) => void;
}) => {
    const [open, setOpen] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const drawingRef = useRef(false);
    const hasInkRef = useRef(false);

    const resizeCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.floor(rect.width * ratio));
        canvas.height = Math.max(1, Math.floor(rect.height * ratio));

        const context = canvas.getContext('2d');
        if (!context) return;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.lineWidth = 2.5;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.strokeStyle = '#111';

        if (value) {
            const image = new window.Image();
            image.onload = () => context.drawImage(image, 0, 0, rect.width, rect.height);
            image.src = value;
            hasInkRef.current = true;
        } else {
            hasInkRef.current = false;
        }
    };

    useEffect(() => {
        if (!open) return;
        const timer = window.setTimeout(resizeCanvas, 0);
        return () => window.clearTimeout(timer);
    }, [open]);

    const pointerPosition = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        const rect = canvas?.getBoundingClientRect();
        return {
            x: event.clientX - (rect?.left || 0),
            y: event.clientY - (rect?.top || 0),
        };
    };

    const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!canvas || !context) return;

        drawingRef.current = true;
        hasInkRef.current = true;
        canvas.setPointerCapture(event.pointerId);
        const point = pointerPosition(event);
        context.beginPath();
        context.moveTo(point.x, point.y);
    };

    const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drawingRef.current) return;

        const context = canvasRef.current?.getContext('2d');
        if (!context) return;
        const point = pointerPosition(event);
        context.lineTo(point.x, point.y);
        context.stroke();
    };

    const stopDrawing = () => {
        drawingRef.current = false;
    };

    const resetSignature = () => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!canvas || !context) return;
        context.clearRect(0, 0, canvas.width, canvas.height);
        hasInkRef.current = false;
    };

    const confirmSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas || !hasInkRef.current) {
            onChange('');
            setOpen(false);
            return;
        }

        onChange(canvas.toDataURL('image/png'));
        setOpen(false);
    };

    return (
        <>
            {value ? (
                <Box sx={{position: 'relative', minHeight: 118, pt: 0.5}}>
                    <IconButton
                        size="small"
                        onClick={() => onChange('')}
                        sx={{position: 'absolute', top: -28, right: -4, color: '#9CA3AF'}}
                    >
                        <IconRefresh size={17} />
                    </IconButton>
                    <Box
                        component="img"
                        src={value}
                        alt="Signature"
                        onClick={() => setOpen(true)}
                        sx={{
                            display: 'block',
                            width: '100%',
                            height: 92,
                            objectFit: 'contain',
                            cursor: 'pointer',
                        }}
                    />
                </Box>
            ) : (
                <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => setOpen(true)}
                    sx={{
                        minHeight: 40,
                        borderColor: '#D7DCE1',
                        borderRadius: '999px',
                        bgcolor: '#fff',
                        color: '#2F80ED',
                        textTransform: 'none',
                        fontSize: 13,
                        fontWeight: 600,
                        '&:hover': {
                            borderColor: '#D7DCE1',
                            bgcolor: '#fff',
                            color: '#2F80ED',
                            fontWeight: 600,
                            textDecoration: 'none',
                        },
                    }}
                >
                    <PillActionButton icon={<IconSignature size={17} />} label="Click to sign" />
                </Button>
            )}

            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                fullWidth
                maxWidth="xs"
                PaperProps={{
                    sx: {
                        borderRadius: 0.75,
                        boxShadow: '0 12px 34px rgba(0,0,0,0.35)',
                    },
                }}
            >
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="center"
                    sx={{position: 'relative', minHeight: 56, borderBottom: '1px solid #E5E7EB'}}
                >
                    <Typography sx={{fontSize: 16, color: '#A3AAB2'}}>Sign</Typography>
                    <IconButton
                        size="small"
                        onClick={() => setOpen(false)}
                        sx={{position: 'absolute', right: 10, top: 10, color: '#A3AAB2'}}
                    >
                        <IconX size={20} />
                    </IconButton>
                </Stack>
                <DialogContent sx={{p: 1.5}}>
                    <Box
                        component="canvas"
                        ref={canvasRef}
                        onPointerDown={startDrawing}
                        onPointerMove={draw}
                        onPointerUp={stopDrawing}
                        onPointerCancel={stopDrawing}
                        sx={{
                            display: 'block',
                            width: '100%',
                            height: 148,
                            border: '1px solid #D1D5DB',
                            bgcolor: '#fff',
                            touchAction: 'none',
                            cursor: 'crosshair',
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{borderTop: '1px solid #E5E7EB', px: 1.5, py: 1.25}}>
                    <Button
                        variant="outlined"
                        onClick={resetSignature}
                        sx={{borderRadius: '999px', textTransform: 'none', color: '#A3AAB2', borderColor: '#E5E7EB'}}
                    >
                        Reset
                    </Button>
                    <Button
                        variant="contained"
                        onClick={confirmSignature}
                        sx={{borderRadius: '999px', textTransform: 'none', bgcolor: '#0B8CFF'}}
                    >
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

const PreviewField = ({
    field,
    fields,
    value,
    error,
    errors,
    values,
    onChange,
}: {
    field: FormField;
    fields: FormField[];
    value: PreviewValue;
    error?: string;
    errors?: PreviewErrors;
    values: PreviewValues;
    onChange: (fieldId: string, value: PreviewValue) => void;
}) => {
    const stringValue = typeof value === 'string' ? value : '';
    const stringArrayValue = Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : [];
    const locationValue = isLocationPreview(value) ? value : null;
    const audioValue = isAudioRecordingPreview(value) ? value : null;
    const dateTimeValue = isDateTimePreview(value) ? value : {};
    const fileValues = isFilePreviewArray(value) ? value : isFilePreview(value) ? [value] : [];
    const [isLocating, setIsLocating] = useState(false);
    const [locationError, setLocationError] = useState('');
    const [isRecordingAudio, setIsRecordingAudio] = useState(false);
    const [audioError, setAudioError] = useState('');
    const currentLocationRequestedRef = useRef(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioStreamRef = useRef<MediaStream | null>(null);

    const toggleArrayValue = (option: string) => {
        onChange(
            field.id,
            stringArrayValue.includes(option)
                ? stringArrayValue.filter((item) => item !== option)
                : [...stringArrayValue, option],
        );
    };

    const buildFilePreview = (file: File): Promise<FilePreview> => new Promise((resolve) => {
        const nextValue: FilePreview = {
            name: file.name,
            mimeType: file.type,
            url: URL.createObjectURL(file),
        };

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = () => {
                resolve({...nextValue, preview: String(reader.result)});
            };
            reader.readAsDataURL(file);
            return;
        }

        resolve(nextValue);
    });

    const handleFilesChange = async (files: FileList | null) => {
        const selectedFiles = Array.from(files || []).filter((file) => {
            if (field.type === 'Scanner' || field.type === 'Image upload') {
                return isAllowedImageFile(file);
            }

            if (field.type === 'Video upload') {
                return isAllowedVideoFile(file);
            }

            return true;
        });

        if (!selectedFiles.length) return;

        const previews = await Promise.all(selectedFiles.map(buildFilePreview));
        if (field.allowMultipleUploads) {
            onChange(field.id, [...fileValues, ...previews]);
            return;
        }

        onChange(field.id, previews[0]);
    };

    const removeUpload = (index: number) => {
        const nextFiles = fileValues.filter((_, fileIndex) => fileIndex !== index);
        onChange(field.id, field.allowMultipleUploads ? nextFiles : null);
    };

    const setDateTimeValue = (key: 'date' | 'time', nextValue: string) => {
        onChange(field.id, {...dateTimeValue, [key]: nextValue});
    };

    const updateManualLocation = (nextValue: string) => {
        const [latitude = '', longitude = ''] = nextValue.split(',').map((item) => item.trim());

        onChange(field.id, {
            source: 'manual',
            latitude,
            longitude,
        });
        setLocationError('');
    };

    const captureCurrentLocation = () => {
        if (!navigator?.geolocation) {
            setLocationError('Current location is not supported by this browser.');
            return;
        }

        setIsLocating(true);
        setLocationError('');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                onChange(field.id, {
                    source: 'current',
                    latitude: String(position.coords.latitude),
                    longitude: String(position.coords.longitude),
                    accuracy: position.coords.accuracy,
                });
                setIsLocating(false);
            },
            (geoError) => {
                setLocationError(geoError.message || 'Unable to fetch current location.');
                setIsLocating(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0,
            },
        );
    };

    useEffect(() => {
        if (field.type !== 'Location' || field.locationSelectBy === 'manual') return;
        if (currentLocationRequestedRef.current) return;

        currentLocationRequestedRef.current = true;
        captureCurrentLocation();
    }, [field.id, field.locationSelectBy, field.type]);

    const stopAudioStream = () => {
        audioStreamRef.current?.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
    };

    const startAudioRecording = async () => {
        if (!navigator?.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
            setAudioError('Audio recording is not supported by this browser.');
            return;
        }

        try {
            setAudioError('');
            const stream = await navigator.mediaDevices.getUserMedia({audio: true});
            const recorder = new MediaRecorder(stream);

            audioChunksRef.current = [];
            audioStreamRef.current = stream;
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            recorder.onstop = () => {
                const mimeType = recorder.mimeType || 'audio/webm';
                const blob = new Blob(audioChunksRef.current, {type: mimeType});
                const url = URL.createObjectURL(blob);

                onChange(field.id, {
                    name: `Audio recording ${new Date().toLocaleTimeString()}`,
                    url,
                    mimeType,
                    size: blob.size,
                });
                setIsRecordingAudio(false);
                stopAudioStream();
            };

            recorder.start();
            setIsRecordingAudio(true);
        } catch (recordingError) {
            setAudioError(recordingError instanceof Error ? recordingError.message : 'Unable to start audio recording.');
            setIsRecordingAudio(false);
            stopAudioStream();
        }
    };

    const stopAudioRecording = () => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
            return;
        }

        setIsRecordingAudio(false);
        stopAudioStream();
    };

    useEffect(() => {
        return () => {
            if (mediaRecorderRef.current?.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            stopAudioStream();
        };
    }, []);

    switch (field.type) {
        case 'Description':
            return (
                <Box
                    sx={{
                        width: '100%',
                        maxWidth: '100%',
                        boxSizing: 'border-box',
                        overflowX: 'hidden',
                        fontSize: 13,
                        color: '#6B7280',
                        lineHeight: 1.5,
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-word',
                        '& p': {my: 0.5},
                        '& ul, & ol': {pl: 2.5, my: 0.5},
                        '& img': {maxWidth: '100%', height: 'auto', display: 'block', my: 0.75},
                        '& em, & i, & span[style*="italic"]': {
                            fontStyle: 'italic !important',
                        },
                        '& table': {
                            width: '100% !important',
                            maxWidth: '100%',
                            tableLayout: 'fixed',
                            borderCollapse: 'collapse',
                            my: 0.75,
                        },
                        '& td, & th': {
                            borderWidth: 'var(--table-border-width, 1px)',
                            borderStyle: 'var(--table-border-style, solid)',
                            borderColor: 'var(--table-border-color, #D1D5DB)',
                            minWidth: 0,
                            maxWidth: 0,
                            padding: 'var(--table-cell-padding, 2px 4px)',
                            fontSize: 11,
                            lineHeight: 1.35,
                            whiteSpace: 'normal',
                            overflowWrap: 'anywhere',
                            wordBreak: 'break-word',
                        },
                        '& a': {color: '#1976d2', textDecoration: 'underline'},
                    }}
                    dangerouslySetInnerHTML={{__html: field.label}}
                />
            );

        case 'Dropdown':
        case 'Image selection': {
            const options = getFieldOptions(field, ['Option 1', 'Option 2']);
            const isMultiple = Boolean(field.multipleSelection);

            return (
                <FieldShell field={field} error={error}>
                    <Stack spacing={0.75} mt={0.5}>
                        {options.map((opt, index) => (
                            <OptionButton
                                key={`${opt}-${index}`}
                                label={opt}
                                multiple={isMultiple}
                                image={field.type === 'Image selection' ? field.optionImages?.[index] : undefined}
                                selected={isMultiple ? stringArrayValue.includes(opt) : stringValue === opt}
                                onClick={() => isMultiple ? toggleArrayValue(opt) : onChange(field.id, opt)}
                            />
                        ))}
                    </Stack>
                </FieldShell>
            );
        }

        case 'Yes/No':
            {
                const values = getFieldOptions(field, ['Yes', 'No']).slice(0, 2);

                return (
                    <FieldShell field={field} error={error}>
                        <Stack direction="row" spacing={1} mt={0.75}>
                            {values.map((opt) => {
                                const selected = stringValue === opt;
                                return (
                                    <Box
                                        key={opt}
                                        onClick={() => onChange(field.id, opt)}
                                        sx={{
                                            px: 2.5,
                                            py: 0.75,
                                            border: '1px solid',
                                            borderColor: selected ? 'primary.main' : '#D1D5DB',
                                            borderRadius: '20px',
                                            fontSize: 13,
                                            color: selected ? 'primary.main' : '#374151',
                                            bgcolor: selected ? 'primary.light' : '#fff',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {opt}
                                    </Box>
                                );
                            })}
                        </Stack>
                    </FieldShell>
                );
            }

        case 'Rating': {
            const ratingStarCount = Math.min(5, Math.max(3, Number(field.ratingStarCount) || 5));
            return (
                <FieldShell field={field} error={error}>
                    <Rating
                        value={typeof value === 'number' ? value : 0}
                        max={ratingStarCount}
                        size="medium"
                        sx={{
                            mt: 0.75,
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                            '& .MuiRating-icon': {
                                mx: 0,
                                fontSize: 28,
                            },
                        }}
                        onChange={(_, nextValue) => onChange(field.id, nextValue || 0)}
                    />
                    {(field.ratingMinLabel || field.ratingMaxLabel) && (
                        <Stack direction="row" justifyContent="space-between" sx={{mt: 0.75}}>
                            <Typography fontSize={12} color="text.secondary">
                                {field.ratingMinLabel || 'Meh..'}
                            </Typography>
                            <Typography fontSize={12} color="text.secondary">
                                {field.ratingMaxLabel || 'Nice!'}
                            </Typography>
                        </Stack>
                    )}
                </FieldShell>
            );
        }

        case 'Date':
            {
                const showDate = field.dateIncludeDate !== false;
                const showTime = Boolean(field.dateIncludeTime);

            return (
                <FieldShell field={field} error={error}>
                    <Stack spacing={0.75}>
                        {showDate && (
                            <Box
                                component="label"
                                sx={{
                                    minHeight: 42,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    px: 1.5,
                                    borderRadius: '8px',
                                    bgcolor: '#fff',
                                    cursor: 'pointer',
                                    position: 'relative',
                                }}
                            >
                                <IconCalendar size={16} color="#9CA3AF" />
                                <Typography sx={{fontSize: 13, color: dateTimeValue.date ? '#111827' : '#9CA3AF', flex: 1}}>
                                    {formatPreviewDate(dateTimeValue.date)}
                                </Typography>
                                <IconChevronDown size={14} color="#9CA3AF" />
                                <Box
                                    component="input"
                                    type="date"
                                    value={dateTimeValue.date || ''}
                                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setDateTimeValue('date', event.target.value)}
                                    sx={{position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer'}}
                                />
                            </Box>
                        )}
                        {showTime && (
                            <Box
                                sx={{
                                    minHeight: 42,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    px: 1.5,
                                    borderRadius: '8px',
                                    bgcolor: '#fff',
                                    position: 'relative',
                                }}
                            >
                                <IconClock size={16} color="#9CA3AF" />
                                <Box
                                    component="select"
                                    value={dateTimeValue.time || ''}
                                    onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setDateTimeValue('time', event.target.value)}
                                    sx={{
                                        flex: 1,
                                        border: 0,
                                        outline: 0,
                                        bgcolor: 'transparent',
                                        color: dateTimeValue.time ? '#111827' : '#9CA3AF',
                                        fontSize: 13,
                                        appearance: 'none',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <option value="">Select time</option>
                                    {timeOptions.map((time) => (
                                        <option key={time} value={time}>{time}</option>
                                    ))}
                                </Box>
                                <IconChevronDown size={14} color="#9CA3AF" />
                            </Box>
                        )}
                    </Stack>
                </FieldShell>
            );
            }

        case 'Phone':
            return (
                <FieldShell field={field} error={error}>
                    <Box
                        sx={{
                            '& .react-tel-input': {
                                width: '100%',
                                height: 40,
                                fontFamily: 'inherit',
                                '& *': {
                                    boxSizing: 'border-box',
                                },
                            },
                            '& .react-tel-input .form-control': {
                                width: '100% !important',
                                height: '40px !important',
                                minHeight: '40px !important',
                                lineHeight: '40px !important',
                                paddingTop: '0 !important',
                                paddingBottom: '0 !important',
                                paddingLeft: '48px !important',
                                borderColor: error ? '#FA896B !important' : '#c0d1dc9c !important',
                                borderRadius: '6px !important',
                                fontSize: '13px !important',
                                textAlign: 'left !important',
                                color: '#374151 !important',
                                backgroundColor: '#fff !important',
                            },
                            '& .react-tel-input .flag-dropdown': {
                                height: '40px !important',
                                borderColor: error ? '#FA896B !important' : '#c0d1dc9c !important',
                                borderRadius: '6px 0 0 6px !important',
                                backgroundColor: '#fff !important',
                            },
                            '& .react-tel-input .selected-flag': {
                                width: '42px !important',
                                height: '38px !important',
                                padding: '0 0 0 10px !important',
                                borderRadius: '6px 0 0 6px !important',
                            },
                            '& .react-tel-input .selected-flag .arrow': {
                                left: '24px !important',
                            },
                            '& .react-tel-input .country-list': {
                                width: '260px !important',
                                maxWidth: 'calc(100vw - 56px)',
                                maxHeight: '220px',
                                marginTop: '6px',
                                textAlign: 'left !important',
                                borderRadius: '8px',
                                boxShadow: '0 12px 30px rgba(15, 23, 42, 0.16)',
                                overflowX: 'hidden',
                                zIndex: 20,
                            },
                            '& .react-tel-input .country-list .country': {
                                display: 'flex',
                                alignItems: 'center',
                                minHeight: 34,
                                padding: '7px 9px 7px 44px',
                                fontSize: 12,
                                textAlign: 'left',
                            },
                            '& .react-tel-input .country-list .search': {
                                padding: '8px',
                                backgroundColor: '#fff',
                            },
                            '& .react-tel-input .country-list .search-box': {
                                width: '100%',
                                height: '34px',
                                margin: 0,
                                borderRadius: '6px',
                                fontSize: 12,
                                textAlign: 'left',
                            },
                        }}
                    >
                        <PhoneInput
                            inputClass="phone-input"
                            country="gb"
                            value={stringValue}
                            onChange={(phoneValue: string) => onChange(field.id, phoneValue)}
                            inputStyle={{
                                width: '100%',
                                height: '40px',
                                borderColor: '#c0d1dc9c',
                                textAlign: 'left',
                            }}
                            buttonStyle={{
                                height: '40px',
                                borderColor: error ? '#FA896B' : '#c0d1dc9c',
                                borderRadius: '6px 0 0 6px',
                                backgroundColor: '#fff',
                            }}
                            dropdownStyle={{
                                width: '260px',
                                maxHeight: '220px',
                            }}
                            enableSearch
                            inputProps={{required: field.required}}
                        />
                    </Box>
                </FieldShell>
            );

        case 'Number':
            return (
                <FieldShell field={field} error={error}>
                    <CustomTextField
                        fullWidth
                        size="small"
                        type="number"
                        placeholder="0"
                        value={stringValue}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(field.id, event.target.value)}
                        sx={inputSx}
                        inputProps={{style: {textAlign: 'left'}}}
                    />
                </FieldShell>
            );

        case 'Numbers slider':
            {
                const min = typeof field.minValue === 'number' ? field.minValue : 0;
                const max = typeof field.maxValue === 'number' && field.maxValue > min ? field.maxValue : 100;
                const currentValue = typeof value === 'number' ? value : min;

                return (
                    <FieldShell field={field} error={error}>
                        <Stack spacing={0.75}>
                            <Box
                                component="input"
                                type="range"
                                min={min}
                                max={max}
                                value={currentValue}
                                onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(field.id, Number(event.target.value))}
                                style={{width: '100%'}}
                            />
                            <Typography sx={{fontSize: 12, color: '#6B7280'}}>
                                Value: {currentValue}
                            </Typography>
                        </Stack>
                    </FieldShell>
                );
            }

        case 'Email':
            return (
                <FieldShell field={field} error={error}>
                    <CustomTextField
                        fullWidth
                        size="small"
                        type="email"
                        placeholder="email@example.com"
                        value={stringValue}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(field.id, event.target.value)}
                        sx={inputSx}
                        inputProps={{style: {textAlign: 'left'}}}
                    />
                </FieldShell>
            );

        case 'Signature':
            return (
                <FieldShell field={field} error={error}>
                    <SignatureInput value={stringValue} onChange={(signature) => onChange(field.id, signature)} />
                </FieldShell>
            );

        case 'Audio recording':
            return (
                <FieldShell field={field} error={error}>
                    <Stack spacing={1}>
                        {audioValue?.url && (
                            <Box
                                sx={{
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '10px',
                                    bgcolor: '#F9FAFB',
                                    p: 1,
                                }}
                            >
                                <Typography sx={{fontSize: 11, color: '#6B7280', mb: 0.75}}>
                                    {audioValue.name}
                                </Typography>
                                <Box
                                    component="audio"
                                    src={audioValue.url}
                                    controls
                                    sx={{width: '100%', height: 34, display: 'block'}}
                                />
                            </Box>
                        )}
                        <Button
                            variant="outlined"
                            fullWidth
                            onClick={isRecordingAudio ? stopAudioRecording : startAudioRecording}
                            sx={{
                                minHeight: 40,
                                borderColor: isRecordingAudio || audioValue ? 'primary.main' : '#D7DCE1',
                                borderRadius: '999px',
                                bgcolor: '#fff',
                                color: isRecordingAudio ? 'error.main' : '#2F80ED',
                                textTransform: 'none',
                                fontSize: 13,
                                fontWeight: 600,
                                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
                                '&:hover': {
                                    borderColor: isRecordingAudio || audioValue ? 'primary.main' : '#D7DCE1',
                                    bgcolor: '#fff',
                                    color: isRecordingAudio ? 'error.main' : '#2F80ED',
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                },
                            }}
                        >
                            <PillActionButton
                                icon={<IconMicrophone size={17} />}
                                label={isRecordingAudio ? 'Stop recording' : audioValue ? 'Record again' : 'Record audio'}
                                selected={Boolean(audioValue) || isRecordingAudio}
                            />
                        </Button>
                        {audioError && (
                            <Typography sx={{fontSize: 11, color: 'error.main'}}>
                                {audioError}
                            </Typography>
                        )}
                    </Stack>
                </FieldShell>
            );

        case 'Image upload':
        case 'Video upload':
        case 'File upload': {
            const label = fileValues.length ? 'Upload more files' : field.type === 'Image upload'
                ? 'Upload an image'
                : field.type === 'Video upload'
                    ? 'Upload a video'
                    : 'Upload a file';
            const accept =
                field.type === 'Image upload'
                    ? IMAGE_UPLOAD_ACCEPT
                    : field.type === 'Video upload'
                        ? VIDEO_UPLOAD_ACCEPT
                        : undefined;
            const icon = field.type === 'Video upload'
                ? <IconVideo size={17} />
                : field.type === 'File upload'
                    ? <IconFile size={17} />
                    : <IconCamera size={17} />;
            const mediaPreviewType: MediaPreviewType | null = field.type === 'Image upload'
                ? 'image'
                : field.type === 'Video upload'
                    ? 'video'
                    : null;

            return (
                <FieldShell field={field} error={error}>
                    <Stack spacing={0.75}>
                        {mediaPreviewType ? (
                            <MediaPreviewGrid
                                files={fileValues}
                                mediaType={mediaPreviewType}
                                onRemove={removeUpload}
                            />
                        ) : (
                            fileValues.map((file, index) => (
                                <UploadResultRow key={`${file.name}-${index}`} file={file} onRemove={() => removeUpload(index)} />
                            ))
                        )}
                        {(field.allowMultipleUploads || fileValues.length === 0) && (
                            <UploadButton
                                label={label}
                                icon={icon}
                                accept={accept}
                                multiple={field.allowMultipleUploads}
                                onFiles={handleFilesChange}
                            />
                        )}
                    </Stack>
                </FieldShell>
            );
        }

        case 'Location':
            {
                const isManualLocation = field.locationSelectBy === 'manual';

                return (
                    <FieldShell field={field} error={error}>
                        {isManualLocation ? (
                            <Stack spacing={1}>
                                <CustomTextField
                                    fullWidth
                                    size="small"
                                    placeholder="Latitude, Longitude"
                                    value={locationValue ? `${locationValue.latitude}${locationValue.longitude ? `, ${locationValue.longitude}` : ''}` : ''}
                                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => updateManualLocation(event.target.value)}
                                    sx={inputSx}
                                    inputProps={{style: {textAlign: 'left'}}}
                                />
                                <Typography sx={{fontSize: 10.5, color: '#9CA3AF'}}>
                                    Example: 23.0225, 72.5714
                                </Typography>
                                {locationValue && !isEmptyValue(locationValue) && (
                                    <LocationMapPreview location={locationValue} />
                                )}
                            </Stack>
                        ) : (
                            <Stack spacing={1}>
                                {locationValue && !isEmptyValue(locationValue) && (
                                    <LocationMapPreview location={locationValue} onRefresh={captureCurrentLocation} />
                                )}
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    onClick={captureCurrentLocation}
                                    disabled={isLocating}
                                    sx={{
                                        minHeight: 40,
                                        borderRadius: '999px',
                                        borderColor: locationValue ? 'primary.main' : '#D7DCE1',
                                        bgcolor: '#fff',
                                        color: '#2F80ED',
                                        textTransform: 'none',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        '&:hover': {
                                            borderColor: locationValue ? 'primary.main' : '#D7DCE1',
                                            bgcolor: '#fff',
                                            color: '#2F80ED',
                                            fontWeight: 600,
                                            textDecoration: 'none',
                                        },
                                    }}
                                >
                                    <PillActionButton
                                        icon={<IconMapPin size={17} />}
                                        label={isLocating ? 'Getting location...' : locationValue ? 'Update location' : 'Add location'}
                                        selected={Boolean(locationValue)}
                                    />
                                </Button>
                            </Stack>
                        )}
                        {locationError && (
                            <Typography sx={{fontSize: 11, color: 'error.main', mt: 0.5}}>
                                {locationError}
                            </Typography>
                        )}
                    </FieldShell>
                );
            }

        case 'Open ended':
            return (
                <FieldShell field={field} error={error}>
                    <CustomTextField
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="Enter your answer..."
                        value={stringValue}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(field.id, event.target.value)}
                        sx={inputSx}
                        inputProps={{style: {textAlign: 'left'}}}
                    />
                </FieldShell>
            );

        case 'Formula':
            {
                const formulaValue = calculateFormulaValue(field, fields, values);

            return (
                <Box>
                    <Typography sx={labelStyle}>{field.label}</Typography>
                    <Box
                        sx={{
                            width: '100%',
                            border: '1px solid #D1D5DB',
                            borderRadius: '6px',
                            padding: '7px 10px',
                            fontSize: 13,
                            color: '#9CA3AF',
                            background: '#fff',
                            boxSizing: 'border-box',
                        }}
                    >
                        {formulaValue || '0'}
                    </Box>
                </Box>
            );
            }

        case 'Group': {
            const childFields = groupChildFields(field);

            return (
                <Box>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                        <Typography
                            sx={{
                                fontSize: 13,
                                fontWeight: 800,
                                color: '#111827',
                            }}
                        >
                            {field.label}
                        </Typography>
                        {field.multipleSelection && (
                            <IconRefresh size={15} color="#9CA3AF" />
                        )}
                    </Stack>
                    {field.description && (
                        <Typography sx={subLabelStyle}>{field.description}</Typography>
                    )}
                    <Stack spacing={1}>
                        {childFields
                            .filter((child) => fieldConditionMatches(child, values))
                            .map((child) => (
                                <Box
                                    key={child.id}
                                    sx={{
                                        px: 1.25,
                                        py: 1.2,
                                        bgcolor: '#fff',
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '10px',
                                    }}
                                >
                                    <PreviewField
                                        field={child}
                                        fields={fields}
                                        value={values[child.id] ?? null}
                                        error={errors?.[child.id]}
                                        errors={errors}
                                        values={values}
                                        onChange={onChange}
                                    />
                                </Box>
                            ))}
                        {childFields.length === 0 && (
                            <Typography sx={{fontSize: 12, color: '#9CA3AF'}}>
                                No fields in this group.
                            </Typography>
                        )}
                    </Stack>
                </Box>
            );
        }


        case 'Scanner':
            return (
                <FieldShell field={field} error={error}>
                    <Stack spacing={0.75}>
                        <MediaPreviewGrid files={fileValues} mediaType="image" onRemove={removeUpload} />
                        {(field.allowMultipleUploads || fileValues.length === 0) && (
                            <UploadButton
                                label={fileValues.length ? 'Scan more files' : 'Scan'}
                                icon={<IconScan size={17} />}
                                accept={IMAGE_UPLOAD_ACCEPT}
                                multiple={field.allowMultipleUploads}
                                onFiles={handleFilesChange}
                            />
                        )}
                    </Stack>
                </FieldShell>
            );

        case 'Task': {
            const tasks = field.options?.length ? field.options : [field.label || 'Task'];

            return (
                <Box>
                    <Stack spacing={1}>
                        {tasks.map((task, index) => {
                            const isMultiTask = tasks.length > 1;
                            const selected = isMultiTask ? stringArrayValue.includes(task) : stringValue === 'done';

                            return (
                            <TaskChecklistCard
                                key={`${task}-${index}`}
                                label={task}
                                selected={selected}
                                onClick={() => isMultiTask
                                    ? toggleArrayValue(task)
                                    : onChange(field.id, selected ? '' : 'done')}
                            />
                            );
                        })}
                    </Stack>
                    {error && (
                        <Typography sx={{fontSize: 11, color: 'error.main', mt: 0.5}}>
                            {error}
                        </Typography>
                    )}
                </Box>
            );
        }

        default:
            return (
                <FieldShell field={field} error={error}>
                    <CustomTextField
                        fullWidth
                        size="small"
                        placeholder="Enter answer..."
                        value={stringValue}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(field.id, event.target.value)}
                        sx={inputSx}
                    />
                </FieldShell>
            );
    }
};

/* Phone shell */
const MobilePreview = ({fields, title = ''}: { fields: FormField[]; title?: string; }) => {
    const [values, setValues] = useState<PreviewValues>({});
    const [errors, setErrors] = useState<PreviewErrors>({});
    const [submitMessage, setSubmitMessage] = useState('');
    const formTitle = title.trim();
    const visibleFields = fields.filter((field) => fieldConditionMatches(field, values));
    const allFields = flattenFormFields(fields);

    useEffect(() => {
        setValues({});
        setErrors({});
        setSubmitMessage('');
    }, [fields]);

    const handleChange = (fieldId: string, value: PreviewValue) => {
        setValues((prev) => ({...prev, [fieldId]: value}));
        setErrors((prev) => {
            if (!prev[fieldId]) return prev;
            const next = {...prev};
            delete next[fieldId];
            return next;
        });
        setSubmitMessage('');
    };

    const validatePreview = () => {
        const nextErrors: PreviewErrors = {};

        const validateField = (field: FormField) => {
            if (NON_INPUT_TYPES.has(field.type)) return;

            const fieldValue = values[field.id] ?? null;
            const isPhoneEmpty = field.type === 'Phone'
                && (typeof fieldValue !== 'string' || fieldValue.replace(/\D/g, '').length <= 3);
            const isDateIncomplete = field.type === 'Date' && isDateTimePreview(fieldValue)
                && ((field.dateIncludeDate !== false && !fieldValue.date) || (field.dateIncludeTime && !fieldValue.time));

            if (field.required && (isEmptyValue(fieldValue) || isPhoneEmpty || isDateIncomplete)) {
                nextErrors[field.id] = 'This field is required.';
                return;
            }

            if (field.type === 'Email' && typeof fieldValue === 'string' && fieldValue.trim()) {
                const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fieldValue.trim());
                if (!isValidEmail) {
                    nextErrors[field.id] = 'Enter a valid email address.';
                }
            }
        };

        const walkVisibleFields = (items: FormField[]) => {
            items
                .filter((field) => fieldConditionMatches(field, values))
                .forEach((field) => {
                    if (field.type === 'Group') {
                        walkVisibleFields(groupChildFields(field));
                        return;
                    }
                    validateField(field);
                });
        };

        walkVisibleFields(fields);

        setErrors(nextErrors);
        const isValid = Object.keys(nextErrors).length === 0;
        setSubmitMessage(isValid ? 'Preview submitted successfully. No validation errors found.' : 'Please fix the highlighted fields.');
        return isValid;
    };

    const resetPreview = () => {
        setValues({});
        setErrors({});
        setSubmitMessage('');
    };

    return (
        <Stack alignItems="center" spacing={2} sx={{py: 1}}>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                Mobile Preview
            </Typography>

            <Box
                sx={{
                    width: 300,
                    maxWidth: '100%',
                    position: 'relative',
                }}
            >
                {/* Outer shell */}
                <Box
                    sx={{
                        border: '8px solid #ECEFF1',
                        borderRadius: '34px',
                        overflow: 'hidden',
                        boxShadow: '0 0 0 1px #D7DCE1, 0 18px 38px rgba(15, 23, 42, 0.14)',
                        bgcolor: '#F3F4F6',
                        display: 'flex',
                        flexDirection: 'column',
                        height: 580,
                    }}
                >
                    {/* Status bar */}
                    <Box
                        sx={{
                            bgcolor: '#F9FAFB',
                            px: 2,
                            pt: 1.25,
                            pb: 0.75,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexShrink: 0,
                        }}
                    >
                        <Typography sx={{fontSize: 11, fontWeight: 700, color: '#111827'}}>
                            9:41
                        </Typography>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                            <Box sx={{ml: 0.5, lineHeight: 0, color: 'text.primary'}}>
                                <IconAntennaBars5 size={14} />
                            </Box>
                            <Box sx={{ml: 0.5, lineHeight: 0, color: 'text.primary'}}>
                                <IconWifi size={14} />
                            </Box>
                            <Box sx={{ml: 0.5, lineHeight: 0, color: 'text.primary'}}>
                                <IconBatteryFilled size={15} />
                            </Box>
                        </Stack>
                    </Box>

                    {formTitle && (
                        <Box
                            sx={{
                                bgcolor: '#F9FAFB',
                                px: 2,
                                py: 1.25,
                                flexShrink: 0,
                                borderTop: '1px solid #EEF2F6',
                                borderBottom: '1px solid #E5E7EB',
                                textAlign: 'center',
                            }}
                        >
                            <Typography sx={{fontSize: 15, fontWeight: 800, color: '#111827'}} noWrap>
                                {formTitle}
                            </Typography>
                        </Box>
                    )}

                    {/* Fields scroll area */}
                    <Box
                        sx={{
                            flex: 1,
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            bgcolor: '#F3F4F6',
                            px: 1,
                            py: 1.25,
                            '& .MuiTypography-root:hover': {
                                color: 'inherit',
                                fontWeight: 'inherit',
                                textDecoration: 'none',
                            },
                            '& .MuiButton-root:hover .MuiTypography-root': {
                                color: 'inherit',
                                fontWeight: 'inherit',
                                textDecoration: 'none',
                            },
                        }}
                    >
                        {fields.length === 0 ? (
                            <Box
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Typography sx={{fontSize: 12, color: '#9CA3AF', textAlign: 'center', px: 3}}>
                                    Add fields to preview this form.
                                </Typography>
                            </Box>
                        ) : (
                            <Stack
                                spacing={1.25}
                            >
                                {submitMessage && (
                                    <Box
                                        sx={{
                                            px: 1.5,
                                            py: 1.25,
                                            bgcolor: Object.keys(errors).length ? '#FEF2F2' : '#ECFDF3',
                                            borderRadius: '12px',
                                        }}
                                    >
                                        <Typography sx={{fontSize: 12, color: Object.keys(errors).length ? 'error.main' : 'success.main'}}>
                                            {submitMessage}
                                        </Typography>
                                    </Box>
                                )}
                                {visibleFields.map((field) => (
                                    <Box
                                        key={field.id}
                                        sx={{
                                            px: 1.5,
                                            py: 1.35,
                                            bgcolor: '#fff',
                                            borderRadius: '12px',
                                            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                                            maxWidth: '100%',
                                            minWidth: 0,
                                            overflow: 'hidden',
                                            boxSizing: 'border-box',
                                        }}
                                    >
                                        <PreviewField
                                            field={field}
                                            fields={allFields}
                                            value={values[field.id] ?? null}
                                            error={errors[field.id]}
                                            errors={errors}
                                            values={values}
                                            onChange={handleChange}
                                        />
                                    </Box>
                                ))}
                            </Stack>
                        )}
                    </Box>

                    {/* Send button */}
                    <Box sx={{p: 1.25, bgcolor: '#F9FAFB', flexShrink: 0}}>
                        <Button
                            fullWidth
                            variant="contained"
                            startIcon={<IconSend size={15} />}
                            onClick={validatePreview}
                            disabled={fields.length === 0}
                            sx={{
                                borderRadius: '999px',
                                py: 0.95,
                                textTransform: 'none',
                                fontSize: 14,
                                fontWeight: 700,
                                boxShadow: 'none',
                            }}
                        >
                            Send
                        </Button>
                    </Box>

                    {/* Home indicator */}
                    <Box
                        sx={{
                            bgcolor: '#F9FAFB',
                            py: 0.75,
                            display: 'flex',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <Box
                            sx={{
                                width: 80,
                                height: 4,
                                bgcolor: '#111827',
                                borderRadius: 2,
                            }}
                        />
                    </Box>
                </Box>
            </Box>

            {/* Reset */}
            <Button
                startIcon={<IconRefresh size={15} />}
                color="inherit"
                size="small"
                onClick={resetPreview}
                sx={{color: 'primary.main', fontSize: 13}}
            >
                Reset preview
            </Button>
        </Stack>
    );
};

export default MobilePreview;
