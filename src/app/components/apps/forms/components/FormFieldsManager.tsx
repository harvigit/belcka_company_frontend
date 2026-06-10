'use client';

import React, {useMemo, useState} from 'react';
import {
    Box,
    Button,
    Checkbox,
    Chip,
    Divider,
    IconButton,
    Menu,
    MenuItem,
    Paper,
    Stack,
    Tooltip,
    Typography
} from '@mui/material';
import {
    IconBoxMultiple,
    IconChevronDown,
    IconDots,
    IconGripVertical,
    IconPencil,
    IconPlus,
    IconSettings,
    IconTrash,
    IconX
} from '@tabler/icons-react';
import {DragDropContext, Draggable, Droppable, DropResult} from '@hello-pangea/dnd';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {emptyDraftForType, FieldDraft, FormField, FormFieldCondition, iconForType} from '../common';
import {fieldToDraft} from '../common/formBuilderUtils';
import {fieldConditions, fieldDisplayLabel, getFormulaExpressionError} from '../formUtils';
import AddFieldPopover from './AddFieldPopover';
import FieldSettingsDialog from './FieldSettingsDialog';

type FieldDetail = { field: FormField; parentGroupId: string | null; rootIndex: number };

type FormFieldsManagerProps = {
    fields: FormField[];
    setFields: React.Dispatch<React.SetStateAction<FormField[]>>;
    fieldsError: string;
    setFieldsError: React.Dispatch<React.SetStateAction<string>>;
    formNameInput: React.ReactNode;
};

const FormFieldsManager = ({fields, setFields, fieldsError, setFieldsError, formNameInput}: FormFieldsManagerProps) => {
    const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);
    const [bulkActionAnchorEl, setBulkActionAnchorEl] = useState<null | HTMLElement>(null);
    const [groupingFieldIds, setGroupingFieldIds] = useState<string[]>([]);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [fieldTargetGroupId, setFieldTargetGroupId] = useState<string | null>(null);
    const [groupMenuAnchorEl, setGroupMenuAnchorEl] = useState<null | HTMLElement>(null);
    const [activeGroupMenuId, setActiveGroupMenuId] = useState<string | null>(null);
    const [activeFieldType, setActiveFieldType] = useState<string | null>(null);
    const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
    const [fieldDraft, setFieldDraft] = useState<FieldDraft>(emptyDraftForType(''));
    const [fieldQuestionError, setFieldQuestionError] = useState('');
    const [fieldFormulaError, setFieldFormulaError] = useState('');

    const mapFieldTree = (source: FormField[], matcher: (field: FormField) => boolean, updater: (field: FormField) => FormField): FormField[] => source.map((field) => {
        if (matcher(field)) return updater(field);
        return field.fields?.length ? {...field, fields: mapFieldTree(field.fields, matcher, updater)} : field;
    });

    const removeFieldFromTree = (source: FormField[], id: string): FormField[] => source
        .filter((field) => field.id !== id)
        .map((field) => field.fields?.length ? {...field, fields: removeFieldFromTree(field.fields, id)} : field);

    const findFieldInTree = (source: FormField[], id: string): FormField | null => {
        for (const field of source) {
            if (field.id === id) return field;
            const child = field.fields?.length ? findFieldInTree(field.fields, id) : null;
            if (child) return child;
        }
        return null;
    };

    const getFieldDetails = (source: FormField[], parentGroupId: string | null = null): FieldDetail[] => source.flatMap((field, index) => [
        {field, parentGroupId, rootIndex: parentGroupId ? -1 : index},
        ...(field.fields?.length ? getFieldDetails(field.fields, field.id) : []),
    ]);

    const fieldDetails = useMemo(() => getFieldDetails(fields), [fields]);
    const selectedFieldDetails = useMemo(() => fieldDetails.filter(({field}) => selectedFieldIds.includes(field.id)), [fieldDetails, selectedFieldIds]);
    const selectedFields = selectedFieldDetails.map(({field}) => field);
    const selectedHasGroupedField = selectedFieldDetails.some(({field, parentGroupId}) => Boolean(parentGroupId) || field.type === 'Group');
    const selectedRootFieldIds = selectedFieldDetails.filter(({parentGroupId, field}) => !parentGroupId && field.type !== 'Group').map(({field}) => field.id);
    const canGroupSelected = selectedFieldIds.length > 0 && selectedRootFieldIds.length === selectedFieldIds.length && !selectedHasGroupedField;
    const allSelectableFieldIds = fieldDetails.map(({field}) => field.id);

    const insertFieldAfterInTree = (source: FormField[], sourceId: string, nextField: FormField): FormField[] => {
        const sourceIndex = source.findIndex((field) => field.id === sourceId);
        if (sourceIndex >= 0) {
            const next = [...source];
            next.splice(sourceIndex + 1, 0, nextField);
            return next;
        }
        return source.map((field) => field.fields?.length ? {
            ...field,
            fields: insertFieldAfterInTree(field.fields, sourceId, nextField)
        } : field);
    };

    const groupRootFields = (source: FormField[], ids: string[], groupField: FormField) => {
        const selectedItems = source.filter((field) => ids.includes(field.id));
        const firstSelectedIndex = source.findIndex((field) => ids.includes(field.id));
        if (!selectedItems.length || firstSelectedIndex < 0) return source;
        const withoutSelected = source.filter((field) => !ids.includes(field.id));
        const insertIndex = withoutSelected.filter((_, index) => index < firstSelectedIndex).length;
        const next = [...withoutSelected];
        next.splice(insertIndex, 0, {...groupField, fields: selectedItems});
        return next;
    };

    const clearSelection = () => {
        setSelectedFieldIds([]);
        setBulkActionAnchorEl(null);
    };

    const closeFieldDialog = () => {
        setActiveFieldType(null);
        setEditingFieldId(null);
        setFieldTargetGroupId(null);
        setGroupingFieldIds([]);
        setFieldDraft(emptyDraftForType(''));
        setFieldQuestionError('');
        setFieldFormulaError('');
    };

    const selectFieldType = (type: string) => {
        setActiveFieldType(type);
        setEditingFieldId(null);
        setGroupingFieldIds([]);
        setFieldDraft(emptyDraftForType(type));
        setFieldQuestionError('');
        setFieldFormulaError('');
        setAnchorEl(null);
    };

    const editField = (field: FormField) => {
        setActiveFieldType(field.type);
        setEditingFieldId(field.id);
        setFieldTargetGroupId(null);
        setGroupingFieldIds([]);
        setFieldDraft(fieldToDraft(field));
        setFieldQuestionError('');
        setFieldFormulaError('');
    };

    const duplicateField = (field: FormField) => {
        const duplicateWithNewIds = (item: FormField): FormField => ({
            ...item,
            id: `${item.type.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            label: item.type === 'Description' ? item.label : `${fieldDisplayLabel(item)} (Copy)`,
            fields: item.fields?.map(duplicateWithNewIds),
        });
        setFields((cur) => insertFieldAfterInTree(cur, field.id, duplicateWithNewIds(field)));
    };

    const confirmField = () => {
        if (!activeFieldType) return;
        if (activeFieldType !== 'Description' && !fieldDraft.label.trim()) {
            setFieldQuestionError('Please enter\'s the question.');
            return;
        }
        if (activeFieldType === 'Formula') {
            const formulaNumberFields = fields.filter((field) => field.id !== editingFieldId && field.type === 'Number');
            if (!fieldDraft.formulaExpression.trim()) {
                setFieldFormulaError('Your field needs a formula');
                return;
            }
            const formulaError = getFormulaExpressionError(fieldDraft.formulaExpression, formulaNumberFields);
            if (formulaError) {
                setFieldFormulaError(formulaError);
                return;
            }
        }

        const label = fieldDraft.label.trim();
        const description = fieldDraft.description.trim();
        const options = fieldDraft.options.map((item) => item.trim()).filter(Boolean);
        const optionImages = fieldDraft.optionImages.slice(0, fieldDraft.options.length);
        const nextField: FormField = {
            id: `${activeFieldType.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
            label,
            type: activeFieldType,
            ...(description ? {description} : {}),
            required: fieldDraft.required,
            
            ...(options.length ? {options} : {}),
            
            ...(activeFieldType === 'Image selection' && optionImages.some(Boolean) ? {optionImages} : {}),
            
            ...(activeFieldType === 'Numbers slider' ? {
                minValue: fieldDraft.minValue,
                maxValue: fieldDraft.maxValue
            } : {}),
            
            ...(activeFieldType === 'Rating' ? {
                ratingStarCount: Math.min(5, Math.max(3, Number(fieldDraft.ratingStarCount) || 5)),
                ratingMinLabel: fieldDraft.ratingMinLabel.trim(),
                ratingMaxLabel: fieldDraft.ratingMaxLabel.trim()
            } : {}),
            
            ...(activeFieldType === 'Image upload' ? {
                imageSource: fieldDraft.imageSource,
                allowMultipleUploads: fieldDraft.allowMultipleUploads
            } : {}),
            
            ...(activeFieldType === 'Video upload' ? {
                videoSource: fieldDraft.videoSource,
                allowMultipleUploads: fieldDraft.allowMultipleUploads
            } : {}),
            
            ...(activeFieldType === 'File upload' ? {allowMultipleUploads: fieldDraft.allowMultipleUploads} : {}),
            ...(activeFieldType === 'Scanner' ? {
                scannerSource: fieldDraft.scannerSource,
                allowMultipleUploads: fieldDraft.allowMultipleUploads
            } : {}),
            
            ...(activeFieldType === 'Date' ? {
                dateIncludeDate: fieldDraft.dateIncludeDate || !fieldDraft.dateIncludeTime,
                dateIncludeTime: fieldDraft.dateIncludeTime
            } : {}),
            
            ...(activeFieldType === 'Location' ? {locationSelectBy: fieldDraft.locationSelectBy} : {}),
            ...(activeFieldType === 'Formula' ? {formulaExpression: fieldDraft.formulaExpression.trim()} : {}),
            ...(activeFieldType === 'Group' ? {fields: editingFieldId ? findFieldInTree(fields, editingFieldId)?.fields || [] : []} : {}),
            
            locationStampCapture: fieldDraft.locationStampCapture,
            multipleSelection: fieldDraft.multipleSelection,
            showOnlyIf: fieldDraft.showOnlyIf && fieldDraft.conditions.length > 0,
            
            ...(fieldDraft.showOnlyIf && fieldDraft.conditions.length ? {
                conditions: fieldDraft.conditions,
                conditionFieldId: fieldDraft.conditions[0].fieldId,
                conditionOperator: fieldDraft.conditions[0].operator,
                conditionValue: fieldDraft.conditionValue
            } : {}),
        };

        setFields((cur) => {
            if (activeFieldType === 'Group' && groupingFieldIds.length > 0) {
                return groupRootFields(cur, groupingFieldIds, nextField);
            }
            
            if (editingFieldId){
                return mapFieldTree(cur, (field) => field.id === editingFieldId, (field) => ({
                    ...nextField,
                    id: field.id,
                    fields: activeFieldType === 'Group' ? field.fields || [] : nextField.fields
                }));
            }
            
            if (fieldTargetGroupId){
                return mapFieldTree(cur, (field) => field.id === fieldTargetGroupId, (field) => ({
                    ...field,
                    fields: [...(field.fields || []), nextField]
                }));  
            } 
            
            return [...cur, nextField];
        });
        
        setFieldsError('');
        clearSelection();
        setFieldTargetGroupId(null);
        setGroupingFieldIds([]);
        closeFieldDialog();
    };

    const removeField = (id: string) => {
        const removedField = findFieldInTree(fields, id);
        const removedIds = removedField ? getFieldDetails([removedField]).map(({field}) => field.id) : [id];
        setFields((cur) => removeFieldFromTree(cur, id));
        setSelectedFieldIds((current) => current.filter((fieldId) => !removedIds.includes(fieldId)));
    };

    const openGroupTogetherDialog = () => {
        if (!canGroupSelected) return;
        setGroupingFieldIds(selectedRootFieldIds);
        setActiveFieldType('Group');
        setEditingFieldId(null);
        setFieldTargetGroupId(null);
        setFieldDraft(emptyDraftForType('Group'));
        setFieldQuestionError('');
        setFieldFormulaError('');
        setBulkActionAnchorEl(null);
    };

    const groupIdFromDroppable = (droppableId: string) => droppableId.startsWith('group:') ? droppableId.slice('group:'.length) : null;

    const removeFromContainer = (source: FormField[], containerId: string | null, index: number): {
        nextFields: FormField[];
        removed?: FormField
    } => {
        if (!containerId) {
            const nextFields = [...source];
            const [removed] = nextFields.splice(index, 1);
            return {nextFields, removed};
        }
        let removed: FormField | undefined;
        const nextFields = source.map((field) => {
            if (field.id === containerId) {
                const nextChildren = [...(field.fields || [])];
                [removed] = nextChildren.splice(index, 1);
                return {...field, fields: nextChildren};
            }
            if (field.fields?.length) {
                const result = removeFromContainer(field.fields, containerId, index);
                if (result.removed) {
                    removed = result.removed;
                    return {...field, fields: result.nextFields};
                }
            }
            return field;
        });
        return {nextFields, removed};
    };

    const insertIntoContainer = (source: FormField[], containerId: string | null, index: number, fieldToInsert: FormField): FormField[] => {
        if (!containerId) {
            const nextFields = [...source];
            nextFields.splice(index, 0, fieldToInsert);
            return nextFields;
        }
        
        return source.map((field) => {
            if (field.id === containerId) {
                const nextChildren = [...(field.fields || [])];
                nextChildren.splice(index, 0, fieldToInsert);
                return {...field, fields: nextChildren};
            }
            
            return field.fields?.length ? {
                ...field,
                fields: insertIntoContainer(field.fields, containerId, index, fieldToInsert)
            } : field;
        });
    };

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        const sourceGroupId = groupIdFromDroppable(result.source.droppableId);
        const destinationGroupId = groupIdFromDroppable(result.destination.droppableId);
        setFields((currentFields) => {
            const {nextFields, removed} = removeFromContainer(currentFields, sourceGroupId, result.source.index);
            if (!removed) return currentFields;
            if (removed.type === 'Group' && destinationGroupId && findFieldInTree([removed], destinationGroupId)) return currentFields;
            return insertIntoContainer(nextFields, destinationGroupId, result.destination!.index, removed);
        });
    };

    const renderConditionBadges = (field: FormField) => {
        const conditions = fieldConditions(field) || [];
        if (!field.showOnlyIf || conditions.length === 0) return null;
        return (
            <Stack spacing={0.75} mt={1} pl={{xs: 0, sm: field.type === 'Group' ? 3 : 8}}>
                {conditions.map((condition: FormFieldCondition, conditionIndex: number) => {
                    const sourceField = findFieldInTree(fields, condition.fieldId);
                    const joinLabel = conditionIndex === 0 ? 'Show only if' : condition.joinWith === 'or' ? 'Or if' : 'And if';
                    return (
                        <Box key={`${field.id}-${condition.fieldId}-${conditionIndex}`} sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            flexWrap: 'wrap',
                            bgcolor: '#EAFBF6',
                            border: '1px solid #D7F1EA',
                            borderRadius: 1.5,
                            px: 1.25,
                            py: 0.75
                        }}>
                            <Typography sx={{fontSize: 12, fontWeight: 700, color: '#123044'}}>{joinLabel}</Typography>
                            <Typography
                                sx={{
                                    fontSize: 12,
                                    color: '#123044'
                                }}
                            >
                                {sourceField ? fieldDisplayLabel(sourceField) : 'Deleted field'}
                            </Typography>
                            
                            <Typography sx={{fontSize: 12, color: '#6B7280'}}>response is</Typography>
                            
                            <Chip 
                                size="small"
                                label={condition.operator === 'not_empty' ? 'Not Empty' : 'Empty'}
                                sx={{
                                    height: 22,
                                    bgcolor: '#fff',
                                    border: '1px solid #D7DCE1',
                                    fontSize: 11
                                }}
                            />
                        </Box>
                    );
                })}
            </Stack>
        );
    };

    const renderFieldRow = (field: FormField, index: number, dragHandleProps?: any, nested = false) => (
        <Paper elevation={0} sx={{
            px: {xs: 1.25, sm: 1.5},
            py: 1.25,
            minHeight: nested ? 52 : 62,
            border: nested ? '0' : '1px solid',
            borderColor: 'divider',
            borderRadius: nested ? 2 : '999px',
            bgcolor: nested ? '#F6F7F8' : 'background.paper',
            boxShadow: nested ? 'none' : '0 1px 3px rgba(15, 23, 42, 0.03)',
            '&:hover': {bgcolor: nested ? '#F1F3F5' : '#FAFBFC'}
        }}>
            <Stack direction="row" alignItems="center" spacing={{xs: 1, sm: 1.25}}>
                { !nested && 
                    <Box 
                        sx={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            bgcolor: 'primary.light',
                            color: 'primary.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 700,
                            flexShrink: 0
                        }}
                    >
                        {index + 1}
                    </Box>
                }
                <Box
                    {...(dragHandleProps || {})} 
                    sx={{
                        display: 'flex',
                        color: 'text.disabled',
                        cursor: dragHandleProps ? 'grab' : 'default',
                        flexShrink: 0,
                        touchAction: 'none'
                    }}
                >
                    <IconGripVertical size={18}/>
                </Box>
                
                <Checkbox 
                    size="small" 
                    checked={selectedFieldIds.includes(field.id)}
                    onChange={(event) =>
                        setSelectedFieldIds((current) => 
                            event.target.checked ? [...new Set([...current, field.id])] : current.filter((id) => id !== field.id)
                        )
                    }
                    onClick={(event) => event.stopPropagation()}
                    sx={{ p: 0.25 }}
                />
                
                <Box 
                    sx={{
                        color: 'text.secondary', 
                        display: 'flex', 
                        flexShrink: 0
                     }}
                >
                    {iconForType(field.type)}
                </Box>
                <Typography 
                    fontSize={14} 
                    color="text.primary"
                    noWrap
                    sx={{flex: 1, minWidth: 0}}
                >
                    {fieldDisplayLabel(field)}
                </Typography>
                
                <Box 
                    sx={{
                        display: {xs: 'none', sm: nested ? 'none' : 'flex'}
                    }}
                >
                    <Chip label={field.type} size="small"
                          sx={{
                              height: 24,
                              fontSize: 11,
                              bgcolor: '#E5E7EB',
                              color: '#111827',
                              borderRadius: '999px'
                        }}
                    />
                </Box>
                
                <Tooltip title="Edit field">
                    <IconButton 
                        onClick={() => editField(field)} 
                        size="small"
                        sx={{
                            color: 'text.secondary',
                            flexShrink: 0
                        }}
                    >
                        <IconPencil size={16}/>
                    </IconButton>
                </Tooltip>
                
                <Tooltip title="Duplicate field">
                    <IconButton 
                        onClick={() => duplicateField(field)}
                        size="small" 
                        sx={{
                            color: 'text.secondary',
                            flexShrink: 0
                        }}
                    >
                        <ContentCopyIcon sx={{fontSize: 16}}/>
                    </IconButton>
                </Tooltip>
                
                <Tooltip title="Delete field">
                    <IconButton 
                        onClick={() => removeField(field.id)} 
                        size="small"
                        sx={{color: 'text.secondary', flexShrink: 0}}>
                        <IconTrash size={16}/>
                    </IconButton>
                </Tooltip>
            </Stack>
            {renderConditionBadges(field)}
        </Paper>
    );

    const renderGroupField = (field: FormField, index: number, dragHandleProps?: any) => {
        const children = field.fields || [];
        return (
            <Paper elevation={0} sx={{
                px: {xs: 1.25, sm: 1.5},
                py: 1.25,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)'
            }}>
                <Stack direction="row" alignItems="center" spacing={1.25}>
                    <Box 
                        sx={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            bgcolor: 'primary.light',
                            color: 'primary.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 700,
                            flexShrink: 0
                        }}
                    >
                        {index + 1}
                    </Box>
                    
                    <Box 
                        {...(dragHandleProps || {})}
                        sx={{
                            display: 'flex',
                            color: 'text.disabled',
                            cursor: 'grab',
                            flexShrink: 0,
                            touchAction: 'none'
                        }}
                    >
                        <IconGripVertical size={18}/>
                    </Box>
                    
                    <Checkbox
                        size="small"
                        checked={selectedFieldIds.includes(field.id)}
                        onChange={(event) => 
                            setSelectedFieldIds((current) => event.target.checked ? [...new Set([...current, field.id])] : current.filter((id) => id !== field.id))
                        }
                        onClick={(event) => event.stopPropagation()} sx={{p: 0.25}}
                    />
                    
                    <Box sx={{display: 'flex', color: 'text.secondary'}}>
                        <IconBoxMultiple size={17}/>
                    </Box>
                    
                    <Typography 
                        fontSize={14} 
                        fontWeight={800} 
                        color="#123044"
                        noWrap
                        sx={{flex: 1, minWidth: 0}}
                    >
                        {fieldDisplayLabel(field)}
                    </Typography>
                    
                    <Tooltip title="Group actions">
                        <IconButton
                            size="small" 
                            onClick={(event) => {
                                setActiveGroupMenuId(field.id);
                                setGroupMenuAnchorEl(event.currentTarget);
                            }} 
                            sx={{color: 'text.secondary'}}
                        >
                            <IconDots size={17}/>
                        </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Add field to group">
                        <IconButton 
                            size="small" 
                            onClick={(event) => {
                                setFieldTargetGroupId(field.id);
                                setAnchorEl(event.currentTarget);
                            }} 
                            sx={{
                                width: 26,
                                height: 26,
                                border: '1px solid',
                                borderColor: 'divider',
                                color: 'primary.main'
                            }}
                        >
                            <IconPlus size={15}/>
                        </IconButton>
                    </Tooltip>
                </Stack>
                
                {field.description && 
                    <Typography fontSize={13} color="text.secondary" mt={1} ml={{xs: 0, sm: 8}}>
                        {field.description}
                    </Typography>
                }
                
                {renderConditionBadges(field)}
                
                <Droppable droppableId={`group:${field.id}`} type="FIELD">
                    {(provided, snapshot) => (
                        <Stack
                            spacing={1} 
                            mt={1.25} 
                            ml={{xs: 0, sm: 3}}
                            ref={provided.innerRef} {...provided.droppableProps} 
                            sx={{
                                minHeight: children.length ? 12 : 44,
                                borderRadius: 1.5,
                                bgcolor: snapshot.isDraggingOver ? '#EAF4FF' : 'transparent',
                                outline: snapshot.isDraggingOver ? '1px dashed #0B8CFF' : 'none',
                                outlineOffset: 4,
                                transition: 'background-color 120ms ease, outline-color 120ms ease'
                            }}
                        >
                            {children.length > 0 ? 
                                children.map((child, childIndex) => (
                                    <Draggable 
                                        draggableId={child.id}
                                        index={childIndex}
                                        key={child.id}>{(childDrag) => 
                                            <Box
                                                ref={childDrag.innerRef} 
                                                {...childDrag.draggableProps}
                                            >
                                                {child.type === 'Group' ? 
                                                    renderGroupField(child, childIndex, childDrag.dragHandleProps) :
                                                    renderFieldRow(child, childIndex, childDrag.dragHandleProps, true)
                                                }
                                            </Box>}
                                    </Draggable>
                                )) :
                                <Typography 
                                    fontSize={13}
                                    color="#8A99A8"
                                    sx={{px: 0.5, py: 1}}
                                >
                                    Drag fields to the group or add new ones
                                </Typography>
                            }
                            
                            {provided.placeholder}
                        </Stack>
                    )}
                </Droppable>
            </Paper>
        );
    };

    return (
        <>
            <Stack 
                direction={{xs: 'column', sm: 'row'}} 
                spacing={1.5} 
                alignItems={{sm: 'center'}}
                justifyContent="space-between" 
                px={{xs: 2, sm: 3}} 
                py={{xs: 1.5, sm: 2}} 
                flexShrink={0}
                sx={{bgcolor: '#fff'}}
            >
                {formNameInput}
                <Stack 
                    direction="row" 
                    spacing={1}
                    flexShrink={0}
                    sx={{position: 'relative'}}
                >
                    <Button 
                        variant="contained"
                        endIcon={ <IconChevronDown size={17} /> }
                        onClick={(event) => {
                            setFieldsError('');
                            setFieldTargetGroupId(null);
                            setAnchorEl(event.currentTarget);
                        }}
                        sx={{
                            whiteSpace: 'nowrap',
                            minHeight: 40,
                            borderRadius: 1.5,
                            bgcolor: '#0B55B7',
                            '&:hover': {bgcolor: '#064AA3'}
                        }}
                    >
                        Add field
                    </Button>
                    
                    {fieldsError &&
                        <Box 
                            sx={{
                                position: 'absolute',
                                top: 'calc(100% + 8px)',
                                right: 0,
                                bgcolor: '#FF5A5F',
                                color: '#fff',
                                borderRadius: 1,
                                px: 1.25,
                                py: 0.75,
                                fontSize: 13,
                                lineHeight: 1.2,
                                whiteSpace: 'nowrap',
                                zIndex: 2,
                                boxShadow: '0 8px 18px rgba(255, 90, 95, 0.25)',
                                '&:before': {
                                    content: '""',
                                    position: 'absolute',
                                    top: -6,
                                    right: 22,
                                    width: 0,
                                    height: 0,
                                    borderLeft: '6px solid transparent',
                                    borderRight: '6px solid transparent',
                                    borderBottom: '6px solid #FF5A5F'
                                }
                            }}
                        >
                            {fieldsError}
                        </Box>
                    }
                </Stack>
            </Stack>

            <AddFieldPopover
                anchorEl={anchorEl} 
                onClose={() => {
                    setAnchorEl(null);
                    setFieldTargetGroupId(null);
                }}
                onAdd={selectFieldType}
            />
            
            <Menu
                anchorEl={groupMenuAnchorEl} 
                open={Boolean(groupMenuAnchorEl)} 
                onClose={() => {
                    setActiveGroupMenuId(null);
                    setGroupMenuAnchorEl(null);
                }} 
                PaperProps={{
                    elevation: 6,
                    sx: {mt: 1, borderRadius: 2, minWidth: 170, boxShadow: '0 16px 40px rgba(15, 23, 42, 0.16)'}
                }}
            >
                <MenuItem
                    onClick={() => {
                        const group = activeGroupMenuId ? findFieldInTree(fields, activeGroupMenuId) : null;
                        if (group) {
                            editField(group);
                        }
                        setActiveGroupMenuId(null);
                        setGroupMenuAnchorEl(null);
                    }}
                >
                    Edit group
                </MenuItem>
                
                <MenuItem 
                    onClick={() => {
                        const group = activeGroupMenuId ? findFieldInTree(fields, activeGroupMenuId) : null;
                        if (group) duplicateField(group);
                        setActiveGroupMenuId(null);
                        setGroupMenuAnchorEl(null);
                    }}
                >
                    Duplicate
                </MenuItem>
                
                <MenuItem 
                    onClick={() => {
                        if (activeGroupMenuId) setFields((cur) => {
                            const ungroup = (source: FormField[]): FormField[] => source.flatMap((field) => field.id === activeGroupMenuId ? field.fields || [] : field.fields?.length ? [{
                                ...field,
                                fields: ungroup(field.fields)
                            }] : [field]);
                            return ungroup(cur);
                        });
                        setActiveGroupMenuId(null);
                        setGroupMenuAnchorEl(null);
                    }}
                >
                    Ungroup
                </MenuItem>
                
                <MenuItem
                    onClick={() => {
                        if (activeGroupMenuId) removeField(activeGroupMenuId);
                        setActiveGroupMenuId(null);
                        setGroupMenuAnchorEl(null);
                    }} 
                    sx= {{color: 'error.main'}}
                >
                    Delete group
                </MenuItem>
            </Menu>
            
            <FieldSettingsDialog
                open={Boolean(activeFieldType)}
                type={activeFieldType}
                draft={fieldDraft}
                availableFields={fields.filter((field) => field.id !== editingFieldId)}
                questionError={fieldQuestionError}
                formulaError={fieldFormulaError}
                onChange={(nextDraft) => {
                    const formulaChanged = nextDraft.formulaExpression !== fieldDraft.formulaExpression;
                    setFieldDraft(nextDraft);
                    if (nextDraft.label.trim()) setFieldQuestionError('');
                    if (formulaChanged) setFieldFormulaError('');
                }}
                onClose={closeFieldDialog}
                onConfirm={confirmField}
            />
            <Divider/>

            <Box sx={{flex: 1, overflow: 'auto', px: {xs: 2, sm: 3}, py: 2, bgcolor: '#fff'}}>
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="root" type="FIELD">
                        {(provided, snapshot) => (
                            <Stack
                                spacing={1.5}
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                sx={{
                                    minHeight: fields.length ? 'auto' : 180,
                                    borderRadius: 2,
                                    bgcolor: snapshot.isDraggingOver ? '#F4FAFF' : 'transparent'
                                }}
                            >
                                {fields.map((field, index) =>
                                    <Draggable 
                                        draggableId={field.id}
                                        index={index}
                                        key={field.id}
                                    >
                                        {(drag) => 
                                            <Box
                                                ref={drag.innerRef}
                                                {...drag.draggableProps}
                                            >
                                                {field.type === 'Group' ? renderGroupField(field, index, drag.dragHandleProps) : renderFieldRow(field, index, drag.dragHandleProps)}
                                            </Box>
                                        }
                                    </Draggable>
                                )}
                                
                                {provided.placeholder}
                                
                                {fields.length === 0 && 
                                    <Paper 
                                        elevation={0}
                                        sx={{
                                            py: {xs: 5, sm: 8},
                                            border: '1px dashed',
                                            borderColor: 'divider',
                                            textAlign: 'center',
                                            borderRadius: 2
                                        }}
                                    >
                                        <Typography 
                                            color="text.secondary"
                                            fontSize={14}
                                        >
                                            Use <strong>Add field</strong> to start building this form.
                                        </Typography>
                                    </Paper>}
                            </Stack>
                        )}
                    </Droppable>
                </DragDropContext>
            </Box>

            {selectedFieldIds.length > 0 && <Paper elevation={8} sx={{
                position: 'fixed',
                left: '50%',
                bottom: {xs: 92, sm: 88},
                transform: 'translateX(-50%)',
                zIndex: 1400,
                minWidth: {xs: 'calc(100% - 32px)', sm: 560},
                maxWidth: 'calc(100vw - 32px)',
                px: 2,
                py: 1.25,
                borderRadius: 3,
                bgcolor: '#fff',
                boxShadow: '0 16px 42px rgba(15, 23, 42, 0.14)'
            }}>
                <Stack direction="row" alignItems="center" spacing={1.25}>
                    <Typography
                        fontSize={14}
                        fontWeight={800}
                        color="#123044"
                        sx={{flex: 1}}
                    >
                        {selectedFieldIds.length} field{selectedFieldIds.length === 1 ? '' : 's'} selected
                    </Typography>
                    
                    <Button 
                        variant="contained" 
                        endIcon={<IconChevronDown size={16}/>}
                        onClick={(event) => setBulkActionAnchorEl(event.currentTarget)} 
                        sx={{
                            borderRadius: '999px',
                            minHeight: 38,
                            px: 2,
                            textTransform: 'none',
                            bgcolor: '#1294F6',
                            '&:hover': {bgcolor: '#0B83DD'}
                        }}
                    >
                        Actions
                    </Button>
                    
                    <Button
                        variant="outlined" 
                        onClick={() => setSelectedFieldIds(allSelectableFieldIds)}
                        sx={{borderRadius: '999px', minHeight: 38, textTransform: 'none'}}
                    >
                        Select all
                    </Button>
                    
                    <IconButton 
                        onClick={clearSelection}
                        sx={{
                            width: 38,
                            height: 38,
                            border: '1px solid',
                            borderColor: 'divider'
                        }}
                    >
                        <IconX size={18} />
                    </IconButton>
                </Stack>
                
                <Menu
                    anchorEl={bulkActionAnchorEl} 
                    open={Boolean(bulkActionAnchorEl)}
                    onClose={() => setBulkActionAnchorEl(null)}
                    anchorOrigin={{vertical: 'top', horizontal: 'center'}}
                    transformOrigin={{
                        vertical: 'bottom', horizontal: 'center'
                    }} 
                    PaperProps={{
                        elevation: 8,
                        sx: {
                            mb: 1, borderRadius: 2, minWidth: 170, boxShadow: '0 16px 42px rgba(15, 23, 42, 0.16)'
                        }
                    }}
                >
                    <MenuItem 
                        onClick={() => {
                            selectedFields.forEach(duplicateField);
                            clearSelection();
                        }}
                    >
                        <Stack
                            direction="row"
                            spacing={1.25}
                            alignItems="center"
                        >
                            <ContentCopyIcon sx={{fontSize: 17}} />
                            <span>Duplicate</span> 
                        </Stack>
                    </MenuItem>
                    
                    <Tooltip 
                        title={selectedHasGroupedField ? 'Selected fields are already grouped' : ''} 
                        placement="top" 
                        arrow
                    >
                        <span>
                            <MenuItem 
                                disabled={!canGroupSelected}
                                onClick={openGroupTogetherDialog}
                            >
                                <Stack 
                                    direction="row"
                                    spacing={1.25}
                                    alignItems="center"
                                >
                                    <IconBoxMultiple size={17} />
                                    <span>Group together</span>
                                </Stack>
                            </MenuItem>
                        </span>
                    </Tooltip>
                    
                    <MenuItem
                        onClick={() => {setFields((current) => 
                                mapFieldTree(current, (field) => selectedFieldIds.includes(field.id) && field.type !== 'Group', (field) => ({
                                    ...field,
                                    required: true
                                }))
                            );
                            clearSelection();
                        }}
                    >
                        <Stack direction="row" spacing={1.25} alignItems="center">
                            <span style={{fontWeight: 800}}>*</span>
                            <span>Set as required</span>
                        </Stack>
                    </MenuItem>
                    
                    <MenuItem 
                        onClick={() => {
                            setFields((current) =>
                                selectedFieldIds.reduce((next, fieldId) => removeFieldFromTree(next, fieldId), current)
                            );
                            clearSelection();
                        }}
                    >
                        <Stack direction="row" spacing={1.25} alignItems="center">
                            <IconTrash size={17} />
                            <span>Delete</span>
                        </Stack>
                    </MenuItem>
                </Menu>
            </Paper>}
        </>
    );
};

export default FormFieldsManager;
