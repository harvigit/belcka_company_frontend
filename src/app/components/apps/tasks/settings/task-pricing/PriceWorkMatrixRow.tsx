'use client';

import React from 'react';
import {
    Autocomplete,
    Box,
    FormControl,
    IconButton,
    MenuItem,
    Select,
    TableCell,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {IconGripVertical, IconPlus, IconTrash} from '@tabler/icons-react';
import IOSSwitch from '@/app/components/common/IOSSwitch';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';
import PriceInput from './PriceInput';
import type {NamedOption, PricingRow, SubCategoryOption, UserOption} from './types';

const filterOptionsByWordStart = <T,>(
    options: T[],
    inputValue: string,
    getLabel: (option: T) => string,
) => {
    const searchWords = inputValue.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!searchWords.length) return options;

    return options.filter((option) =>
        searchWords.every((searchWord) =>
            getLabel(option)
                .toLowerCase()
                .split(/\s+/)
                .some((word) => word.startsWith(searchWord)),
        ),
    );
};

const getUserOptionDetail = (user: UserOption) =>
    [user?.trade_name, user?.user_code].filter(Boolean).join(' - ');

const selectMenuProps = {
    disablePortal: true,
    PaperProps: {
        sx: {
            mt: 0.5,
            maxHeight: 320,
            border: '1px solid #d9e2ef',
            borderRadius: '8px',
            boxShadow: '0 10px 28px rgba(15, 23, 42, 0.16)',
            '& .MuiMenuItem-root': {
                minHeight: 36,
                px: 1.5,
                fontSize: '0.8rem',
                whiteSpace: 'normal',
            },
        },
    },
    MenuListProps: {dense: true, sx: {py: 0.5}},
};

const tableAutocompleteSlotProps = {
    paper: {
        sx: {
            mt: 0.5,
            border: '1px solid #d9e2ef',
            borderRadius: '8px',
            boxShadow: '0 10px 28px rgba(15, 23, 42, 0.16)',
            '& .MuiAutocomplete-option': {
                minHeight: 36,
                px: 1.5,
                fontSize: '0.8rem',
                whiteSpace: 'normal',
            },
        },
    },
    listbox: {
        sx: {
            py: 0.5,
            maxHeight: 260,
        },
    },
};

const tableAutocompleteSx = {
    '& .MuiOutlinedInput-root': {
        minHeight: 36,
        bgcolor: '#fff',
        fontSize: '0.8rem',
        py: 0,
        borderRadius: '8px',
    },
    '& .MuiAutocomplete-input': {
        minWidth: '0 !important',
        fontSize: '0.8rem',
    },
};

type PriceWorkMatrixRowProps = {
    row: PricingRow;
    displayedProjects: any[];
    userOptions: UserOption[];
    tradeOptions: NamedOption[];
    categoryOptions: NamedOption[];
    subCategoryOptions: SubCategoryOption[];
    selected: boolean;
    selectedTaskName?: {category_name?: string; sub_category_name?: string};
    onToggleSelect: (rowId: string) => void;
    onUserChange: (rowId: string, userId: string) => void;
    onTradeChange: (rowId: string, tradeId: string) => void;
    onCategoryChange: (rowId: string, categoryId: string) => void;
    onSubCategoryChange: (rowId: string, subCategoryId: string, taskId: string) => void;
    onToggleBaseActive: (rowId: string) => void;
    onCommitBasePrice: (rowId: string, price: string) => void;
    onToggleProjectActive: (rowId: string, projectId: number, nextActive: boolean, fallbackPrice: string) => void;
    onCommitProjectPrice: (rowId: string, projectId: number, price: string) => void;
    onAddBelow: (rowId: string) => void;
    onRemove: (rowId: string) => void;
};

const PriceWorkMatrixRow = React.memo(({
    row,
    displayedProjects,
    userOptions,
    tradeOptions,
    categoryOptions,
    subCategoryOptions,
    selected,
    selectedTaskName,
    onToggleSelect,
    onUserChange,
    onTradeChange,
    onCategoryChange,
    onSubCategoryChange,
    onToggleBaseActive,
    onCommitBasePrice,
    onToggleProjectActive,
    onCommitProjectPrice,
    onAddBelow,
    onRemove,
}: PriceWorkMatrixRowProps) => {
    const {
        attributes,
        listeners,
        setActivatorNodeRef,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({id: row.id});

    const hasSubCategoryOptions = subCategoryOptions.length > 0;
    const selectedTrade = tradeOptions.find((trade) => trade.id === row.trade_id) ||
        (row.trade_id ? {id: row.trade_id, name: row.trade_name || 'Select trade'} : null);
    const selectedUser = userOptions.find((user) => user.id === row.user_id) ||
        (row.user_id ? {id: row.user_id, name: row.user_name || 'Select user'} : null);

    return (
        <TableRow
            ref={setNodeRef}
            hover
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                position: isDragging ? 'relative' : undefined,
                zIndex: isDragging ? 2 : undefined,
            }}
        >
            <TableCell align="center" sx={{borderRight: '1px solid #e2e8f0', minWidth: 36, px: 0.5, py: 1}}>
                <Tooltip title="Drag row">
                    <IconButton
                        ref={setActivatorNodeRef}
                        size="small"
                        aria-label="Drag price work row"
                        {...attributes}
                        {...listeners}
                        sx={{
                            width: 22,
                            height: 22,
                            cursor: isDragging ? 'grabbing' : 'grab',
                            color: '#64748b',
                            '&:hover': {backgroundColor: 'transparent', color: '#1976d2'},
                        }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <IconGripVertical size={16}/>
                    </IconButton>
                </Tooltip>
            </TableCell>

            <TableCell align="center" sx={{borderRight: '1px solid #e2e8f0', minWidth: 52, px: 0.5, py: 1}}>
                <CustomCheckbox
                    checked={selected}
                    onChange={() => onToggleSelect(row.id)}
                />
            </TableCell>

            <TableCell sx={{borderRight: '1px solid #e2e8f0', minWidth: 300, py: 1}}>
                <Box sx={{display: 'flex', alignItems: 'center', gap: 0.75}}>
                    <Autocomplete
                        size="small"
                        fullWidth
                        options={userOptions}
                        value={selectedUser}
                        getOptionKey={(option) => String(option.id)}
                        getOptionLabel={(option) => option.name || 'User'}
                        filterOptions={(options, state) =>
                            filterOptionsByWordStart(
                                options,
                                state.inputValue,
                                (option) => [option.name, getUserOptionDetail(option)].filter(Boolean).join(' '),
                            )
                        }
                        isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
                        onChange={(_, value) => {
                            onUserChange(row.id, value ? String(value.id) : '');
                        }}
                        autoHighlight
                        noOptionsText="No users found"
                        renderOption={(props, option) => {
                            const {key, ...optionProps} = props;
                            const detail = getUserOptionDetail(option);

                            return (
                                <Box component="li" key={key ?? String(option.id)} {...optionProps}>
                                    <Box sx={{display: 'flex', flexDirection: 'column', minWidth: 0}}>
                                        <Typography component="span" sx={{fontSize: '0.8rem', lineHeight: 1.25}}>
                                            {option.name || 'User'}
                                        </Typography>
                                        {detail && (
                                            <Typography component="span" sx={{fontSize: '0.72rem', lineHeight: 1.25, color: '#64748b'}}>
                                                {detail}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            );
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder="Select user"
                            />
                        )}
                        slotProps={tableAutocompleteSlotProps}
                        sx={{...tableAutocompleteSx, flex: 1, minWidth: 0}}
                    />

                    <Tooltip title={row.user_id ? 'Add row for this user' : 'Select user first'}>
                        <span>
                            <IconButton
                                size="small"
                                disabled={!row.user_id}
                                onClick={() => onAddBelow(row.id)}
                                aria-label="Add row below with selected user"
                                sx={{
                                    width: 28,
                                    height: 28,
                                    color: '#1976d2',
                                    '&:hover': {backgroundColor: 'transparent'},
                                }}
                            >
                                <IconPlus size={18}/>
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>
            </TableCell>

            <TableCell sx={{borderRight: '1px solid #e2e8f0', minWidth: 210, py: 1}}>
                <Autocomplete
                    size="small"
                    fullWidth
                    options={tradeOptions}
                    value={selectedTrade}
                    getOptionLabel={(option) => option.name || 'Trade'}
                    filterOptions={(options, state) =>
                        filterOptionsByWordStart(options, state.inputValue, (option) => option.name || '')
                    }
                    isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
                    onChange={(_, value) => {
                        onTradeChange(row.id, value ? String(value.id) : '');
                    }}
                    autoHighlight
                    noOptionsText="No trades found"
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            placeholder="Select trade"
                        />
                    )}
                    slotProps={tableAutocompleteSlotProps}
                    sx={tableAutocompleteSx}
                />
            </TableCell>

            <TableCell sx={{borderRight: '1px solid #e2e8f0', minWidth: 230, py: 1}}>
                <FormControl size="small" fullWidth>
                    <Select
                        value={row.category_id}
                        displayEmpty
                        disabled={!row.trade_id}
                        onChange={(event) => onCategoryChange(row.id, String(event.target.value))}
                        renderValue={(selectedValue) => {
                            if (!selectedValue) return 'Select category';

                            return categoryOptions.find((category) => category.id === String(selectedValue))?.name ||
                                row.category_name ||
                                selectedTaskName?.category_name ||
                                'Select category';
                        }}
                        MenuProps={selectMenuProps}
                        sx={{height: 36, fontSize: '0.8rem', bgcolor: '#fff'}}
                    >
                        <MenuItem value="">Select category</MenuItem>
                        {categoryOptions.map((category) => (
                            <MenuItem key={category.id} value={category.id}>
                                {category.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </TableCell>

            <TableCell sx={{borderRight: '1px solid #e2e8f0', minWidth: 230, py: 1}}>
                <FormControl size="small" fullWidth>
                    <Select
                        value={row.sub_category_id}
                        displayEmpty
                        disabled={!row.category_id || !hasSubCategoryOptions}
                        onChange={(event) => {
                            const selectedSub = subCategoryOptions.find((item) => item.id === String(event.target.value));
                            onSubCategoryChange(row.id, String(event.target.value), selectedSub?.task_id || '');
                        }}
                        renderValue={(selectedValue) => {
                            const selectedSubCategory = subCategoryOptions.find((item) =>
                                item.id === String(selectedValue) &&
                                (!row.task_id || item.task_id === row.task_id),
                            );

                            if (selectedSubCategory) return selectedSubCategory.name;
                            if (!selectedValue && row.task_id && row.category_id) {
                                return row.sub_category_name || selectedTaskName?.sub_category_name || '-';
                            }
                            if (!selectedValue) return 'Select subcategory';

                            return row.sub_category_name || selectedTaskName?.sub_category_name || 'Select subcategory';
                        }}
                        MenuProps={selectMenuProps}
                        sx={{height: 36, fontSize: '0.8rem', bgcolor: '#fff'}}
                    >
                        <MenuItem value="">Select subcategory</MenuItem>
                        {subCategoryOptions.map((subCategory) => (
                            <MenuItem key={`${subCategory.id}-${subCategory.task_id}`} value={subCategory.id}>
                                {subCategory.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </TableCell>

            <TableCell sx={{borderRight: '1px solid #e2e8f0', px: 1, py: 1, minWidth: 150}}>
                <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1}}>
                    <IOSSwitch
                        checked={row.base_active}
                        disabled={!row.task_id}
                        onChange={() => onToggleBaseActive(row.id)}
                    />
                    <PriceInput
                        value={row.base_active ? row.base_price : '0.00'}
                        disabled={!row.task_id || !row.base_active}
                        emphasized={row.base_active}
                        onCommit={(price) => onCommitBasePrice(row.id, price)}
                    />
                </Box>
            </TableCell>

            {displayedProjects.map((project) => {
                const projectKey = String(project.id);
                const projectPrice = row.project_prices[projectKey];
                const isProjectActive = projectPrice?.is_active ?? false;
                const displayPrice = projectPrice?.price ?? row.base_price ?? '0.00';

                return (
                    <TableCell
                        key={project.id}
                        align="center"
                        sx={{borderRight: '1px solid #e2e8f0', px: 1, py: 1, minWidth: 165}}
                    >
                        <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1}}>
                            <IOSSwitch
                                checked={isProjectActive}
                                disabled={!row.task_id}
                                onChange={() => onToggleProjectActive(
                                    row.id,
                                    Number(project.id),
                                    !isProjectActive,
                                    displayPrice,
                                )}
                            />
                            <PriceInput
                                value={displayPrice}
                                disabled={!row.task_id || !isProjectActive}
                                emphasized={isProjectActive}
                                onCommit={(price) => onCommitProjectPrice(row.id, Number(project.id), price)}
                            />
                        </Box>
                    </TableCell>
                );
            })}

            <TableCell align="center" sx={{py: 1, minWidth: 80}}>
                <Tooltip title="Remove row">
                    <IconButton
                        color="error"
                        size="small"
                        onClick={() => onRemove(row.id)}
                        aria-label="Remove price work row"
                    >
                        <IconTrash size={18}/>
                    </IconButton>
                </Tooltip>
            </TableCell>
        </TableRow>
    );
});

PriceWorkMatrixRow.displayName = 'PriceWorkMatrixRow';

export default PriceWorkMatrixRow;
