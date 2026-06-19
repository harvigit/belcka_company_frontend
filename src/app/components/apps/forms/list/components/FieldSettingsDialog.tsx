'use client';

import React, {useEffect, useRef, useState} from 'react';
import {
    Box,
    Button,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    Drawer,
    Divider,
    FormControlLabel,
    IconButton,
    Menu,
    MenuItem,
    Paper,
    Radio,
    RadioGroup,
    Select,
    Stack,
    Typography,
} from '@mui/material';
import {
    IconArrowLeft,
    IconChevronDown,
    IconGripVertical,
    IconHash,
    IconHelpCircle,
    IconMinus,
    IconPencil,
    IconPhoto,
    IconPlus,
    IconTrash,
    IconX,
} from '@tabler/icons-react';
import DescriptionIcon from '@mui/icons-material/Description';
import CustomTextField from '@/app/components/forms/theme-elements/CustomTextField';
import IOSSwitch from '@/app/components/common/IOSSwitch';
import {FieldDraft, FormField, FormFieldCondition} from '../../types';
import {iconForType, optionFieldTypes, placeholderForType} from '../../common/formBuilderConstants';
import {fieldDisplayLabel, getFormulaExpressionError} from '../formUtils';
import DescriptionEditorBox from './DescriptionEditorBox';

type FieldSettingsDialogProps = {
    open: boolean;
    type: string | null;
    draft: FieldDraft;
    availableFields: FormField[];
    questionError: string;
    formulaError: string;
    optionErrors: string[];
    optionImageErrors: string[];
    onChange: (draft: FieldDraft) => void;
    onClose: () => void;
    onConfirm: () => void;
};

type FormulaExpressionPart = {
    type: 'field' | 'text';
    value: string;
};

const isFormulaLabelBoundaryChar = (value: string) => !/[a-zA-Z0-9_]/.test(value);

const tokenizeFormulaExpression = (expression: string, fields: FormField[]): FormulaExpressionPart[] => {
    const labels = fields
        .map((field) => fieldDisplayLabel(field).trim())
        .filter(Boolean).sort((a, b) => b.length - a.length);
    
    const parts: FormulaExpressionPart[] = [];
    let buffer = '';
    let index = 0;

    const flushText = () => {
        if (!buffer) return;
        parts.push({type: 'text', value: buffer});
        buffer = '';
    };

    while (index < expression.length) {
        const matchedLabel = labels.find((label) => {
            if (!expression.startsWith(label, index)) return false;

            const previousChar = expression[index - 1] || '';
            const nextChar = expression[index + label.length] || '';

            return (!previousChar || isFormulaLabelBoundaryChar(previousChar))
                && (!nextChar || isFormulaLabelBoundaryChar(nextChar));
        });

        if (matchedLabel) {
            flushText();
            parts.push({type: 'field', value: matchedLabel});
            index += matchedLabel.length;
            continue;
        }

        buffer += expression[index];
        index += 1;
    }

    flushText();
    return parts;
};

const serializeFormulaEditor = (editor: HTMLDivElement | null) => {
    if (!editor) return '';

    return Array.from(editor.childNodes).map((node) => {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
        if (node instanceof HTMLElement && node.dataset.formulaField) return node.dataset.formulaField;
        return node.textContent || '';
    }).join('');
};

const FieldSettingsDialog = ({
                                 open,
                                 type,
                                 draft,
                                 availableFields,
                                 questionError,
                                 formulaError,
                                 optionErrors,
                                 optionImageErrors,
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
    
    const formulaExpressionError = isFormula
        ? formulaError || (draft.formulaExpression.trim() ? getFormulaExpressionError(draft.formulaExpression, formulaNumberFields) : '') : '';
    
    const [formulaFieldAnchorEl, setFormulaFieldAnchorEl] = useState<null | HTMLElement>(null);
    const [optionSortAnchorEl, setOptionSortAnchorEl] = useState<null | HTMLElement>(null);
    const optionSortMode = draft.optionSortMode === 'az' ? 'az' : 'custom';
    const [optionImportOpen, setOptionImportOpen] = useState(false);
    const [optionImportText, setOptionImportText] = useState('');
    const [optionImportConfirmOpen, setOptionImportConfirmOpen] = useState(false);
    const [optionImportMode, setOptionImportMode] = useState<'append' | 'replace'>('append');
    const formulaEditorRef = useRef<HTMLDivElement | null>(null);
    const formulaSelectionRef = useRef<Range | null>(null);
    const [isConditionEditorOpen, setIsConditionEditorOpen] = useState(false);
    const [conditionDrafts, setConditionDrafts] = useState<FormFieldCondition[]>([]);
    const [rangeError, setRangeError] = useState('');
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
        setFormulaFieldAnchorEl(null);
        setOptionSortAnchorEl(null);
        setOptionImportOpen(false);
        setOptionImportText('');
        setOptionImportConfirmOpen(false);
        setOptionImportMode('append');
        setRangeError('');
        
    }, [open]);

    useEffect(() => {
        if (!isFormula) return;

        const editor = formulaEditorRef.current;
        if (!editor || serializeFormulaEditor(editor) === draft.formulaExpression) return;

        editor.replaceChildren();
        tokenizeFormulaExpression(draft.formulaExpression, formulaNumberFields).forEach((part) => {
            if (part.type === 'text') {
                editor.appendChild(document.createTextNode(part.value));
                return;
            }

            editor.appendChild(createFormulaFieldToken(part.value));
        });
    }, [isFormula, draft.formulaExpression, formulaNumberFields]);

    const normalizeConditions = (conditions: FormFieldCondition[]) => (
        conditions.filter((condition) => condition.fieldId)
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
        if (key === 'minValue' || key === 'maxValue') setRangeError('');
        onChange({...draft, [key]: value});
    };

    const handleConfirm = () => {
        if (isNumbersSlider && Number(draft.minValue) > Number(draft.maxValue)) {
            setRangeError('Minimum value cannot be greater than maximum value.');
            return;
        }

        setRangeError('');
        onConfirm();
    };

    const createFormulaFieldToken = (label: string) => {
        const token = document.createElement('span');
        
        token.contentEditable = 'false';
        token.dataset.formulaField = label;
        token.textContent = label;
        token.style.display = 'inline-flex';
        token.style.alignItems = 'center';
        token.style.minHeight = '30px';
        token.style.padding = '0 10px';
        token.style.margin = '0 2px';
        token.style.borderRadius = '6px';
        token.style.backgroundColor = '#EEF7FF';
        token.style.color = '#123044';
        token.style.fontSize = '14px';
        token.style.lineHeight = '30px';
        token.style.verticalAlign = 'middle';
        token.style.userSelect = 'none';
        
        return token;
    };

    const saveFormulaSelection = () => {
        const editor = formulaEditorRef.current;
        const selection = window.getSelection();

        if (!editor || !selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        if (editor.contains(container) || editor === container) {
            formulaSelectionRef.current = range.cloneRange();
        }
    };

    const focusFormulaEditorAtEnd = () => {
        const editor = formulaEditorRef.current;
        if (!editor) return;
        editor.focus();
        
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);

        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        formulaSelectionRef.current = range.cloneRange();
    };

    const emitFormulaEditorChange = () => {
        setDraftValue('formulaExpression', serializeFormulaEditor(formulaEditorRef.current));
    };

    const addFormulaField = (field: FormField) => {
        const nextLabel = fieldDisplayLabel(field);
        const editor = formulaEditorRef.current;
        if (!editor) {
            const spacer = draft.formulaExpression && !/\s$/.test(draft.formulaExpression) ? ' ' : '';
            setDraftValue('formulaExpression', `${draft.formulaExpression}${spacer}${nextLabel}`);
            setFormulaFieldAnchorEl(null);
            return;
        }

        editor.focus();

        const selection = window.getSelection();
        const range = formulaSelectionRef.current || document.createRange();
        if (!formulaSelectionRef.current) {
            range.selectNodeContents(editor);
            range.collapse(false);
        }

        selection?.removeAllRanges();
        selection?.addRange(range);

        const token = createFormulaFieldToken(nextLabel);
        const caretNode = document.createTextNode('');
        range.deleteContents();
        range.insertNode(caretNode);
        range.insertNode(token);

        const nextRange = document.createRange();
        nextRange.setStartAfter(caretNode);
        nextRange.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(nextRange);
        formulaSelectionRef.current = nextRange.cloneRange();

        emitFormulaEditorChange();
        setFormulaFieldAnchorEl(null);
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
            options: [...draft.options, ''],
            optionImages: type === 'Image selection' ? [...draft.optionImages, ''] : draft.optionImages,
        });
    };

    const filledOptions = draft.options.map((item) => item.trim()).filter(Boolean);
    const canExportOptions = filledOptions.length > 0;
    const importedOptions = optionImportText
        .split(/\r?\n/)
        .flatMap((line) => line.split('\t'))
        .map((item) => item.trim())
        .filter(Boolean);
    const canImportOptions = importedOptions.length > 0;

    const sortOptionEntries = (entries: {item: string; image: string}[]) => (
        [...entries].sort((a, b) => a.item.trim().localeCompare(b.item.trim(), undefined, {
            sensitivity: 'base',
            numeric: true,
        }))
    );

    const applyOptionSort = (mode: 'custom' | 'az') => {
        setOptionSortAnchorEl(null);

        const optionEntries = draft.options.map((item, index) => ({item, image: draft.optionImages[index] || ''}));
        const nextOptionEntries = mode === 'az' ? sortOptionEntries(optionEntries) : optionEntries;

        onChange({
            ...draft,
            optionSortMode: mode,
            options: nextOptionEntries.map(({item}) => item),
            optionImages: type === 'Image selection'
                ? nextOptionEntries.map(({image}) => image)
                : draft.optionImages,
        });
    };

    const escapeExcelHtml = (value: string) => value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const exportOptions = () => {
        if (!canExportOptions) return;

        const rows = filledOptions
            .map((item) => `<tr><td style='mso-number-format:"\\@";' >${escapeExcelHtml(item)}</td></tr>`)
            .join('');
        const html = `\ufeff<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8" /><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sheet1</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table><colgroups><col style="width: 120px"></col></colgroups><thead><tr><th >text</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
        const blob = new Blob([html], {type: 'application/vnd.ms-excel;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'options.xls';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    const closeImportDrawer = () => {
        setOptionImportOpen(false);
        setOptionImportText('');
        setOptionImportConfirmOpen(false);
        setOptionImportMode('append');
    };

    const applyImportedOptions = (mode: 'append' | 'replace') => {
        if (!canImportOptions) return;

        const importedOptionEntries = importedOptions.map((item) => ({item, image: ''}));
        const currentOptionEntries = draft.options.map((item, index) => ({item, image: draft.optionImages[index] || ''}));
        
        let importIndex = 0;
        const mergedOptionEntries = mode === 'replace'
            ? importedOptionEntries
            : [
                ...currentOptionEntries.map((entry) => {
                    if (entry.item.trim() || importIndex >= importedOptionEntries.length) return entry;

                    const importedEntry = importedOptionEntries[importIndex];
                    importIndex += 1;
                    return importedEntry;
                }),
                ...importedOptionEntries.slice(importIndex),
            ];
        
        const nextEntries = optionSortMode === 'az' ? sortOptionEntries(mergedOptionEntries) : mergedOptionEntries;
        const nextOptionImages = type === 'Image selection' ? nextEntries.map(({image}) => image) : draft.optionImages;

        onChange({
            ...draft,
            options: nextEntries.map(({item}) => item),
            optionImages: nextOptionImages,
        });
        
        closeImportDrawer();
    };

    const importOptions = () => {
        if (!canImportOptions) return;

        if (filledOptions.length > 0) {
            setOptionImportOpen(false);
            setOptionImportConfirmOpen(true);
            return;
        }

        applyImportedOptions('append');
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
            ? conditionDrafts.length ? conditionDrafts : firstFieldId
                ? [{fieldId: firstFieldId, operator: 'empty' as const, joinWith: 'if' as const}] : []
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
                                    onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
                                    variant="outlined"
                                    error={Boolean(rangeError)}
                                    sx={{width: 90}}
                                />
                                <Typography fontSize={14} color="text.secondary">to</Typography>
                                <CustomTextField
                                    className="custom_font"
                                    type="number"
                                    value={draft.maxValue}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraftValue('maxValue', Number(e.target.value))}
                                    onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
                                    variant="outlined"
                                    error={Boolean(rangeError)}
                                    sx={{width: 90}}
                                />
                            </Stack>
                            
                            {rangeError && (
                                <Typography fontSize={12} color="error.main" mt={0.75}>
                                    {rangeError}
                                </Typography>
                            )}
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
                            </Stack>
                            
                            <Stack spacing={1}>
                                {draft.options.map((item, index) => {
                                    const image = draft.optionImages[index] || '';
                                    const optionError = optionErrors[index] || '';
                                    const imageError = optionImageErrors[index] || '';

                                    return (
                                        <Stack
                                            key={index}
                                            direction="row"
                                            spacing={1}
                                            alignItems="center"
                                            sx={{mb: optionError || imageError ? 2.25 : 0}}
                                        >
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
                                                    borderColor: optionError ? '#FF5A5F' : 'divider',
                                                    borderRadius: 2,
                                                    p: 1,
                                                }}
                                            >
                                                <Box sx={{position: 'relative', flex: 1, minWidth: 0, alignSelf: 'center'}}>
                                                    <CustomTextField
                                                        className="custom_font"
                                                        value={item}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateOption(index, e.target.value)}
                                                        placeholder="Add option..."
                                                        variant="standard"
                                                        fullWidth
                                                        error={Boolean(optionError)}
                                                        InputProps={{disableUnderline: true}}
                                                    />
                                                    {optionError && (
                                                        <>
                                                            <Box
                                                                sx={{
                                                                    position: 'absolute',
                                                                    top: '50%',
                                                                    right: 8,
                                                                    width: 6,
                                                                    height: 6,
                                                                    borderRadius: '50%',
                                                                    bgcolor: '#FF5A5F',
                                                                    transform: 'translateY(-50%)',
                                                                    zIndex: 2,
                                                                }}
                                                            />
                                                            
                                                            <Box
                                                                sx={{
                                                                    position: 'absolute',
                                                                    top: 'calc(100% + 14px)',
                                                                    left: 8,
                                                                    bgcolor: '#FF5A5F',
                                                                    color: '#fff',
                                                                    borderRadius: 0.75,
                                                                    px: 1,
                                                                    py: 0.45,
                                                                    fontSize: 12,
                                                                    lineHeight: 1.2,
                                                                    whiteSpace: 'nowrap',
                                                                    zIndex: 3,
                                                                    boxShadow: '0 8px 18px rgba(255, 90, 95, 0.25)',
                                                                    '&:before': {
                                                                        content: '""',
                                                                        position: 'absolute',
                                                                        left: 16,
                                                                        top: -5,
                                                                        width: 0,
                                                                        height: 0,
                                                                        borderLeft: '5px solid transparent',
                                                                        borderRight: '5px solid transparent',
                                                                        borderBottom: '5px solid #FF5A5F',
                                                                    },
                                                                }}
                                                            >
                                                                {optionError}
                                                            </Box>
                                                        </>
                                                    )}
                                                </Box>
                                                
                                                <Box sx={{position: 'relative', width: {xs: '100%', sm: 126}, flexShrink: 0}}>
                                                    <Button
                                                        component="label"
                                                        variant="outlined"
                                                        sx={{
                                                            width: '100%',
                                                            minHeight: 64,
                                                            borderRadius: 1.5,
                                                            borderColor: imageError ? '#FF5A5F' : 'divider',
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
                                                    
                                                    {imageError && (
                                                        <>
                                                            <Box
                                                                sx={{
                                                                    position: 'absolute',
                                                                    top: '50%',
                                                                    right: 10,
                                                                    width: 6,
                                                                    height: 6,
                                                                    borderRadius: '50%',
                                                                    bgcolor: '#FF5A5F',
                                                                    transform: 'translateY(-50%)',
                                                                    zIndex: 2,
                                                                }}
                                                            />
                                                            
                                                            <Box
                                                                sx={{
                                                                    position: 'absolute',
                                                                    top: 'calc(100% + 6px)',
                                                                    left: '50%',
                                                                    transform: 'translateX(-50%)',
                                                                    bgcolor: '#FF5A5F',
                                                                    color: '#fff',
                                                                    borderRadius: 0.75,
                                                                    px: 1,
                                                                    py: 0.45,
                                                                    fontSize: 12,
                                                                    lineHeight: 1.2,
                                                                    whiteSpace: 'nowrap',
                                                                    zIndex: 3,
                                                                    boxShadow: '0 8px 18px rgba(255, 90, 95, 0.25)',
                                                                    '&:before': {
                                                                        content: '""',
                                                                        position: 'absolute',
                                                                        left: '50%',
                                                                        top: -5,
                                                                        transform: 'translateX(-50%)',
                                                                        width: 0,
                                                                        height: 0,
                                                                        borderLeft: '5px solid transparent',
                                                                        borderRight: '5px solid transparent',
                                                                        borderBottom: '5px solid #FF5A5F',
                                                                    },
                                                                }}
                                                            >
                                                                {imageError}
                                                            </Box>
                                                        </>
                                                    )}
                                                </Box>
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
                                
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Button
                                        size="small"
                                        endIcon={<IconChevronDown size={14}/>}
                                        onClick={(event) => setOptionSortAnchorEl(event.currentTarget)}
                                        sx={{
                                            minWidth: 0,
                                            p: 1,
                                            color: 'primary.main',
                                            fontSize: 13,
                                            fontWeight: 400,
                                            textTransform: 'none',
                                            '& .MuiButton-endIcon': {ml: 0.25},
                                        }}
                                    >
                                        Sort - {optionSortMode === 'az' ? 'A - Z' : 'Custom'}
                                    </Button>
                                    
                                    <Menu
                                        anchorEl={optionSortAnchorEl}
                                        open={Boolean(optionSortAnchorEl)}
                                        onClose={() => setOptionSortAnchorEl(null)}
                                        PaperProps={{
                                            sx: {
                                                mt: 0.75,
                                                minWidth: 100,
                                                borderRadius: 1,
                                                boxShadow: '0 12px 28px rgba(15, 23, 42, 0.14)',
                                            },
                                        }}
                                    >
                                        <MenuItem onClick={() => applyOptionSort('custom')}>
                                            Custom
                                        </MenuItem>
                                        <MenuItem onClick={() => applyOptionSort('az')}>
                                            A - Z
                                        </MenuItem>
                                    </Menu>
                                    
                                    <Button
                                        size="small"
                                        onClick={exportOptions}
                                        disabled={!canExportOptions}
                                        sx={{
                                            minWidth: 0,
                                            p: 1,
                                            color: canExportOptions ? 'primary.main' : 'text.disabled',
                                            fontSize: 13,
                                            fontWeight: 400,
                                            textTransform: 'none',
                                        }}
                                    >
                                        Export
                                    </Button>
                                    
                                    <Button
                                        size="small"
                                        onClick={() => setOptionImportOpen(true)}
                                        sx={{
                                            minWidth: 0,
                                            p: 1,
                                            color: 'primary.main',
                                            fontSize: 13,
                                            fontWeight: 400,
                                            textTransform: 'none',
                                        }}
                                    >
                                        Import
                                    </Button>
                                </Stack>
                            </Stack>
                            
                            <Stack spacing={1}>
                                {draft.options.map((item, index) => {
                                    const optionError = optionErrors[index] || '';

                                    return (
                                        <Stack
                                            key={index}
                                            direction="row"
                                            spacing={1}
                                            alignItems="center"
                                            sx={{mb: optionError ? 2.25 : 0}}
                                        >
                                            <Box sx={{color: 'text.disabled', display: 'flex'}}>
                                                <IconGripVertical size={18}/>
                                            </Box>
    
                                            <Box sx={{position: 'relative', flex: 1, minWidth: 0}}>
                                                <CustomTextField
                                                    className="custom_font"
                                                    value={item}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateOption(index, e.target.value)}
                                                    placeholder="Item"
                                                    variant="outlined"
                                                    fullWidth
                                                    error={Boolean(optionError)}
                                                />
                                                {optionError && (
                                                    <>
                                                        <Box
                                                            sx={{
                                                                position: 'absolute',
                                                                top: '50%',
                                                                right: 10,
                                                                width: 6,
                                                                height: 6,
                                                                borderRadius: '50%',
                                                                bgcolor: '#FF5A5F',
                                                                transform: 'translateY(-50%)',
                                                                zIndex: 2,
                                                            }}
                                                        />
                                                        
                                                        <Box
                                                            sx={{
                                                                position: 'absolute',
                                                                top: 'calc(100% + 6px)',
                                                                right: 16,
                                                                bgcolor: '#FF5A5F',
                                                                color: '#fff',
                                                                borderRadius: 0.75,
                                                                px: 1,
                                                                py: 0.45,
                                                                fontSize: 12,
                                                                lineHeight: 1.2,
                                                                whiteSpace: 'nowrap',
                                                                zIndex: 3,
                                                                boxShadow: '0 8px 18px rgba(255, 90, 95, 0.25)',
                                                                '&:before': {
                                                                    content: '""',
                                                                    position: 'absolute',
                                                                    right: 16,
                                                                    top: -5,
                                                                    width: 0,
                                                                    height: 0,
                                                                    borderLeft: '5px solid transparent',
                                                                    borderRight: '5px solid transparent',
                                                                    borderBottom: '5px solid #FF5A5F',
                                                                },
                                                            }}
                                                        >
                                                            {optionError}
                                                        </Box>
                                                    </>
                                                )}
                                            </Box>
                                            
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

                    {isFormula && (
                        <>
                            <Divider sx={{my: 1}}/>
                            <Box>
                                <Typography fontWeight={700} fontSize={14}>
                                    Formula builder
                                    <Box component="span" sx={{color: '#8A99A8', display: 'inline-flex', ml: 0.5, verticalAlign: 'middle'}}>
                                        <IconHelpCircle size={15}/>
                                    </Box>
                                </Typography>
                                
                                <Typography color="text.secondary" fontSize={13}>
                                    Start by adding or typing a field name.
                                </Typography>
                                <Typography color="text.secondary" fontSize={13}>
                                    Use operators, fields, and numbers as needed.
                                </Typography>
                            </Box>
                            <Box
                                sx={{
                                    overflow: 'visible',
                                }}
                            >
                                <Stack
                                    direction="row"
                                    justifyContent="flex-end"
                                    alignItems="center"
                                    sx={{
                                        minHeight: 38,
                                        px: 1.5,
                                        borderRadius: '10px 10px 0 0',
                                    }}
                                >
                                    <Button
                                        size="small"
                                        endIcon={<IconChevronDown size={15}/>}
                                        onClick={(event) => setFormulaFieldAnchorEl(event.currentTarget)}
                                        disabled={!formulaNumberFields.length}
                                        sx={{
                                            color: '#0B8CFF',
                                            textTransform: 'none',
                                        }}
                                    >
                                        Add field
                                    </Button>
                                    
                                    <Menu
                                        anchorEl={formulaFieldAnchorEl}
                                        open={Boolean(formulaFieldAnchorEl)}
                                        onClose={() => setFormulaFieldAnchorEl(null)}
                                        PaperProps={{
                                            sx: {
                                                mt: 0.5,
                                                minWidth: 92,
                                                borderRadius: 2,
                                                boxShadow: '0 16px 34px rgba(15, 23, 42, 0.14)',
                                                overflow: 'hidden',
                                            },
                                        }}
                                    >
                                        {formulaNumberFields.map((field) => (
                                            <MenuItem
                                                key={field.id}
                                                onClick={() => addFormulaField(field)}
                                                sx={{gap: 1, py: 1, fontSize: 14}}
                                            >
                                                <IconHash size={20}/>
                                                {fieldDisplayLabel(field)}
                                            </MenuItem>
                                        ))}
                                    </Menu>
                                </Stack>

                                <Box
                                    ref={formulaEditorRef}
                                    contentEditable
                                    suppressContentEditableWarning
                                    role="textbox"
                                    aria-multiline="true"
                                    data-placeholder={formulaNumberFields.length ? 
                                        'e.g. (Field name 1 + Field name 2)/ Field name 3' : 'Add a Number field first'
                                    }
                                    onInput={() => {
                                        emitFormulaEditorChange();
                                        saveFormulaSelection();
                                    }}
                                    onKeyUp={saveFormulaSelection}
                                    onMouseUp={saveFormulaSelection}
                                    onFocus={saveFormulaSelection}
                                    onBlur={saveFormulaSelection}
                                    onClick={() => {
                                        if (!serializeFormulaEditor(formulaEditorRef.current)) focusFormulaEditorAtEnd();
                                    }}
                                    sx={{
                                        minHeight: 106,
                                        bgcolor: '#fff',
                                        border: '1px solid',
                                        borderColor: formulaExpressionError ? '#ff3b47' : 'divider',
                                        borderRadius: '8px',
                                        px: 2,
                                        py: 1.25,
                                        fontSize: 14,
                                        lineHeight: '30px',
                                        outline: 'none',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        '&:focus': {
                                            borderColor: formulaExpressionError ? '#ff3b47' : '#0B8CFF',
                                        },
                                        '&:empty:before': {
                                            content: 'attr(data-placeholder)',
                                            color: '#8A99A8',
                                            pointerEvents: 'none',
                                        },
                                    }}
                                />
                                {formulaExpressionError && (
                                    <Typography
                                        fontSize={13}
                                        sx={{
                                            color: '#ff3b47',
                                            mt: 0.75,
                                        }}
                                    >
                                        {formulaExpressionError}
                                    </Typography>
                                )}
                            </Box>
                            
                            {!formulaNumberFields.length && (
                                <Typography color="text.disabled" fontSize={13}>
                                    Add a Number field before building a formula.
                                </Typography>
                            )}
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
                                                    {
                                                        conditionDrafts.map((condition, conditionIndex) => {
                                                        
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
                                                                                <Stack direction="row" spacing={1} alignItems="center">
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
                                                
                                                <Stack direction="row" alignItems="center" justifyContent="space-between" mt={1.5} spacing={1}>
                                                    {
                                                        canAddMoreConditions ? (
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
                                                        ) : <Box/>
                                                    }
                                                    
                                                    {
                                                        conditionDrafts.length > 0 && (
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
                                                        )
                                                    }
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
                <Button variant="contained" onClick={handleConfirm} sx={{borderRadius: 5}}>
                    Confirm
                </Button>
            </DialogActions>

            <Drawer
                anchor="right"
                open={optionImportOpen}
                onClose={closeImportDrawer}
                PaperProps={{
                    sx: {
                        width: {xs: '100%', sm: 520},
                        maxWidth: '100vw',
                    },
                }}
                sx={{
                    zIndex: (theme) => theme.zIndex.modal + 2,
                }}
            >
                <Box sx={{height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fff'}}>
                    <Stack
                        direction="row"
                        alignItems="center"
                        sx={{
                            minHeight: 80,
                            px: 3,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            position: 'relative',
                        }}
                    >
                        <IconButton
                            onClick={closeImportDrawer}
                            sx={{color: '#1F2937'}}
                        >
                            <IconArrowLeft size={24}/>
                        </IconButton>
                        
                        <Typography
                            fontSize={18}
                            fontWeight={500}
                            color="#123044"
                            sx={{position: 'absolute', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none'}}
                        >
                            Import Items
                        </Typography>
                    </Stack>

                    <Box sx={{flex: 1, overflowY: 'auto', px: 3.5, py: 3}}>
                        <Box
                            sx={{
                                bgcolor: '#F5F5F5',
                                borderRadius: 0.75,
                                px: 2,
                                pt: 2.25,
                                pb: 2,
                                mb: 3,
                            }}
                        >
                            <Typography textAlign="center" fontSize={14} color="#123044" lineHeight={1.35} mb={2}>
                                Copy from any spreadsheet or list, and paste below<br/>
                                to add a list with multiple items
                            </Typography>
                            
                            <Stack direction="row" alignItems="center" justifyContent="center" spacing={2}>
                                <Box
                                    sx={{
                                        width: 190,
                                        height: 106,
                                        borderRadius: 1,
                                        bgcolor: '#fff',
                                        boxShadow: '0 8px 18px rgba(15, 23, 42, 0.10)',
                                        display: 'grid',
                                        gridTemplateColumns: '64px 1fr 1fr',
                                        gap: 0.5,
                                        p: 1,
                                        position: 'relative',
                                    }}
                                >
                                    {[0, 1, 2].map((col) => (
                                        <Stack
                                            key={col}
                                            spacing={1}
                                            sx={{
                                                bgcolor: col === 0 ? '#D8EEF9' : 'transparent',
                                                borderRadius: 0.5,
                                                p: 0.5,
                                            }}
                                        >
                                            {[0, 1, 2, 3].map((row) => (
                                                <Box
                                                    key={row}
                                                    sx={{
                                                        height: 7,
                                                        borderRadius: 2,
                                                        bgcolor: col === 0 ? '#9FC6D8' : '#E1E1E1',
                                                    }}
                                                />
                                            ))}
                                        </Stack>
                                    ))}
                                    
                                    <Paper
                                        elevation={4}
                                        sx={{
                                            position: 'absolute',
                                            left: 40,
                                            top: 42,
                                            px: 1,
                                            py: 0.75,
                                            borderRadius: 0.75,
                                        }}
                                    >
                                        <Typography fontSize={10}>Copy</Typography>
                                        <Typography fontSize={10}>Paste</Typography>
                                    </Paper>
                                </Box>
                                
                                <Typography color="#6B7280" fontSize={30}>›</Typography>
                                <Box
                                    sx={{
                                        width: 190,
                                        height: 96,
                                        borderRadius: 1,
                                        bgcolor: '#fff',
                                        boxShadow: '0 8px 18px rgba(15, 23, 42, 0.10)',
                                        p: 1.5,
                                        position: 'relative',
                                    }}
                                >
                                    <Box sx={{height: '100%', border: '1px solid #E5E7EB', borderRadius: 1, p: 1}}>
                                        <Typography fontSize={9} color="#B8B8B8">Paste list here</Typography>
                                    </Box>
                                    
                                    <Paper
                                        elevation={4}
                                        sx={{
                                            position: 'absolute',
                                            right: 28,
                                            top: 38,
                                            px: 1,
                                            py: 0.75,
                                            borderRadius: 0.75,
                                        }}
                                    >
                                        <Typography fontSize={10}>Copy</Typography>
                                        <Typography fontSize={10}>Paste</Typography>
                                    </Paper>
                                </Box>
                            </Stack>
                        </Box>

                        <Typography textAlign="center" fontSize={14} color="#123044" mb={1.25}>
                            Paste copied items below
                        </Typography>
                        
                        <CustomTextField
                            value={optionImportText}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setOptionImportText(event.target.value)}
                            placeholder="Paste items here"
                            multiline
                            minRows={9}
                            fullWidth
                            sx={{
                                '& .MuiInputBase-root': {
                                    alignItems: 'flex-start',
                                    borderRadius: 1,
                                },
                            }}
                        />
                        
                        <Typography textAlign="center" fontSize={14} color="text.secondary" mt={1.25}>
                            {importedOptions.length} item{importedOptions.length === 1 ? '' : 's'} will be added to the list
                        </Typography>
                    </Box>

                    <Stack
                        direction="row"
                        spacing={3}
                        alignItems="center"
                        sx={{
                            px: 3,
                            py: 2,
                            borderTop: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <Button
                            variant="outlined"
                            onClick={importOptions}
                            disabled={!canImportOptions}
                            sx={{borderRadius: 5, textTransform: 'none'}}
                        >
                            Import items
                        </Button>
                        
                        <Button
                            onClick={closeImportDrawer}
                            sx={{color: '#123044', textTransform: 'none'}}
                        >
                            Cancel import
                        </Button>
                    </Stack>
                </Box>
            </Drawer>

            <Dialog
                open={optionImportConfirmOpen}
                onClose={() => setOptionImportConfirmOpen(false)}
                maxWidth={false}
                PaperProps={{
                    sx: {
                        width: {xs: 'calc(100% - 32px)', sm: 364},
                        borderRadius: 0,
                        boxShadow: '0 16px 34px rgba(15, 23, 42, 0.24)',
                        m: 0,
                    },
                }}
                sx={{
                    zIndex: (theme) => theme.zIndex.modal + 3,
                }}
            >
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="center"
                    sx={{
                        minHeight: 62,
                        px: 2,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        position: 'relative',
                    }}
                >
                    <Typography fontSize={18} color="text.secondary">
                        Import items
                    </Typography>
                    
                    <IconButton
                        size="small"
                        onClick={() => setOptionImportConfirmOpen(false)}
                        sx={{position: 'absolute', right: 10, top: 12, color: 'text.secondary'}}
                    >
                        <IconX size={20}/>
                    </IconButton>
                </Stack>

                <Box sx={{px: 3, pt: 2.5, pb: 2}}>
                    <Typography fontSize={15} fontWeight={800} color="#123044" lineHeight={1.45} mb={1.75}>
                        There are {filledOptions.length} item{filledOptions.length === 1 ? '' : 's'} in this list already.<br/>
                        What would you like to do with those items?
                    </Typography>
                    
                    <RadioGroup
                        value={optionImportMode}
                        onChange={(event) => setOptionImportMode(event.target.value as 'append' | 'replace')}
                        sx={{gap: 1}}
                    >
                        <FormControlLabel
                            value="append"
                            control={<Radio size="small"/>}
                            label={
                                <Typography fontSize={14} color="#123044" lineHeight={1.35}>
                                    Keep existing items and add the imported items
                                </Typography>
                            }
                            sx={{alignItems: 'flex-start', m: 0}}
                        />
                        
                        <FormControlLabel
                            value="replace"
                            control={<Radio size="small"/>}
                            label={
                                <Typography fontSize={14} color="#123044" lineHeight={1.35}>
                                    Remove existing items and replace them with the imported items
                                </Typography>
                            }
                            sx={{alignItems: 'flex-start', m: 0}}
                        />
                    </RadioGroup>
                </Box>

                <DialogActions sx={{px: 2, py: 1.25, borderTop: '1px solid', borderColor: 'divider'}}>
                    <Button
                        variant="contained"
                        onClick={() => applyImportedOptions(optionImportMode)}
                        sx={{borderRadius: 5, textTransform: 'none'}}
                    >
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </Dialog>
    );
};

export default FieldSettingsDialog;
