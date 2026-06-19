'use client';

import React from 'react';
import {Avatar, Box, Chip, IconButton, Stack, Typography} from '@mui/material';
import {IconDownload, IconFile, IconMapPin, IconMicrophone} from '@tabler/icons-react';
import dayjs from 'dayjs';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { FormField } from '../types';
import { labelStyle, subLabelStyle } from '../common/mobilePreviewConstants';
import { DetailsForm, FormEntry, SubmissionListItem } from './formDetailsTypes';
import { getFieldValue, groupChildFields } from './formDetailsHelpers';

const descriptionHtmlSx = {
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
};

const fieldCardSx = {
    px: 2,
    py: 1.75,
    bgcolor: '#fff',
    borderRadius: '16px',
    boxShadow: 'none',
    maxWidth: '100%',
    minWidth: 0,
    overflow: 'hidden',
    boxSizing: 'border-box',
};

const PDF_PAGE_BLOCK_ATTR = 'data-pdf-page-block';
const PDF_IMAGE_WAIT_TIMEOUT_MS = 3500;
const PDF_RENDER_SCALE = 1.5;

const pdfFieldBorderColor = '#D6D6D6';
const pdfMutedColor = '#747B80';
const pdfValueColor = '#343A40';

const pdfInnerBorderSx = {
    position: 'relative',
    bgcolor: '#fff',
    '&::after': {
        content: '""',
        position: 'absolute',
        inset: 0,
        border: `1px solid ${pdfFieldBorderColor}`,
        borderRadius: 'inherit',
        boxSizing: 'border-box',
        pointerEvents: 'none',
    },
};

const pdfFieldRowSx = {
    px: 1.1,
    py: 0.85,
    borderRadius: 0,
    boxSizing: 'border-box',
    width: '100%',
    fontSize: 16,
    lineHeight: 1.25,
    color: pdfMutedColor,
    ...pdfInnerBorderSx,
};

const pdfLogoSx = {
    width: 120,
    height: 120,
    objectFit: 'contain',
    display: 'block',
    flexShrink: 0,
};

const emptyAnswer = <Typography color="text.secondary">Not answered</Typography>;
const pdfEmptyAnswer = <Box component="span" sx={{ color: '#7D858C' }}>Not answered</Box>;
const selectableFieldTypes = ['Dropdown', 'Image selection', 'Yes/No'];
const mediaFieldTypes = ['Image upload', 'Scanner', 'Video upload', 'Audio recording', 'File upload', 'Signature'];
const imageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'svg'];
const videoExtensions = ['mp4', 'm4v', 'mov', 'webm', 'mkv', 'avi'];
const audioExtensions = ['mp3', 'wav', 'webm', 'm4a', 'aac', 'ogg'];

type NormalizedAttachment = {
    label: string;
    url: string;
    previewUrl: string;
    mimeType: string;
    extension: string;
};

type NormalizedLocation = {
    lat: number;
    lng: number;
    address?: string;
    accuracy?: number;
};

const normalizeLocationValue = (value: any): NormalizedLocation | null => {
    let location = value;

    if (typeof value === 'string') {
        const trimmedValue = value.trim();

        if (!trimmedValue.startsWith('{') || !trimmedValue.endsWith('}')) {
            return null;
        }

        try {
            location = JSON.parse(trimmedValue);
        } catch {
            return null;
        }
    }

    if (!location || typeof location !== 'object' || Array.isArray(location)) {
        return null;
    }

    const lat = Number(location.lat ?? location.latitude);
    const lng = Number(location.lng ?? location.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
    }

    return {
        lat,
        lng,
        address: typeof location.address === 'string' ? location.address.trim() : '',
        accuracy: Number.isFinite(Number(location.accuracy)) ? Number(location.accuracy) : undefined,
    };
};

const SubmissionLocationMap = ({location}: { location: NormalizedLocation }) => {
    const mapQuery = encodeURIComponent(`${location.lat},${location.lng}`);
    const mapSrc = `https://maps.google.com/maps?q=${mapQuery}&z=16&output=embed`;

    return (
        <Box>
            <Stack direction="row" alignItems="flex-start" spacing={0.75} sx={{mb: 1}}>
                <Box sx={{display: 'flex', color: '#EF4444', mt: 0.15}}>
                    <IconMapPin size={16}/>
                </Box>
                <Box sx={{minWidth: 0}}>
                    <Typography sx={{fontSize: 13, color: '#263445', wordBreak: 'break-word'}}>
                        {location.address || `${location.lat}, ${location.lng}`}
                    </Typography>
                    {location.accuracy ? (
                        <Typography sx={{fontSize: 11, color: '#6B7280', mt: 0.25}}>
                            Accuracy: {Math.round(location.accuracy)}m
                        </Typography>
                    ) : null}
                </Box>
            </Stack>

            <Box
                sx={{
                    height: {xs: 190, sm: 225},
                    width: '100%',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    bgcolor: '#F3F4F6',
                    border: '1px solid #E5E7EB',
                }}
            >
                <Box
                    component="iframe"
                    title={`Location map ${location.lat}, ${location.lng}`}
                    src={mapSrc}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    sx={{
                        width: '100%',
                        height: '100%',
                        border: 0,
                        display: 'block',
                    }}
                />
            </Box>
        </Box>
    );
};

const getStaticMapUrl = (location: NormalizedLocation) => {
    const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';

    if (!googleMapsApiKey) return '';

    const center = `${location.lat},${location.lng}`;
    const marker = `color:red|${center}`;
    const params = new URLSearchParams({
        center,
        zoom: '16',
        size: '640x260',
        scale: '2',
        maptype: 'roadmap',
        markers: marker,
        key: googleMapsApiKey,
    });

    return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
};

const TILE_SIZE = 256;
const PDF_TILE_MAP_WIDTH = 560;
const PDF_TILE_MAP_HEIGHT = 228;

const latLngToPixel = (lat: number, lng: number, zoom: number) => {
    const sinLat = Math.sin((Math.max(Math.min(lat, 85.05112878), -85.05112878) * Math.PI) / 180);
    const scale = TILE_SIZE * (2 ** zoom);

    return {
        x: ((lng + 180) / 360) * scale,
        y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
    };
};

const PdfTileMap = ({location}: { location: NormalizedLocation }) => {
    const zoom = 16;
    const centerPixel = latLngToPixel(location.lat, location.lng, zoom);
    const startTileX = Math.floor((centerPixel.x - PDF_TILE_MAP_WIDTH / 2) / TILE_SIZE);
    const endTileX = Math.floor((centerPixel.x + PDF_TILE_MAP_WIDTH / 2) / TILE_SIZE);
    const startTileY = Math.floor((centerPixel.y - PDF_TILE_MAP_HEIGHT / 2) / TILE_SIZE);
    const endTileY = Math.floor((centerPixel.y + PDF_TILE_MAP_HEIGHT / 2) / TILE_SIZE);
    const maxTile = (2 ** zoom) - 1;
    const tiles = [];

    for (let x = startTileX; x <= endTileX; x += 1) {
        for (let y = startTileY; y <= endTileY; y += 1) {
            if (y < 0 || y > maxTile) continue;

            const wrappedX = ((x % (maxTile + 1)) + (maxTile + 1)) % (maxTile + 1);

            tiles.push({
                key: `${x}-${y}`,
                x: wrappedX,
                y,
                left: Math.round((x * TILE_SIZE) - centerPixel.x + PDF_TILE_MAP_WIDTH / 2),
                top: Math.round((y * TILE_SIZE) - centerPixel.y + PDF_TILE_MAP_HEIGHT / 2),
            });
        }
    }

    return (
        <Box
            sx={{
                position: 'relative',
                width: PDF_TILE_MAP_WIDTH,
                maxWidth: '100%',
                height: PDF_TILE_MAP_HEIGHT,
                overflow: 'hidden',
                border: '1px solid #D7DADD',
                borderRadius: 1,
                bgcolor: '#F3F4F6',
            }}
        >
            {tiles.map((tile) => (
                <Box
                    key={tile.key}
                    component="img"
                    src={`/api/forms/map-tile?z=${zoom}&x=${tile.x}&y=${tile.y}`}
                    alt=""
                    sx={{
                        position: 'absolute',
                        left: tile.left,
                        top: tile.top,
                        width: TILE_SIZE,
                        height: TILE_SIZE,
                        display: 'block',
                    }}
                />
            ))}
            <Box
                sx={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: 22,
                    height: 22,
                    borderRadius: '50% 50% 50% 0',
                    bgcolor: '#EA4335',
                    border: '2px solid #B3261E',
                    transform: 'translate(-50%, -100%) rotate(-45deg)',
                    boxSizing: 'border-box',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.25)',
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        bgcolor: '#B3261E',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                    },
                }}
            />
            <Box
                sx={{
                    position: 'absolute',
                    left: 8,
                    bottom: 6,
                    px: 0.5,
                    bgcolor: 'rgba(255,255,255,0.88)',
                    color: '#5F6368',
                    fontSize: 10,
                    lineHeight: 1.2,
                }}
            >
                Google
            </Box>
        </Box>
    );
};

const PdfLocationMap = ({location}: { location: NormalizedLocation }) => {
    const staticMapUrl = getStaticMapUrl(location);

    return (
        <Stack spacing={0.8} sx={{mt: 0.8, maxWidth: 560}}>
            <Box component="span" sx={{color: pdfValueColor, fontWeight: 700}}>
                {location.address || `${location.lat}, ${location.lng}`}
            </Box>
            {location.accuracy ? (
                <Box component="span" sx={{color: pdfMutedColor, fontSize: 13, fontWeight: 400}}>
                    Accuracy: {Math.round(location.accuracy)}m
                </Box>
            ) : null}
            {staticMapUrl ? (
                <Box
                    component="img"
                    src={staticMapUrl}
                    alt={`Map for ${location.lat}, ${location.lng}`}
                    crossOrigin="anonymous"
                    sx={{
                        width: '100%',
                        maxWidth: 560,
                        height: 228,
                        objectFit: 'cover',
                        border: '1px solid #D7DADD',
                        borderRadius: 1,
                        display: 'block',
                        bgcolor: '#F3F4F6',
                    }}
                />
            ) : (
                <PdfTileMap location={location}/>
            )}
        </Stack>
    );
};

const isUploadValue = (value: any) => value && typeof value === 'object' && !Array.isArray(value) && (
    value.url || value.preview || value.thumb_url || value.file_name || value.original_name || value.name || value.mime_type || value.mimeType
);

const normalizeAttachment = (value: any): NormalizedAttachment | null => {
    if (!isUploadValue(value)) return null;

    const url = String(value.url || value.preview || value.thumb_url || '');
    const label = String(value.original_name || value.name || value.file_name || 'Attachment');
    const mimeType = String(value.mime_type || value.mimeType || '');
    const extension = String(value.extension || label.split('.').pop() || '').toLowerCase();

    return {
        label,
        url,
        previewUrl: String(value.thumb_url || value.preview || value.url || ''),
        mimeType,
        extension,
    };
};

const asAttachmentArray = (value: any): NormalizedAttachment[] => {
    const values = Array.isArray(value) ? value : [value];

    return values
        .map((item) => normalizeAttachment(item))
        .filter((item): item is NormalizedAttachment => Boolean(item));
};

const isImageAttachment = (attachment: NormalizedAttachment) => (
    attachment.mimeType.startsWith('image/')
    || imageExtensions.includes(attachment.extension)
);

const isVideoAttachment = (attachment: NormalizedAttachment) => (
    attachment.mimeType.startsWith('video/')
    || videoExtensions.includes(attachment.extension)
);

const isAudioAttachment = (attachment: NormalizedAttachment) => (
    attachment.mimeType.startsWith('audio/')
    || audioExtensions.includes(attachment.extension)
);

const getPdfUploadFieldType = (field?: FormField): FormField['type'] => {
    if (field?.type === 'Signature') return 'Image upload';
    if (field?.type && mediaFieldTypes.includes(field.type)) return field.type;
    return 'File upload';
};

const isSignatureValue = (value: any) => typeof value === 'string' && (
    value.startsWith('data:image/') || /^https?:\/\/.+\.(png|jpg|jpeg|webp|svg)(\?.*)?$/i.test(value)
);

const AttachmentDownloadRow = ({attachment}: { attachment: NormalizedAttachment }) => (
    <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{
            p: 1,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: '#F9FAFB',
        }}
    >
        <Box
            sx={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                bgcolor: '#EAF4FF',
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
            }}
        >
            <IconFile size={18}/>
        </Box>
        <Typography noWrap sx={{flex: 1, minWidth: 0, fontSize: 13}}>
            {attachment.label}
        </Typography>
        {attachment.url && (
            <IconButton
                component="a"
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                size="small"
                sx={{color: 'primary.main'}}
            >
                <IconDownload size={17}/>
            </IconButton>
        )}
    </Stack>
);

const ImageAttachmentGrid = ({attachments}: { attachments: NormalizedAttachment[] }) => (
    <Box sx={{display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1}}>
        {attachments.map((attachment, index) => (
            <Box
                key={`${attachment.label}-${index}`}
                component="a"
                href={attachment.url || attachment.previewUrl}
                target="_blank"
                rel="noreferrer"
                sx={{
                    display: 'block',
                    aspectRatio: '1 / 1',
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: '#EEF2F6',
                }}
            >
                <Box
                    component="img"
                    src={attachment.previewUrl || attachment.url}
                    alt={attachment.label}
                    sx={{width: '100%', height: '100%', objectFit: 'cover', display: 'block'}}
                />
            </Box>
        ))}
    </Box>
);

const VideoAttachmentList = ({attachments}: { attachments: NormalizedAttachment[] }) => (
    <Stack spacing={1.25}>
        {attachments.map((attachment, index) => (
            <Box
                key={`${attachment.label}-${index}`}
                sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    overflow: 'hidden',
                    bgcolor: '#111827',
                }}
            >
                <Box
                    component="video"
                    src={attachment.url}
                    controls
                    preload="metadata"
                    sx={{width: '100%', maxHeight: 240, display: 'block', bgcolor: '#111827'}}
                />
                <Box sx={{bgcolor: '#fff'}}>
                    <AttachmentDownloadRow attachment={attachment}/>
                </Box>
            </Box>
        ))}
    </Stack>
);

const AudioAttachmentList = ({attachments}: { attachments: NormalizedAttachment[] }) => (
    <Stack spacing={1}>
        {attachments.map((attachment, index) => (
            <Box
                key={`${attachment.label}-${index}`}
                sx={{
                    p: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    bgcolor: '#F9FAFB',
                }}
            >
                <Stack direction="row" spacing={1} alignItems="center" mb={0.75}>
                    <IconMicrophone size={17}/>
                    <Typography fontSize={12} color="text.secondary" noWrap>{attachment.label}</Typography>
                </Stack>
                <Box component="audio" src={attachment.url} controls
                     sx={{width: '100%', height: 36, display: 'block'}}/>
            </Box>
        ))}
    </Stack>
);

const splitAttachmentsByMediaType = (attachments: NormalizedAttachment[]) => {
    const imageAttachments = attachments.filter(isImageAttachment);
    const videoAttachments = attachments.filter(isVideoAttachment);
    const audioAttachments = attachments.filter(isAudioAttachment);
    const mediaAttachments = new Set([...imageAttachments, ...videoAttachments, ...audioAttachments]);
    const fileAttachments = attachments.filter((attachment) => !mediaAttachments.has(attachment));

    return {
        imageAttachments,
        videoAttachments,
        audioAttachments,
        fileAttachments,
    };
};

const AttachmentDownloadRows = ({attachments}: { attachments: NormalizedAttachment[] }) => (
    <>
        {attachments.map((attachment, index) => (
            <AttachmentDownloadRow key={`${attachment.label}-${index}`} attachment={attachment}/>
        ))}
    </>
);

const selectedOptionValues = (value: any) => {
    if (typeof value === 'string') {
        const trimmed = value.trim();

        if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
            try {
                return selectedOptionValues(JSON.parse(trimmed));
            } catch {}
        }
    }

    if (Array.isArray(value)) {
        return value.map((item) => {
            if (item && typeof item === 'object') {
                return String(item.value ?? item.label ?? item.name ?? item.option ?? item.url ?? '').trim();
            }

            return String(item).trim();
        }).filter(Boolean);
    }

    if (value && typeof value === 'object') {
        return [String(value.value ?? value.label ?? value.name ?? value.option ?? value.url ?? '').trim()].filter(Boolean);
    }

    return [String(value ?? '').trim()].filter(Boolean);
};

const isOptionSelected = (selectedValues: string[], option: string, index: number, image?: string) => (
    selectedValues.includes(option)
    || selectedValues.includes(String(index))
    || selectedValues.includes(String(index + 1))
    || Boolean(image && selectedValues.includes(image))
);

const ImageSelectionAnswer = ({field, value}: { field: FormField; value: any }) => {
    const selectedValues = selectedOptionValues(value);
    const isMultiple = Boolean(field.multipleSelection);

    return (
        <Box sx={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 1}}>
            {(field.options || []).map((option, index) => {
                const image = field.optionImages?.[index] || '';
                const selected = isOptionSelected(selectedValues, option, index, image);

                return (
                    <Box
                        key={`${option}-${index}`}
                        sx={{
                            border: '2px solid',
                            borderColor: selected ? '#1194F6' : '#E5E7EB',
                            borderRadius: 2,
                            overflow: 'hidden',
                            bgcolor: '#fff',
                        }}
                    >
                        {image ? (
                            <Box
                                component="img"
                                src={image}
                                alt={option}
                                sx={{width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block'}}
                            />
                        ) : (
                            <Box sx={{aspectRatio: '4 / 3', bgcolor: '#EEF2F6'}}/>
                        )}
                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{p: 0.85}}>
                            <Box
                                sx={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: isMultiple ? '3px' : '50%',
                                    border: selected ? '5px solid' : '1.5px solid',
                                    borderColor: selected ? '#1194F6' : '#9CA3AF',
                                    bgcolor: '#fff',
                                    boxSizing: 'border-box',
                                    flexShrink: 0,
                                }}
                            />
                            <Typography sx={{fontSize: 13, color: '#263445', wordBreak: 'break-word'}}>
                                {option}
                            </Typography>
                        </Stack>
                    </Box>
                );
            })}
        </Box>
    );
};

const PdfImageSelectionAnswer = ({field, value}: { field: FormField; value: any }) => {
    const selectedValues = selectedOptionValues(value);
    const selectedOptions = (field.options || [])
        .map((option, index) => ({
            option,
            image: field.optionImages?.[index] || '',
            selected: isOptionSelected(selectedValues, option, index, field.optionImages?.[index] || ''),
        }))
        .filter((item) => item.selected);

    if (!selectedOptions.length) return pdfEmptyAnswer;

    return (
        <Stack spacing={1} sx={{mt: 1}}>
            {selectedOptions.map(({option, image}, index) => {
                return (
                    <Stack key={`${option}-${index}`} direction="row" spacing={1} alignItems="center">
                        {image ? (
                            <Box
                                component="img"
                                src={image}
                                alt={option}
                                sx={{
                                    width: 118,
                                    height: 86,
                                    objectFit: 'cover',
                                    border: '1px solid #D7DADD',
                                    display: 'block',
                                }}
                            />
                        ) : null}
                        <Box component="span" sx={{color: pdfValueColor, fontWeight: 700}}>
                            {option}
                        </Box>
                    </Stack>
                );
            })}
        </Stack>
    );
};

const renderMediaAttachments = (value: any, preferredType?: 'image' | 'video' | 'audio' | 'file') => {
    const attachments = asAttachmentArray(value);

    if (attachments.length === 0) return null;

    const {
        imageAttachments,
        videoAttachments,
        audioAttachments,
        fileAttachments,
    } = splitAttachmentsByMediaType(attachments);

    if (preferredType === 'image') {
        const otherAttachments = attachments.filter((attachment) => !imageAttachments.includes(attachment));

        return (
            <Stack spacing={1}>
                {imageAttachments.length > 0 && <ImageAttachmentGrid attachments={imageAttachments}/>}
                <AttachmentDownloadRows attachments={otherAttachments}/>
            </Stack>
        );
    }

    if (preferredType === 'video') {
        const otherAttachments = attachments.filter((attachment) => !videoAttachments.includes(attachment));

        return (
            <Stack spacing={1}>
                {videoAttachments.length > 0 && <VideoAttachmentList attachments={videoAttachments}/>}
                <AttachmentDownloadRows attachments={otherAttachments}/>
            </Stack>
        );
    }

    if (preferredType === 'audio') {
        const otherAttachments = attachments.filter((attachment) => !audioAttachments.includes(attachment));

        return (
            <Stack spacing={1}>
                {audioAttachments.length > 0 && <AudioAttachmentList attachments={audioAttachments}/>}
                <AttachmentDownloadRows attachments={otherAttachments}/>
            </Stack>
        );
    }

    if (preferredType === 'file') {
        return (
            <Stack spacing={1}>
                <AttachmentDownloadRows attachments={attachments}/>
            </Stack>
        );
    }

    return (
        <Stack spacing={1}>
            {imageAttachments.length > 0 && <ImageAttachmentGrid attachments={imageAttachments}/>}
            {videoAttachments.length > 0 && <VideoAttachmentList attachments={videoAttachments}/>}
            {audioAttachments.length > 0 && <AudioAttachmentList attachments={audioAttachments}/>}
            <AttachmentDownloadRows attachments={fileAttachments}/>
        </Stack>
    );
};

const renderReadonlyValue = (value: any, field?: FormField) => {
    if (value === undefined || value === null || value === '') {
        return emptyAnswer;
    }

    const location = field?.type === 'Location' ? normalizeLocationValue(value) : null;

    if (location) {
        return <SubmissionLocationMap location={location}/>;
    }

    if (field?.type === 'Signature' && isSignatureValue(value)) {
        return (
            <Box
                sx={{
                    minHeight: 140,
                    borderRadius: 2,
                    bgcolor: '#fff',
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                }}
            >
                <Box
                    component="img"
                    src={value}
                    alt="Digital signature"
                    sx={{width: '100%', height: 130, objectFit: 'contain', display: 'block'}}
                />
            </Box>
        );
    }

    if (field?.type === 'Image upload' || field?.type === 'Scanner') {
        return renderMediaAttachments(value, 'image') || emptyAnswer;
    }

    if (field?.type === 'Video upload') {
        return renderMediaAttachments(value, 'video') || emptyAnswer;
    }

    if (field?.type === 'Audio recording') {
        return renderMediaAttachments(value, 'audio') || emptyAnswer;
    }

    if (field?.type === 'File upload') {
        return renderMediaAttachments(value, 'file') || emptyAnswer;
    }

    if (field?.type === 'Rating') {
        const rating = Math.max(0, Math.min(Number(field.ratingStarCount || 5), Number(value) || 0));
        const total = Number(field.ratingStarCount || 5);

        return (
            <Stack spacing={0.75}>
                <Stack direction="row" spacing={1} justifyContent="center">
                    {Array.from({length: total}).map((_, index) => (
                        <Box
                            key={index}
                            sx={{
                                width: 22,
                                height: 22,
                                clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                                bgcolor: index < rating ? '#1194F6' : '#D1D5DB',
                            }}
                        />
                    ))}
                </Stack>
                {(field.ratingMinLabel || field.ratingMaxLabel) && (
                    <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">{field.ratingMinLabel}</Typography>
                        <Typography variant="caption" color="text.secondary">{field.ratingMaxLabel}</Typography>
                    </Stack>
                )}
            </Stack>
        );
    }

    if (field?.type === 'Image selection' && Array.isArray(field.options)) {
        return <ImageSelectionAnswer field={field} value={value}/>;
    }

    if (field?.type && selectableFieldTypes.includes(field.type) && Array.isArray(field.options)) {
        const selectedValues = Array.isArray(value) ? value.map(String) : [String(value)];
        const isMultiple = Boolean(field.multipleSelection);

        return (
            <Stack spacing={0.75}>
                {field.options.map((option) => {
                    const selected = selectedValues.includes(option);

                    return (
                        <Stack key={option} direction="row" spacing={1} alignItems="center">
                            <Box
                                sx={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: isMultiple ? '3px' : '50%',
                                    border: selected ? '5px solid' : '1.5px solid',
                                    borderColor: selected ? '#1194F6' : '#9CA3AF',
                                    bgcolor: '#fff',
                                    boxSizing: 'border-box',
                                    flexShrink: 0,
                                }}
                            />
                            <Typography sx={{fontSize: 13, color: '#263445'}}>{option}</Typography>
                        </Stack>
                    );
                })}
            </Stack>
        );
    }

    if (typeof value === 'boolean') {
        return <Typography>{value ? 'Yes' : 'No'}</Typography>;
    }

    if (Array.isArray(value)) {
        if (value.length === 0) return emptyAnswer;

        if (value.every(isUploadValue)) {
            return renderMediaAttachments(value) || emptyAnswer;
        }

        return (
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
                {value.map((item, index) => (
                    <Chip key={`${String(item)}-${index}`} size="small" label={String(item)}/>
                ))}
            </Stack>
        );
    }

    if (isUploadValue(value)) {
        return renderMediaAttachments(value) || emptyAnswer;
    }

    if (typeof value === 'object') {
        const inferredLocation = normalizeLocationValue(value);

        if (inferredLocation) {
            return <SubmissionLocationMap location={inferredLocation}/>;
        }

        return (
            <Box component="pre" sx={{m: 0, whiteSpace: 'pre-wrap', font: 'inherit'}}>
                {JSON.stringify(value, null, 2)}
            </Box>
        );
    }

    return <Typography sx={{whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>{String(value)}</Typography>;
};

const sanitizeFileName = (value: string) => (
    value
        .trim()
        .replace(/[\\/:*?"<>|]+/g, '_')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
    || 'form_submission'
);

const getBrowserTimeZone = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch {
        return '';
    }
};

export const getSubmissionFileName = (form: DetailsForm, item: SubmissionListItem) => {
    const date = item.entry.created_at ? dayjs(item.entry.created_at).format('DD_MM_YYYY') : dayjs().format('DD_MM_YYYY');
    return `${sanitizeFileName(form.name || 'Form')}_${date}_${sanitizeFileName(item.name)}_${item.entry.id}.pdf`;
};

const PdfAnswer = ({value, field}: { value: any; field?: FormField }) => {
    if (value === undefined || value === null || value === '') {
        return pdfEmptyAnswer;
    }

    const location = field?.type === 'Location' ? normalizeLocationValue(value) : null;

    if (location) {
        return <PdfLocationMap location={location}/>;
    }

    if (field?.type === 'Description') {
        return (
            <Box
                sx={{
                    color: '#747B80',
                    lineHeight: 1.35,
                    '& p': {my: 0.5},
                    '& ul, & ol': {pl: 2.5, my: 0.5},
                    '& img': {maxWidth: '100%', height: 'auto', display: 'block', my: 1},
                }}
                dangerouslySetInnerHTML={{__html: field.label || field.description || ''}}
            />
        );
    }

    if (field?.type === 'Signature' && isSignatureValue(value)) {
        return (
            <Box
                component="img"
                src={value}
                alt="Signature"
                sx={{maxWidth: 340, maxHeight: 130, objectFit: 'contain', display: 'block', mt: 1}}
            />
        );
    }

    if (field?.type === 'Rating') {
        const total = Math.max(1, Number(field.ratingStarCount || 5));
        const rating = Math.max(0, Math.min(total, Number(value) || 0));
        return (
            <Box component="span" sx={{color: '#343A40', fontSize: 22, letterSpacing: 0}}>
                {'★'.repeat(rating)}{'☆'.repeat(total - rating)}
            </Box>
        );
    }

    if (field?.type === 'Image selection' && Array.isArray(field.options)) {
        return <PdfImageSelectionAnswer field={field} value={value}/>;
    }

    if (field?.type && selectableFieldTypes.includes(field.type) && Array.isArray(field.options)) {
        const selectedValues = Array.isArray(value) ? value.map(String) : [String(value)];
        return (
            <Box component="span">
                {selectedValues.filter(Boolean).join(', ') || 'Not answered'}
            </Box>
        );
    }

    if (field && mediaFieldTypes.includes(field.type)) {
        const attachments = asAttachmentArray(value);

        if (!attachments.length) {
            return pdfEmptyAnswer;
        }

        const { imageAttachments } = splitAttachmentsByMediaType(attachments);
        const otherAttachments = attachments.filter((attachment) => !imageAttachments.includes(attachment));

        return (
            <Stack spacing={1.25} sx={{mt: 1}}>
                {imageAttachments.length > 0 && (
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: 1.25,
                        maxWidth: 520
                    }}>
                        {imageAttachments.map((attachment, index) => (
                            <Box
                                key={`${attachment.label}-${index}`}
                                component="img"
                                src={attachment.previewUrl || attachment.url}
                                alt={attachment.label}
                                sx={{
                                    width: '100%',
                                    maxHeight: 220,
                                    objectFit: 'contain',
                                    border: '1px solid #D7DADD',
                                    display: 'block',
                                }}
                            />
                        ))}
                    </Box>
                )}
                {otherAttachments.map((attachment, index) => (
                    <Box key={`${attachment.label}-${index}`} sx={{color: '#343A40', fontWeight: 700}}>
                        {attachment.label}
                    </Box>
                ))}
            </Stack>
        );
    }

    if (typeof value === 'boolean') {
        return <Box component="span">{value ? 'Yes' : 'No'}</Box>;
    }

    if (Array.isArray(value)) {
        if (!value.length) return pdfEmptyAnswer;
        if (value.every(isUploadValue)) return <PdfAnswer value={value} field={{
            ...(field as FormField),
            type: getPdfUploadFieldType(field)
        }}/>;
        return <Box component="span">{value.map((item) => String(item)).join(', ')}</Box>;
    }

    if (isUploadValue(value)) {
        return <PdfAnswer value={[value]} field={{...(field as FormField), type: getPdfUploadFieldType(field)}}/>;
    }

    if (typeof value === 'object') {
        const inferredLocation = normalizeLocationValue(value);

        if (inferredLocation) {
            return <PdfLocationMap location={inferredLocation}/>;
        }

        return <Box component="span" sx={{whiteSpace: 'pre-wrap'}}>{JSON.stringify(value, null, 2)}</Box>;
    }

    return <Box component="span" sx={{whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>{String(value)}</Box>;
};

const PdfFieldRow = ({field, entry}: { field: FormField; entry: FormEntry }) => {
    if (field.type === 'Description') {
        return (
            <Box
                {...{[PDF_PAGE_BLOCK_ATTR]: 'true'}}
                sx={pdfFieldRowSx}
            >
                <PdfAnswer value={field.label || field.description || ''} field={field}/>
            </Box>
        );
    }

    if (field.type === 'Group') {
        const childFields = groupChildFields(field);

        return (
            <Box>
                <Box
                    {...{[PDF_PAGE_BLOCK_ATTR]: 'true'}}
                    sx={{
                        ...pdfFieldRowSx,
                        fontWeight: 700,
                    }}
                >
                    {field.label}
                </Box>
                {childFields.map((child) => (
                    <PdfFieldRow key={child.id} field={child} entry={entry}/>
                ))}
            </Box>
        );
    }

    const value = getFieldValue(entry, field.id);

    return (
        <Box
            {...{[PDF_PAGE_BLOCK_ATTR]: 'true'}}
            sx={pdfFieldRowSx}
        >
            <Box component="span">
                {field.label}{field.label ? ': ' : ''}
            </Box>
            <Box component="span" sx={{color: pdfValueColor, fontWeight: 700}}>
                <PdfAnswer value={value} field={field}/>
            </Box>
        </Box>
    );
};

export const PdfSubmissionTemplate = ({form, item}: { form: DetailsForm; item: SubmissionListItem | null }) => {
    if (!item) return null;

    const timeZone = getBrowserTimeZone();
    const submittedAt = item.entry.created_at ? dayjs(item.entry.created_at).format('DD/MM/YYYY, HH:mm') : '--';
    const fields = form.fields || [];

    return (
        <Box
            sx={{
                width: 794,
                bgcolor: '#fff',
                color: '#343A40',
                fontSize: 15,
                lineHeight: 1.35,
                p: '36px 45px',
                boxSizing: 'border-box',
            }}
        >
            <Stack
                {...{[PDF_PAGE_BLOCK_ATTR]: 'true'}}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
            >
                <Typography
                    noWrap
                    sx={{
                        minWidth: 0,
                        fontSize: 22,
                        fontWeight: 800,
                        color: '#000',
                    }}
                >
                    {form.name || 'Untitled form'}
                </Typography>

                <Box
                    component="img"
                    src="/images/logos/new-belcka.svg"
                    alt="BELCKA"
                    sx={pdfLogoSx}
                />
            </Stack>

            <Box sx={{overflow: 'visible'}}>
                <Stack
                    {...{[PDF_PAGE_BLOCK_ATTR]: 'true'}}
                    direction="row"
                    alignItems="center"
                    spacing={1.25}
                    sx={{
                        px: 1.5,
                        pt: 1.75,
                        pb: 2.1,
                        minHeight: 78,
                        borderRadius: '4px 4px 0 0',
                        boxSizing: 'border-box',
                        ...pdfInnerBorderSx,
                    }}
                >
                    <Avatar
                        src={item.avatar || undefined}
                        sx={{
                            width: 50,
                            height: 50,
                            bgcolor: '#FF981F',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: 18,
                        }}
                    >
                        {item.initials}
                    </Avatar>
                    <Box sx={{minWidth: 0, flex: 1}}>
                        <Typography sx={{fontSize: 18, fontWeight: 400, color: pdfMutedColor, lineHeight: 1.25}}>
                            {item.name}
                        </Typography>
                        <Typography sx={{fontSize: 15, color: pdfMutedColor, mt: 0.15}}>
                            {submittedAt}{timeZone ? ` | ${timeZone}` : ''}
                        </Typography>
                    </Box>
                    <Box sx={{
                        px: 0.9,
                        py: 0.25,
                        borderRadius: 1,
                        bgcolor: '#F1F2F4',
                        color: pdfMutedColor,
                        fontSize: 18,
                        lineHeight: 1.2,
                    }}>
                        #{item.entry.id}
                    </Box>
                </Stack>

                {fields.length === 0 ? (
                    <Box
                        {...{[PDF_PAGE_BLOCK_ATTR]: 'true'}}
                        sx={{
                            ...pdfFieldRowSx,
                        }}
                    >
                        This form has no fields.
                    </Box>
                ) : fields.map((field: any) => (
                    <PdfFieldRow key={field.id} field={field} entry={item.entry}/>
                ))}
            </Box>
        </Box>
    );
};

const waitForPdfImages = async (element: HTMLElement) => {
    const images = Array.from(element.querySelectorAll<HTMLImageElement>('img'));

    await Promise.all(images.map((image) => {
        if (image.complete) {
            return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
            const timeout = window.setTimeout(() => finish(), PDF_IMAGE_WAIT_TIMEOUT_MS);
            const finish = () => {
                window.clearTimeout(timeout);
                image.removeEventListener('load', finish);
                image.removeEventListener('error', finish);
                resolve();
            };

            image.addEventListener('load', finish, {once: true});
            image.addEventListener('error', finish, {once: true});
        });
    }));
};

export const downloadElementAsPdf = async (element: HTMLElement, fileName: string) => {
    await waitForPdfImages(element);

    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const footerHeight = 28;
    const pageContentHeight = pageHeight - footerHeight;
    const pageBlocks = Array.from(element.querySelectorAll<HTMLElement>(`[${PDF_PAGE_BLOCK_ATTR}]`));

    if (pageBlocks.length > 0) {
        let cursorY = 0;
        let previousBlockBottom = 0;

        const drawPageNumbers = () => {
            const totalPages = pdf.getNumberOfPages();
            pdf.setFontSize(12);
            pdf.setTextColor(0, 0, 0);
            for (let index = 1; index <= totalPages; index += 1) {
                pdf.setPage(index);
                pdf.text(`${index}/${totalPages}`, pageWidth - 28, pageHeight - 18, {align: 'right'});
            }
        };

        for (const block of pageBlocks) {
            const canvas = await html2canvas(block, {
                scale: PDF_RENDER_SCALE,
                useCORS: true,
                allowTaint: false,
                backgroundColor: '#ffffff',
                width: block.scrollWidth,
                height: block.scrollHeight,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight,
            });
            const blockImageWidth = (block.scrollWidth * pageWidth) / element.scrollWidth;
            const blockImageHeight = (canvas.height * blockImageWidth) / canvas.width;
            const blockImageData = canvas.toDataURL('image/jpeg', 0.96);
            const blockX = (block.offsetLeft * pageWidth) / element.scrollWidth;
            const rawBlockGap = Math.max(block.offsetTop - previousBlockBottom, 0) * pageWidth / element.scrollWidth;
            const blockGap = previousBlockBottom === 0 ? rawBlockGap : Math.min(rawBlockGap, 28);
            previousBlockBottom = block.offsetTop + block.offsetHeight;

            if (cursorY > 0 && cursorY + blockGap + blockImageHeight > pageContentHeight) {
                pdf.addPage();
                cursorY = 0;
            } else {
                cursorY += blockGap;
            }

            if (blockImageHeight <= pageContentHeight) {
                pdf.addImage(blockImageData, 'JPEG', blockX, cursorY, blockImageWidth, blockImageHeight);
                cursorY += blockImageHeight;
                continue;
            }

            let remainingHeight = blockImageHeight;
            let sourceY = 0;

            while (remainingHeight > 0) {
                const availableHeight = pageContentHeight - cursorY;
                const drawHeight = Math.min(remainingHeight, availableHeight);

                pdf.addImage(blockImageData, 'JPEG', blockX, cursorY - sourceY, blockImageWidth, blockImageHeight);
                remainingHeight -= drawHeight;
                sourceY += drawHeight;
                cursorY += drawHeight;

                if (remainingHeight > 0) {
                    pdf.addPage();
                    cursorY = 0;
                }
            }
        }

        drawPageNumbers();
        pdf.save(fileName);
        return;
    }

    const canvas = await html2canvas(element, {
        scale: PDF_RENDER_SCALE,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
    });

    const imageWidth = pageWidth;
    const imageHeight = (canvas.height * imageWidth) / canvas.width;
    const imageData = canvas.toDataURL('image/jpeg', 0.96);
    const totalPages = Math.ceil(imageHeight / pageContentHeight) || 1;

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
        if (pageIndex > 0) pdf.addPage();
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
        pdf.addImage(imageData, 'JPEG', 0, -pageIndex * pageContentHeight, imageWidth, imageHeight);
        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        pdf.text(`${pageIndex + 1}/${totalPages}`, pageWidth - 28, pageHeight - 18, {align: 'right'});
    }

    pdf.save(fileName);
};

const ReadonlyField = ({field, entry}: { field: FormField; entry: FormEntry }) => {
    if (field.type === 'Description') {
        return (
            <Box
                sx={descriptionHtmlSx}
                dangerouslySetInnerHTML={{__html: field.label || field.description || ''}}
            />
        );
    }

    if (field.type === 'Group') {
        const childFields = groupChildFields(field);

        return (
            <Box>
                <Typography
                    sx={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: '#111827',
                        mb: field.description ? 0.35 : 1,
                    }}
                >
                    {field.label}
                </Typography>
                {field.description && (
                    <Typography sx={subLabelStyle}>{field.description}</Typography>
                )}
                <Stack spacing={1}>
                    {childFields.length === 0 ? (
                        <Typography sx={{fontSize: 12, color: '#9CA3AF'}}>No fields in this group.</Typography>
                    ) : childFields.map((child) => (
                        <Box key={child.id} sx={{...fieldCardSx, border: '1px solid #EEF2F6'}}>
                            <ReadonlyField field={child} entry={entry}/>
                        </Box>
                    ))}
                </Stack>
            </Box>
        );
    }

    const value = getFieldValue(entry, field.id);
    const isMediaField = mediaFieldTypes.includes(field.type);

    return (
        <Box>
            <Typography sx={labelStyle}>
                {field.label}
                {field.required && (
                    <Box component="span" sx={{color: 'error.main', ml: 0.25}}>*</Box>
                )}
            </Typography>
            {field.description && (
                <Typography sx={subLabelStyle}>{field.description}</Typography>
            )}
            <Box sx={{mt: isMediaField ? 1.25 : 1, fontSize: 13, color: '#263445'}}>
                {renderReadonlyValue(value, field)}
            </Box>
        </Box>
    );
};

const ReadonlySubmissionPreview = ({form, entry}: { form: DetailsForm; entry: FormEntry | null }) => {
    const fields = form.fields || [];

    if (!entry) {
        return (
            <Stack alignItems="center" justifyContent="center" sx={{minHeight: 360, color: 'text.secondary'}}>
                <Typography>Select a submission to preview.</Typography>
            </Stack>
        );
    }

    return (
        <Box
            sx={{
                bgcolor: '#F3F4F6',
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                px: {xs: 2, md: 4},
                pt: 2,
                pb: {xs: 4, md: 6},
            }}
        >
            <Box sx={{width: '100%', maxWidth: 560, mx: 'auto', pb: 2}}>
                {fields.length === 0 ? (
                    <Stack alignItems="center" justifyContent="center" sx={{minHeight: 320}}>
                        <Typography sx={{fontSize: 13, color: '#9CA3AF', textAlign: 'center', px: 3}}>
                            This form has no fields.
                        </Typography>
                    </Stack>
                ) : (
                    <Stack spacing={2}>
                        {fields.map((field: any) => (
                            <Box key={field.id} sx={fieldCardSx}>
                                <ReadonlyField field={field} entry={entry}/>
                            </Box>
                        ))}
                    </Stack>
                )}
            </Box>
        </Box>
    );
};

export default ReadonlySubmissionPreview;
