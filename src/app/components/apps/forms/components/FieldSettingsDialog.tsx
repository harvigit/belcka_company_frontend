'use client';

import React, {useEffect, useState} from 'react';
import {
    Box,
    Button,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    Divider,
    FormControlLabel,
    IconButton,
    MenuItem,
    Paper,
    Radio,
    RadioGroup,
    Select,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    IconGripVertical,
    IconHelpCircle,
    IconMinus,
    IconPencil,
    IconPhoto,
    IconPlus,
    IconTrash,
    IconX,
} from '@tabler/icons-react';
import {DragDropContext, Draggable, Droppable, DropResult} from '@hello-pangea/dnd';
import DescriptionIcon from '@mui/icons-material/Description';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CustomTextField from '@/app/components/forms/theme-elements/CustomTextField';
import IOSSwitch from '@/app/components/common/IOSSwitch';
import {
    FieldDraft,
    FormField,
    FormFieldCondition,
    iconForType,
    optionFieldTypes,
    placeholderForType,
} from '../common';
import {fieldDisplayLabel} from '../formUtils';
import DescriptionEditorBox from './DescriptionEditorBox';

type FieldSettingsDialogProps = {
    open: boolean;
    type: string | null;
    draft: FieldDraft;
    availableFields: FormField[];
    questionError: string;
    onChange: (draft: FieldDraft) => void;
    onClose: () => void;
    onConfirm: () => void;
};

const FieldSettingsDialog = ({
                                 open,
                                 type,
                                 draft,
                                 availableFields,
                                 questionError,
                                 onChange,
                                 onClose,
                                 onConfirm
                             }: FieldSettingsDialogProps) => {
    const isOptionField = Boolean(type && optionFieldTypes.includes(type));
    const isDescription = type === 'Description';
    const isFormula = type === 'Formula';
    const isGroup = type === 'Group';
    const isYesNo = type === 'Yes/No';
    const isNumbersSlider = type === 'Numbers slider';
    const isImageSelection = type === 'Image selection';
    const isImageUpload = type === 'Image upload';
    const isVideoUpload = type === 'Video upload';
    const isFileUpload = type === 'File upload';
    const isScanner = type === 'Scanner';
    const isDate = type === 'Date';
    const isLocation = type === 'Location';
    const isRating = type === 'Rating';
    const canAllowMultipleUploads = isImageUpload || isVideoUpload || isFileUpload || isScanner;
    const isSimpleOptionField = isOptionField && !isImageSelection;
    const canAddCondition = availableFields.length > 0;
    const formulaNumberFields = availableFields.filter((field) => field.type === 'Number');
    const [isConditionEditorOpen, setIsConditionEditorOpen] = useState(false);
    const [conditionDrafts, setConditionDrafts] = useState<FormFieldCondition[]>([]);
    const usedConditionFieldIds = conditionDrafts.map((condition) => condition.fieldId).filter(Boolean);
    const canAddMoreConditions = canAddCondition && conditionDrafts.length < availableFields.length;

    useEffect(() => {
        if (!open) return;

        const normalizedConditions = (draft.conditions || []).map((condition, index) => ({
            ...condition,
            joinWith: index === 0 ? 'if' as const : condition.joinWith === 'or' ? 'or' as const : 'and' as const,
        }));
        setConditionDrafts(normalizedConditions);
        setIsConditionEditorOpen(false);
    }, [open]);

    const normalizeConditions = (conditions: FormFieldCondition[]) => (
        conditions
            .filter((condition) => condition.fieldId)
            .map((condition, index) => ({
                fieldId: condition.fieldId,
                operator: condition.operator === 'not_empty' ? 'not_empty' as const : 'empty' as const,
                joinWith: index === 0 ? 'if' as const : condition.joinWith === 'or' ? 'or' as const : 'and' as const,
            }))
    );

    const applySavedConditions = (conditions: FormFieldCondition[]) => {
        const savedConditions = normalizeConditions(conditions);

        onChange({
            ...draft,
            showOnlyIf: savedConditions.length > 0,
            conditionFieldId: savedConditions[0]?.fieldId || '',
            conditionOperator: savedConditions[0]?.operator || 'empty',
            conditionValue: '',
            conditions: savedConditions,
        });

        setConditionDrafts(savedConditions);
        setIsConditionEditorOpen(false);
    };

    const setDraftValue = <K extends keyof FieldDraft>(key: K, value: FieldDraft[K]) => {
        onChange({...draft, [key]: value});
    };

    const updateOption = (index: number, value: string) => {
        setDraftValue(
            'options',
            draft.options.map((item, optionIndex) => (optionIndex === index ? value : item)),
        );
    };

    const removeOption = (index: number) => {
        onChange({
            ...draft,
            options: draft.options.filter((_, optionIndex) => optionIndex !== index),
            optionImages: type === 'Image selection'
                ? draft.optionImages.filter((_, optionIndex) => optionIndex !== index)
                : draft.optionImages,
        });
    };

    const addOption = () => {
        onChange({
            ...draft,
            options: [...draft.options, 'Item'],
            optionImages: type === 'Image selection' ? [...draft.optionImages, ''] : draft.optionImages,
        });
    };

    const updateOptionImage = (index: number, value: string) => {
        const nextImages = [...draft.optionImages];
        nextImages[index] = value;
        setDraftValue('optionImages', nextImages);
    };

    const uploadOptionImage = (index: number, file?: File) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => updateOptionImage(index, String(reader.result));
        reader.readAsDataURL(file);
    };

    const updateShowOnlyIf = (checked: boolean) => {
        const firstFieldId = availableFields[0]?.id || '';
        const nextConditions = checked
            ? conditionDrafts.length
                ? conditionDrafts
                : firstFieldId
                    ? [{fieldId: firstFieldId, operator: 'empty' as const, joinWith: 'if' as const}]
                    : []
            : [];
        setIsConditionEditorOpen(checked && nextConditions.length > 0);
        setConditionDrafts(nextConditions);
        const normalizedNextConditions = normalizeConditions(nextConditions);
        onChange({
            ...draft,
            showOnlyIf: checked && normalizedNextConditions.length > 0,
            conditionFieldId: checked ? normalizedNextConditions[0]?.fieldId || '' : '',
            conditionOperator: checked ? normalizedNextConditions[0]?.operator || 'empty' : 'empty',
            conditionValue: '',
            conditions: checked ? normalizedNextConditions : [],
        });
    };

    const addCondition = () => {
        const nextField = availableFields.find((field) => !usedConditionFieldIds.includes(field.id));
        if (!nextField) return;

        setConditionDrafts((current) => [
            ...current,
            {fieldId: nextField.id, operator: 'empty', joinWith: current.length === 0 ? 'if' : 'and'},
        ]);
        setIsConditionEditorOpen(true);
    };

    const updateCondition = (index: number, nextCondition: FormFieldCondition) => {
        setConditionDrafts((current) => current.map((condition, conditionIndex) => (
            conditionIndex === index ? nextCondition : condition
        )));
    };

    const removeCondition = (index: number) => {
        const nextConditions = conditionDrafts.filter((_, conditionIndex) => conditionIndex !== index);

        if (nextConditions.length === 0) {
            applySavedConditions([]);
            return;
        }

        setConditionDrafts(nextConditions.map((condition, conditionIndex) => ({
            ...condition,
            joinWith: conditionIndex === 0 ? 'if' as const : condition.joinWith === 'or' ? 'or' as const : 'and' as const,
        })));
    };

    const saveConditions = () => {
        applySavedConditions(conditionDrafts);
    };

    const cancelConditions = () => {
        setConditionDrafts((draft.conditions || []).map((condition, index) => ({
            ...condition,
            joinWith: index === 0 ? 'if' as const : condition.joinWith === 'or' ? 'or' as const : 'and' as const,
        })));
        setIsConditionEditorOpen(false);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth={false}
            sx={{
                '& .MuiDialog-container': {
                    alignItems: 'center',
                    justifyContent: 'center',
                },
            }}
            PaperProps={{
                sx: {
                    width: {xs: 'calc(100% - 24px)', sm: isDescription ? 760 : 590},
                    maxWidth: 'calc(100vw - 24px)',
                    maxHeight: 'calc(100dvh - 48px)',
                    borderRadius: 2.5,
                    overflow: 'hidden',
                    boxShadow: '0 18px 60px rgba(15, 23, 42, 0.18)',
                    m: 0,
                },
            }}
        >
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="center"
                sx={{
                    position: 'relative',
                    minHeight: 52,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    px: 2,
                }}
            >
                <Stack direction="row" spacing={1} alignItems="center" color="text.secondary">
                    <Box sx={{display: 'flex'}}>
                        {isDescription ? <DescriptionIcon fontSize="small"/> : type ? iconForType(type) : null}
                    </Box>
                    <Typography fontSize={14}>{type}</Typography>
                </Stack>
                <IconButton
                    size="small"
                    onClick={onClose}
                    sx={{position: 'absolute', right: 12, top: 10}}
                >
                    <IconX size={18}/>
                </IconButton>
            </Stack>

            <DialogContent
                sx={{
                    px: {xs: 2, sm: 4},
                    py: isDescription ? 3 : 4,
                    bgcolor: 'background.paper',
                    overflowY: 'auto',
                }}
            >
                <Stack spacing={2}>
                    {isDescription ? (
                        <DescriptionEditorBox
                            value={draft.label}
                            onChange={(value) => setDraftValue('label', value)}
                        />
                    ) : (
                        <>
                            <CustomTextField
                                className="custom_font"
                                value={draft.label}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraftValue('label', e.target.value)}
                                placeholder={placeholderForType(type || '')}
                                variant="outlined"
                                fullWidth
                                error={Boolean(questionError)}
                                helperText={questionError}
                            />

                            <CustomTextField
                                className="custom_font"
                                value={draft.description}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraftValue('description', e.target.value)}
                                placeholder="Description (optional)"
                                variant="outlined"
                                fullWidth
                            />
                        </>
                    )}

                    {isYesNo && (
                        <>
                            <Divider sx={{my: 1}}/>
                            <Typography fontWeight={700} fontSize={14}>
                                Values
                            </Typography>
                            <Stack direction={{xs: 'column', sm: 'row'}} spacing={2}>
                                {[0, 1].map((index) => (
                                    <CustomTextField
                                        key={index}
                                        className="custom_font"
                                        value={draft.options[index] || (index === 0 ? 'Yes' : 'No')}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateOption(index, e.target.value)}
                                        placeholder={index === 0 ? 'Yes' : 'No'}
                                        variant="outlined"
                                        fullWidth
                                    />
                                ))}
                            </Stack>
                        </>
                    )}

                    {isImageUpload && (
                        <>
                            <Divider sx={{my: 1}}/>
                            <Box>
                                <Typography fontWeight={700} fontSize={14} mb={0.75}>
                                    Image source
                                </Typography>
                                <RadioGroup
                                    value={draft.imageSource}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraftValue('imageSource', e.target.value as FieldDraft['imageSource'])}
                                >
                                    <FormControlLabel
                                        value="camera"
                                        control={<Radio size="small"/>}
                                        label={<Typography fontSize={14}>Camera</Typography>}
                                    />
                                    <FormControlLabel
                                        value="gallery"
                                        control={<Radio size="small"/>}
                                        label={<Typography fontSize={14}>Gallery</Typography>}
                                    />
                                    <FormControlLabel
                                     value="both"
                                     control={<Radio size="small"/>}
                                     label={<Typography fontSize={14}>Both</Typography>}
                                    />
                                </RadioGroup>
                            </Box>
                        </>
                    )}

                    {isVideoUpload && (
                        <>
                            <Divider sx={{my: 1}}/>
                            <Box>
                                <Typography fontWeight={700} fontSize={14} mb={0.75}>
                                    Video source
                                </Typography>
                                <RadioGroup
                                    value={draft.videoSource}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraftValue('videoSource', e.target.value as FieldDraft['videoSource'])}
                                >
                                    <FormControlLabel
                                        value="camera" 
                                        control={<Radio size="small"/>}
                                        label={<Typography fontSize={14}>Camera</Typography>}
                                    />
                                    <FormControlLabel
                                        value="gallery" 
                                        control={<Radio size="small"/>}
                                        label={<Typography fontSize={14}>Gallery</Typography>}
                                    />
                                    <FormControlLabel
                                         value="both" 
                                         control={<Radio size="small"/>}
                                         label={<Typography fontSize={14}>Both</Typography>}
                                    />
                                </RadioGroup>
                            </Box>
                        </>
                    )}

                    {isScanner && (
                        <>
                            <Divider sx={{my: 1}}/>
                            <Box>
                                <Typography fontWeight={700} fontSize={14} mb={0.75}>
                                    Image source
                                </Typography>
                                <RadioGroup
                                    value={draft.scannerSource}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraftValue('scannerSource', e.target.value as FieldDraft['scannerSource'])}
                                >
                                    <FormControlLabel
                                        value="camera"
                                        control={<Radio size="small"/>}
                                        label={<Typography fontSize={14}>Camera</Typography>}
                                    />
                                    <FormControlLabel
                                         value="gallery"
                                         control={<Radio size="small"/>}
                                         label={<Typography fontSize={14}>Gallery</Typography>}
                                    />
                                    <FormControlLabel
                                        value="both"
                                        control={<Radio size="small"/>}
                                        label={<Typography fontSize={14}>Both</Typography>}
                                    />
                                </RadioGroup>
                            </Box>
                        </>
                    )}

                    {isDate && (
                        <>
                            <Divider sx={{my: 1}}/>
                            <Box>
                                <Typography fontWeight={700} fontSize={14} mb={0.75}>
                                    Format
                                </Typography>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={draft.dateIncludeDate}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraftValue('dateIncludeDate', e.target.checked || !draft.dateIncludeTime)}
                                            size="small"
                                        />
                                    }
                                    label={<Typography fontSize={14}>Date</Typography>}
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={draft.dateIncludeTime}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraftValue('dateIncludeTime', e.target.checked || !draft.dateIncludeDate)}
                                            size="small"
                                        />
                                    }
                                    label={<Typography fontSize={14}>Time</Typography>}
                                />
                            </Box>
                        </>
                    )}

                    {isLocation && (
                        <>
                            <Divider sx={{my: 1}}/>
                            <Box>
                                <Typography fontWeight={700} fontSize={14} mb={0.75}>
                                    Select by
                                </Typography>
                                <RadioGroup
                                    value={draft.locationSelectBy}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraftValue('locationSelectBy', e.target.value as FieldDraft['locationSelectBy'])}
                                >
                                    <FormControlLabel
                                        value="current" 
                                        control={<Radio size="small"/>}
                                        label={<Typography fontSize={14}>Current location</Typography>}
                                    />
                                    <FormControlLabel
                                         value="manual" 
                                         control={<Radio size="small"/>}
                                         label={<Typography fontSize={14}>Manual input</Typography>}
                                    />
                                </RadioGroup>
                            </Box>
                        </>
                    )}

                    {isNumbersSlider && (
                        <>
                            <Divider sx={{my: 1}}/>
                            <Typography fontWeight={700} fontSize={14}>
                                Range of values
                            </Typography>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <CustomTextField
                                    className="custom_font"
                                    type="number"
                                    value={draft.minValue}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraftValue('minValue', Number(e.target.value))}
                                    variant="outlined"
                                    sx={{width: 90}}
                                />
                                <Typography fontSize={14} color="text.secondary">to</Typography>
                                <CustomTextField
                                    className="custom_font"
                                    type="number"
                                    value={draft.maxValue}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraftValue('maxValue', Number(e.target.value))}
                                    variant="outlined"
                                    sx={{width: 90}}
                                />
                            </Stack>
                        </>
                    )}

                    {isRating && (
                        <>
                            <Divider sx={{my: 1}}/>
                            <Box>
                                <Typography fontWeight={700} fontSize={14} mb={1.5}>
                                    Choose number of stars
                                </Typography>
                                <Stack direction={{xs: 'column', sm: 'row'}} spacing={1.5} alignItems="center">
                                    <CustomTextField
                                        className="custom_font"
                                        value={draft.ratingMinLabel}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraftValue('ratingMinLabel', e.target.value)}
                                        placeholder="Meh.."
                                        variant="outlined"
                                        fullWidth
                                    />
                                    <Stack
                                        direction="row"
                                        alignItems="center"
                                        sx={{
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            borderRadius: 1,
                                            overflow: 'hidden',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <IconButton
                                            size="small"
                                            onClick={() => setDraftValue('ratingStarCount', Math.max(3, draft.ratingStarCount - 1))}
                                            disabled={draft.ratingStarCount <= 3}
                                            sx={{borderRadius: 0, width: 40, height: 38}}
                                        >
                                            <IconMinus size={16}/>
                                        </IconButton>
                                        <Stack
                                            direction="row"
                                            spacing={0.75}
                                            alignItems="center"
                                            justifyContent="center"
                                            sx={{
                                                width: 58,
                                                height: 38,
                                                borderLeft: '1px solid',
                                                borderRight: '1px solid',
                                                borderColor: 'divider',
                                            }}
                                        >
                                            {iconForType('Rating')}
                                            <Typography fontSize={14}>{draft.ratingStarCount}</Typography>
                                        </Stack>
                                        <IconButton
                                            size="small"
                                            onClick={() => setDraftValue('ratingStarCount', Math.min(5, draft.ratingStarCount + 1))}
                                            disabled={draft.ratingStarCount >= 5}
                                            sx={{borderRadius: 0, width: 40, height: 38}}
                                        >
                                            <IconPlus size={16}/>
                                        </IconButton>
                                    </Stack>
                                    <CustomTextField
                                        className="custom_font"
                                        value={draft.ratingMaxLabel}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraftValue('ratingMaxLabel', e.target.value)}
                                        placeholder="Nice!"
                                        variant="outlined"
                                        fullWidth
                                    />
                                </Stack>
                            </Box>
                        </>
                    )}

                    {isImageSelection && (
                        <>
                            <Divider sx={{my: 1}}/>
                            <Stack direction={{xs: 'column', sm: 'row'}} alignItems={{sm: 'center'}}
                                   justifyContent="space-between" spacing={1}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography fontWeight={700} fontSize={14}>
                                        Options
                                    </Typography>
                                    <Typography color="text.secondary" fontSize={13}>
                                        Recommended image size: 1035X510 pixels
                                    </Typography>
                                </Stack>
                                <Stack direction="row" spacing={2}>
                                    <Typography color="primary.main" fontSize={13}>
                                        Sort - Custom
                                    </Typography>
                                    <Typography color="text.disabled" fontSize={13}>
                                        Export
                                    </Typography>
                                    <Typography color="primary.main" fontSize={13}>
                                        Import
                                    </Typography>
                                </Stack>
                            </Stack>
                            <Stack spacing={1}>
                                {draft.options.map((item, index) => {
                                    const image = draft.optionImages[index] || '';

                                    return (
                                        <Stack key={index} direction="row" spacing={1} alignItems="center">
                                            <Box sx={{color: 'text.disabled', display: 'flex'}}>
                                                <IconGripVertical size={18}/>
                                            </Box>
                                            <Stack
                                                direction={{xs: 'column', sm: 'row'}}
                                                spacing={1}
                                                alignItems="stretch"
                                                sx={{
                                                    flex: 1,
                                                    border: '1px solid',
                                                    borderColor: 'divider',
                                                    borderRadius: 2,
                                                    p: 1,
                                                }}
                                            >
                                                <CustomTextField
                                                    className="custom_font"
                                                    value={item}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateOption(index, e.target.value)}
                                                    placeholder="Add option..."
                                                    variant="standard"
                                                    fullWidth
                                                    InputProps={{disableUnderline: true}}
                                                    sx={{alignSelf: 'center'}}
                                                />
                                                <Button
                                                    component="label"
                                                    variant="outlined"
                                                    sx={{
                                                        width: {xs: '100%', sm: 126},
                                                        minHeight: 64,
                                                        flexShrink: 0,
                                                        borderRadius: 1.5,
                                                        borderColor: 'divider',
                                                        color: image ? 'primary.main' : 'text.secondary',
                                                        textTransform: 'none',
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    {image ? (
                                                        <Box
                                                            component="img"
                                                            src={image}
                                                            alt={item || 'Option image'}
                                                            sx={{
                                                                width: '100%',
                                                                height: 56,
                                                                objectFit: 'cover',
                                                                borderRadius: 1
                                                            }}
                                                        />
                                                    ) : (
                                                        <Stack alignItems="center" spacing={0.5}>
                                                            <IconPhoto size={18}/>
                                                            <Typography fontSize={11}>Upload an image</Typography>
                                                        </Stack>
                                                    )}
                                                    <input
                                                        hidden
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => uploadOptionImage(index, e.target.files?.[0])}
                                                    />
                                                </Button>
                                            </Stack>
                                            <IconButton
                                                size="small"
                                                onClick={() => removeOption(index)}
                                                disabled={draft.options.length <= 1}
                                            >
                                                <IconTrash size={16}/>
                                            </IconButton>
                                        </Stack>
                                    );
                                })}
                            </Stack>
                            <Box>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<IconPlus size={16}/>}
                                    onClick={addOption}
                                    sx={{borderRadius: 5}}
                                >
                                    Add field
                                </Button>
                            </Box>
                        </>
                    )}

                    {isSimpleOptionField && (
                        <>
                            <Divider sx={{my: 1}}/>
                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Typography fontWeight={700} fontSize={14}>
                                    Items
                                </Typography>
                                <Stack direction="row" spacing={2}>
                                    <Typography color="primary.main" fontSize={13}>
                                        Sort - Custom
                                    </Typography>
                                    <Typography color="text.disabled" fontSize={13}>
                                        Export
                                    </Typography>
                                    <Typography color="primary.main" fontSize={13}>
                                        Import
                                    </Typography>
                                </Stack>
                            </Stack>
                            <Stack spacing={1}>
                                {draft.options.map((item, index) => (
                                    <Stack key={index} direction="row" spacing={1} alignItems="center">
                                        <Box sx={{color: 'text.disabled', display: 'flex'}}>
                                            <IconGripVertical size={18}/>
                                        </Box>

                                        <CustomTextField
                                            className="custom_font"
                                            value={item}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateOption(index, e.target.value)}
                                            placeholder="Item"
                                            variant="outlined"
                                            fullWidth
                                        />
                                        <IconButton
                                            size="small"
                                            onClick={() => removeOption(index)}
                                            disabled={draft.options.length <= 1}
                                        >
                                            <IconTrash size={16}/>
                                        </IconButton>
                                    </Stack>
                                ))}
                            </Stack>
                            <Box>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<IconPlus size={16}/>}
                                    onClick={addOption}
                                    sx={{borderRadius: 5}}
                                >
                                    Add field
                                </Button>
                            </Box>
                        </>
                    )}

                    {isFormula && (
                        <>
                            <Divider sx={{my: 1}}/>
                            <Box>
                                <Typography fontWeight={700} fontSize={14}>
                                    Formula builder
                                </Typography>
                                <Typography color="text.secondary" fontSize={13}>
                                    Add number fields and operators. The result is read-only and updates automatically
                                    in the form preview.
                                </Typography>
                            </Box>
                            <Box
                                sx={{
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    overflow: 'hidden',
                                }}
                            >
                                <Stack
                                    direction={{xs: 'column', sm: 'row'}}
                                    justifyContent="space-between"
                                    alignItems={{sm: 'center'}}
                                    spacing={1}
                                    sx={{bgcolor: 'action.hover', px: 1.5, py: 1}}
                                >
                                    <Typography color="text.secondary" fontSize={13}>
                                        Number fields
                                    </Typography>
                                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                        {formulaNumberFields.length ? formulaNumberFields.map((field) => (
                                            <Chip
                                                key={field.id}
                                                size="small"
                                                label={fieldDisplayLabel(field)}
                                                onClick={() => setDraftValue(
                                                    'formulaExpression',
                                                    `${draft.formulaExpression}${draft.formulaExpression ? ' ' : ''}${fieldDisplayLabel(field)}`,
                                                )}
                                                sx={{bgcolor: '#fff'}}
                                            />
                                        )) : (
                                            <Typography color="text.disabled" fontSize={13}>
                                                Add a Number field first
                                            </Typography>
                                        )}
                                    </Stack>
                                </Stack>

                                <CustomTextField
                                    value={draft.formulaExpression}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        const nextValue = e.target.value.replace(/[^0-9a-zA-Z_+\-*/().\s]/g, '');
                                        setDraftValue('formulaExpression', nextValue);
                                    }}
                                    placeholder="e.g. Number 1 + Number 2"
                                    multiline
                                    minRows={4}
                                    fullWidth
                                    variant="standard"
                                    InputProps={{disableUnderline: true}}
                                    sx={{px: 2, py: 1}}
                                />
                            </Box>
                        </>
                    )}

                    {!isDescription && !isFormula && (
                        <>
                            <Divider sx={{my: 1}}/>
                            <Stack spacing={0.25}>
                                {!isGroup && (
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={draft.required}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraftValue('required', e.target.checked)}
                                                size="small"
                                            />
                                        }
                                        label={<Typography fontSize={14}>Required</Typography>}
                                    />
                                )}
                                {!isLocation && (
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={draft.locationStampCapture}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraftValue('locationStampCapture', e.target.checked)}
                                                size="small"
                                            />
                                        }
                                        label={<Typography fontSize={14}>Location stamp capture</Typography>}
                                    />
                                )}
                                {canAllowMultipleUploads && (
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={draft.allowMultipleUploads}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraftValue('allowMultipleUploads', e.target.checked)}
                                                size="small"
                                            />
                                        }
                                        label={<Typography fontSize={14}>Allow multiple uploads</Typography>}
                                    />
                                )}
                                {(isGroup || isOptionField) && (
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={draft.multipleSelection}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraftValue('multipleSelection', e.target.checked)}
                                                size="small"
                                            />
                                        }
                                        label={
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Typography fontSize={14}>
                                                    {isGroup
                                                        ? 'Allow users to add multiple answers'
                                                        : 'Multiple selection'}
                                                </Typography>
                                                {isGroup && (
                                                    <Chip
                                                        label="NEW"
                                                        size="small"
                                                        sx={{
                                                            height: 20,
                                                            bgcolor: '#E91E8C',
                                                            color: '#fff',
                                                            fontSize: 10,
                                                            fontWeight: 700,
                                                        }}
                                                    />
                                                )}
                                            </Stack>
                                        }
                                    />
                                )}
                            </Stack>
                            {canAddCondition && (
                                <>
                                    <Divider sx={{my: 1}}/>

                                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                                        <Stack direction="row" spacing={0.75} alignItems="center">
                                            <Typography fontSize={14} color="#1F2937">Show this field only
                                                if...</Typography>
                                            <Box sx={{color: '#8A99A8', display: 'flex'}}>
                                                <IconHelpCircle size={17}/>
                                            </Box>
                                        </Stack>
                                        <IOSSwitch
                                            checked={draft.showOnlyIf}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateShowOnlyIf(e.target.checked)}
                                        />
                                    </Stack>

                                    <Box>
                                        {draft.showOnlyIf && !isConditionEditorOpen && draft.conditions.length > 0 && (
                                            <Box
                                                sx={{
                                                    bgcolor: '#EAFBF6',
                                                    borderRadius: 2,
                                                    px: 2,
                                                    py: 1.5,
                                                    position: 'relative',
                                                }}
                                            >
                                                <IconButton
                                                    size="small"
                                                    onClick={() => {
                                                        setConditionDrafts((draft.conditions || []).map((condition, index) => ({
                                                            ...condition,
                                                            joinWith: index === 0 ? 'if' as const : condition.joinWith === 'or' ? 'or' as const : 'and' as const,
                                                        })));
                                                        setIsConditionEditorOpen(true);
                                                    }}
                                                    sx={{position: 'absolute', top: 10, right: 10, color: '#8A99A8'}}
                                                >
                                                    <IconPencil size={16}/>
                                                </IconButton>
                                                <Stack spacing={1.15} pr={4}>
                                                    {draft.conditions.map((condition, conditionIndex) => {
                                                        
                                                        const conditionField = availableFields.find((field) => field.id === condition.fieldId);
                                                        const fieldIndex = availableFields.findIndex((field) => field.id === condition.fieldId) + 1;
                                                        
                                                        const joinLabel = conditionIndex === 0
                                                            ? 'Show only if' : condition.joinWith === 'or' ? 'Or if' : 'And if';

                                                        return (
                                                            <Box
                                                                key={`${condition.fieldId}-${conditionIndex}`}
                                                                sx={{
                                                                    display: 'grid',
                                                                    gridTemplateColumns: {
                                                                        xs: '1fr',
                                                                        sm: '108px minmax(0, 1fr)'
                                                                    },
                                                                    gap: {xs: 0.75, sm: 1.25},
                                                                    alignItems: 'center',
                                                                }}
                                                            >
                                                                <Typography sx={{
                                                                    fontSize: 14,
                                                                    fontWeight: conditionIndex === 0 ? 700 : 600,
                                                                    color: '#123044'
                                                                }}>
                                                                    {joinLabel}
                                                                </Typography>
                                                                <Chip
                                                                    label={(
                                                                        <Stack direction="row" spacing={0.75}
                                                                               alignItems="center">
                                                                            <Typography component="span" sx={{
                                                                                fontSize: 12,
                                                                                fontWeight: 700
                                                                            }}>
                                                                                {fieldIndex || conditionIndex + 1}
                                                                            </Typography>
                                                                            <Box component="span"
                                                                                 sx={{display: 'flex'}}>
                                                                                {conditionField ? iconForType(conditionField.type) : null}
                                                                            </Box>
                                                                            <Typography component="span"
                                                                                        sx={{fontSize: 12}}>
                                                                                {conditionField ? fieldDisplayLabel(conditionField) : 'Deleted field'}
                                                                            </Typography>
                                                                        </Stack>
                                                                    )}
                                                                    sx={{
                                                                        justifySelf: 'stretch',
                                                                        height: 32,
                                                                        bgcolor: '#fff',
                                                                        color: '#123044',
                                                                        borderRadius: 1.5,
                                                                        '& .MuiChip-label': {px: 1.25, width: '100%'},
                                                                    }}
                                                                />
                                                                <Typography sx={{fontSize: 14, color: '#123044'}}>
                                                                    response is
                                                                </Typography>
                                                                <Chip
                                                                    label={condition.operator === 'not_empty' ? 'Not Empty' : 'Empty'}
                                                                    sx={{
                                                                        justifySelf: 'stretch',
                                                                        height: 32,
                                                                        bgcolor: '#fff',
                                                                        color: '#123044',
                                                                        borderRadius: 1.5,
                                                                        '& .MuiChip-label': {px: 1.25, width: '100%'},
                                                                    }}
                                                                />
                                                            </Box>
                                                        );
                                                    })}
                                                </Stack>
                                                {canAddMoreConditions && (
                                                    <Button
                                                        variant="outlined"
                                                        startIcon={<IconPlus size={16}/>}
                                                        onClick={addCondition}
                                                        sx={{
                                                            mt: 1.5,
                                                            borderRadius: 0,
                                                            borderColor: '#0B8CFF',
                                                            color: '#0B8CFF',
                                                            textTransform: 'none'
                                                        }}
                                                    >
                                                        Add Condition
                                                    </Button>
                                                )}
                                            </Box>
                                        )}
                                        {draft.showOnlyIf && !isConditionEditorOpen && draft.conditions.length === 0 && canAddMoreConditions && (
                                            <Box>
                                                <Button
                                                    variant="outlined"
                                                    startIcon={<IconPlus size={16}/>}
                                                    onClick={addCondition}
                                                    sx={{
                                                        borderRadius: 0,
                                                        borderColor: '#0B8CFF',
                                                        color: '#0B8CFF',
                                                        textTransform: 'none'
                                                    }}
                                                >
                                                    Add Condition
                                                </Button>
                                            </Box>
                                        )}
                                        {draft.showOnlyIf && isConditionEditorOpen && (
                                            <Box
                                                sx={{
                                                    border: '1px solid',
                                                    borderColor: '#E5E7EB',
                                                    borderRadius: 2,
                                                    p: 1.25,
                                                    bgcolor: '#fff',
                                                }}
                                            >
                                                <Stack spacing={1}>
                                                    {conditionDrafts.map((condition, conditionIndex) => {
                                                        const conditionField = availableFields.find((field) => field.id === condition.fieldId) || availableFields[0];
                                                        const selectableFields = availableFields.filter((field) => (
                                                            field.id === condition.fieldId || !usedConditionFieldIds.includes(field.id)
                                                        ));

                                                        return (
                                                            <Box
                                                                key={`${condition.fieldId || 'condition'}-${conditionIndex}`}
                                                                sx={{
                                                                    bgcolor: '#EAFBF6',
                                                                    borderRadius: 1.5,
                                                                    px: 1.75,
                                                                    py: 1.5,
                                                                }}
                                                            >
                                                                <Box
                                                                    sx={{
                                                                        display: 'grid',
                                                                        gridTemplateColumns: {
                                                                            xs: '1fr',
                                                                            sm: '108px minmax(0, 1fr) 36px'
                                                                        },
                                                                        gap: {xs: 0.75, sm: 1.25},
                                                                        alignItems: 'center',
                                                                        mb: 1,
                                                                    }}
                                                                >
                                                                    {conditionIndex === 0 ? (
                                                                        <Typography sx={{
                                                                            fontSize: 14,
                                                                            fontWeight: 700,
                                                                            color: '#123044'
                                                                        }}>
                                                                            Show only if
                                                                        </Typography>
                                                                    ) : (
                                                                        <Select
                                                                            size="small"
                                                                            value={condition.joinWith === 'or' ? 'or' : 'and'}
                                                                            onChange={(e) => updateCondition(conditionIndex, {
                                                                                ...condition,
                                                                                joinWith: e.target.value as FormFieldCondition['joinWith'],
                                                                            })}
                                                                            sx={{
                                                                                bgcolor: '#fff',
                                                                                borderRadius: 1.5,
                                                                                '& .MuiSelect-select': {py: 1.1},
                                                                            }}
                                                                        >
                                                                            <MenuItem value="and">And if</MenuItem>
                                                                            <MenuItem value="or">Or if</MenuItem>
                                                                        </Select>
                                                                    )}
                                                                    <Select
                                                                        fullWidth
                                                                        size="small"
                                                                        value={condition.fieldId || conditionField?.id || ''}
                                                                        onChange={(e) => updateCondition(conditionIndex, {
                                                                            ...condition,
                                                                            fieldId: String(e.target.value),
                                                                        })}
                                                                        renderValue={(selected) => {
                                                                            const field = availableFields.find((item) => item.id === selected);
                                                                            const index = availableFields.findIndex((item) => item.id === selected) + 1;
                                                                            return (
                                                                                <Stack direction="row" spacing={1}
                                                                                       alignItems="center">
                                                                                    <Box
                                                                                        sx={{
                                                                                            width: 22,
                                                                                            height: 22,
                                                                                            borderRadius: '50%',
                                                                                            bgcolor: '#D5FFF5',
                                                                                            color: '#0BAF84',
                                                                                            display: 'flex',
                                                                                            alignItems: 'center',
                                                                                            justifyContent: 'center',
                                                                                            fontSize: 12,
                                                                                            fontWeight: 800,
                                                                                            flexShrink: 0,
                                                                                        }}
                                                                                    >
                                                                                        {index || 1}
                                                                                    </Box>
                                                                                    <Box sx={{
                                                                                        display: 'flex',
                                                                                        color: '#0F2637',
                                                                                        flexShrink: 0
                                                                                    }}>
                                                                                        {field ? iconForType(field.type) : null}
                                                                                    </Box>
                                                                                    <Typography
                                                                                        noWrap
                                                                                        fontSize={14}
                                                                                    >
                                                                                        {field ? fieldDisplayLabel(field) : 'Select field...'}
                                                                                    </Typography>
                                                                                </Stack>
                                                                            );
                                                                        }}
                                                                        sx={{
                                                                            bgcolor: '#fff',
                                                                            borderRadius: 1.5,
                                                                            '& .MuiSelect-select': {py: 1.1},
                                                                        }}
                                                                    >
                                                                        {selectableFields.map((field) => (
                                                                            <MenuItem key={field.id} value={field.id}>
                                                                                {fieldDisplayLabel(field)}
                                                                            </MenuItem>
                                                                        ))}
                                                                    </Select>
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => removeCondition(conditionIndex)}
                                                                        sx={{
                                                                            width: 34,
                                                                            height: 34,
                                                                            color: '#0B55B7',
                                                                            bgcolor: '#DDEBFF',
                                                                            justifySelf: {xs: 'flex-end', sm: 'center'},
                                                                            '&:hover': {bgcolor: '#CFE1FF'},
                                                                        }}
                                                                    >
                                                                        <IconX size={18}/>
                                                                    </IconButton>
                                                                </Box>
                                                                <Box
                                                                    sx={{
                                                                        display: 'grid',
                                                                        gridTemplateColumns: {
                                                                            xs: '1fr',
                                                                            sm: '108px minmax(0, 1fr) 36px'
                                                                        },
                                                                        gap: {xs: 0.75, sm: 1.25},
                                                                        alignItems: 'center',
                                                                    }}
                                                                >
                                                                    <Typography sx={{fontSize: 14, color: '#123044'}}>
                                                                        response is
                                                                    </Typography>
                                                                    <Select
                                                                        fullWidth
                                                                        size="small"
                                                                        value={condition.operator === 'not_empty' ? 'not_empty' : 'empty'}
                                                                        onChange={(e) => updateCondition(conditionIndex, {
                                                                            ...condition,
                                                                            operator: e.target.value as FormFieldCondition['operator'],
                                                                        })}
                                                                        sx={{
                                                                            bgcolor: '#fff',
                                                                            borderRadius: 1.5,
                                                                            '& .MuiSelect-select': {py: 1.1},
                                                                        }}
                                                                    >
                                                                        <MenuItem value="empty">Empty</MenuItem>
                                                                        <MenuItem value="not_empty">Not Empty</MenuItem>
                                                                    </Select>
                                                                    <Box sx={{display: {xs: 'none', sm: 'block'}}}/>
                                                                </Box>
                                                            </Box>
                                                        );
                                                    })}
                                                </Stack>
                                                <Stack direction="row" alignItems="center"
                                                       justifyContent="space-between" mt={1.5} spacing={1}>
                                                    {canAddMoreConditions ? (
                                                        <Button
                                                            variant="outlined"
                                                            startIcon={<IconPlus size={16}/>}
                                                            onClick={addCondition}
                                                            sx={{
                                                                borderRadius: 0,
                                                                borderColor: '#0B8CFF',
                                                                color: '#0B8CFF',
                                                                textTransform: 'none'
                                                            }}
                                                        >
                                                            Add Condition
                                                        </Button>
                                                    ) : <Box/>}
                                                    {conditionDrafts.length > 0 && (
                                                        <Stack direction="row" spacing={1}>
                                                            <Button
                                                                variant="outlined"
                                                                onClick={cancelConditions}
                                                                sx={{borderRadius: 5, textTransform: 'none'}}
                                                            >
                                                                Cancel
                                                            </Button>
                                                            <Button
                                                                variant="outlined"
                                                                onClick={saveConditions}
                                                                sx={{borderRadius: 5, textTransform: 'none'}}
                                                            >
                                                                Save condition
                                                            </Button>
                                                        </Stack>
                                                    )}
                                                </Stack>
                                            </Box>
                                        )}
                                    </Box>
                                </>
                            )}
                        </>
                    )}
                </Stack>
            </DialogContent>

            <DialogActions sx={{px: {xs: 2, sm: 4}, py: 2, borderTop: '1px solid', borderColor: 'divider'}}>
                {!isDescription && (
                    <Button onClick={onClose} color="inherit">
                        Cancel
                    </Button>
                )}
                <Button variant="contained" onClick={onConfirm} sx={{borderRadius: 5}}>
                    Confirm
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default FieldSettingsDialog;
