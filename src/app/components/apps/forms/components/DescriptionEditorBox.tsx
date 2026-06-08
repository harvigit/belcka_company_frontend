'use client';

import React, {useEffect, useRef, useState} from 'react';
import {
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    IconButton,
    Menu,
    MenuItem,
    Select,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Toolbar,
    Tooltip,
    Typography,
} from '@mui/material';
import {IconChevronDown, IconX} from '@tabler/icons-react';
import {EditorContent, useEditor} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Italic from '@tiptap/extension-italic';
import {Extension, Mark, Node, mergeAttributes} from '@tiptap/core';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import FormatAlignJustifyIcon from '@mui/icons-material/FormatAlignJustify';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import LinkIcon from '@mui/icons-material/Link';
import ImageIcon from '@mui/icons-material/Image';
import TableChartIcon from '@mui/icons-material/TableChart';
import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import BorderColorIcon from '@mui/icons-material/BorderColor';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import CustomTextField from '@/app/components/forms/theme-elements/CustomTextField';

const UnderlineMark = Mark.create({
    name: 'underline',
    parseHTML: () => [{tag: 'u'}, {style: 'text-decoration=underline'}],
    renderHTML: ({HTMLAttributes}) => ['u', mergeAttributes(HTMLAttributes), 0],
});

const LinkMark = Mark.create({
    name: 'link',
    inclusive: false,
    addAttributes: () => ({
        href: {default: null},
        target: {default: '_blank'},
        rel: {default: 'noopener noreferrer'},
    }),
    parseHTML: () => [{tag: 'a[href]'}],
    renderHTML: ({HTMLAttributes}) => ['a', mergeAttributes(HTMLAttributes), 0],
});

const TextStyleMark = Mark.create({
    name: 'textStyle',
    addAttributes: () => ({
        color: {
            default: null,
            parseHTML: (element) => element.style.color || null,
        },
        backgroundColor: {
            default: null,
            parseHTML: (element) => element.style.backgroundColor || null,
        },
        fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
        },
    }),
    parseHTML: () => [{tag: 'span'}],
    renderHTML: ({HTMLAttributes}) => {
        const style = [
            HTMLAttributes.color ? `color: ${HTMLAttributes.color}` : '',
            HTMLAttributes.backgroundColor ? `background-color: ${HTMLAttributes.backgroundColor}` : '',
            HTMLAttributes.fontSize ? `font-size: ${HTMLAttributes.fontSize}` : '',
        ].filter(Boolean).join('; ');
        return ['span', mergeAttributes(HTMLAttributes, style ? {style} : {}), 0];
    },
});

const TextAlignExtension = Extension.create({
    name: 'textAlign',
    addGlobalAttributes() {
        return [{
            types: ['paragraph', 'heading'],
            attributes: {
                textAlign: {
                    default: null,
                    parseHTML: (element) => element.style.textAlign || null,
                    renderHTML: (attributes) => attributes.textAlign ? {style: `text-align: ${attributes.textAlign}`} : {},
                },
            },
        }];
    },
});

const TableCellNode = Node.create({
    name: 'tableCell',
    content: 'block+',
    tableRole: 'cell',
    parseHTML: () => [{tag: 'td'}],
    renderHTML: ({HTMLAttributes}) => ['td', mergeAttributes(HTMLAttributes), 0],
});

const TableRowNode = Node.create({
    name: 'tableRow',
    content: 'tableCell+',
    tableRole: 'row',
    parseHTML: () => [{tag: 'tr'}],
    renderHTML: ({HTMLAttributes}) => ['tr', mergeAttributes(HTMLAttributes), 0],
});

const TableNode = Node.create({
    name: 'table',
    group: 'block',
    content: 'tableRow+',
    tableRole: 'table',
    addAttributes: () => ({
        width: {default: '100%'},
        height: {default: null},
        cellSpacing: {default: null},
        cellPadding: {default: null},
        borderWidth: {default: '1px'},
        alignment: {default: null},
        borderStyle: {default: 'solid'},
        borderColor: {default: null},
        backgroundColor: {default: null},
    }),
    parseHTML: () => [
        {tag: 'table', contentElement: 'tbody'},
        {tag: 'table'},
    ],
    renderHTML: ({HTMLAttributes}) => {
        const style = [
            HTMLAttributes.width ? `width: ${HTMLAttributes.width}` : '',
            HTMLAttributes.height ? `height: ${HTMLAttributes.height}` : '',
            HTMLAttributes.alignment === 'center' ? 'margin-left: auto; margin-right: auto' : '',
            HTMLAttributes.alignment === 'right' ? 'margin-left: auto' : '',
            HTMLAttributes.borderColor ? `--table-border-color: ${HTMLAttributes.borderColor}` : '',
            HTMLAttributes.borderWidth ? `--table-border-width: ${HTMLAttributes.borderWidth}` : '',
            HTMLAttributes.borderStyle ? `--table-border-style: ${HTMLAttributes.borderStyle}` : '',
            HTMLAttributes.cellPadding ? `--table-cell-padding: ${HTMLAttributes.cellPadding}` : '',
            HTMLAttributes.cellSpacing ? `border-spacing: ${HTMLAttributes.cellSpacing}; border-collapse: separate` : '',
            HTMLAttributes.backgroundColor ? `background-color: ${HTMLAttributes.backgroundColor}` : '',
        ].filter(Boolean).join('; ');
        return ['table', mergeAttributes(HTMLAttributes, style ? {style} : {}), 0];
    },
});

const StyledItalic = Italic.extend({
    parseHTML: () => [
        {tag: 'em'},
        {tag: 'i'},
        {style: 'font-style=italic'},
    ],
    renderHTML({HTMLAttributes}) {
        return ['span', mergeAttributes(HTMLAttributes, {style: 'font-style: italic;'}), 0];
    },
});
const normalizeHexColor = (value: string, fallback = '#000000') => {
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) return value;
    return fallback;
};

const ColorPickerField = ({
                              label,
                              value,
                              onChange,
                          }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) => {
    const pickerValue = normalizeHexColor(value);

    return (
        <Stack spacing={0.5}>
            <Typography fontSize={12} color="text.secondary">{label}</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
                <Box
                    component="input"
                    type="color"
                    value={pickerValue}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
                    sx={{
                        width: 42,
                        height: 38,
                        p: 0.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: 'background.paper',
                        cursor: 'pointer',
                    }}
                />
                <CustomTextField
                    className="custom_font"
                    value={value}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
                    placeholder="#000000"
                    variant="outlined"
                    fullWidth
                    inputProps={{maxLength: 7}}
                />
            </Stack>
        </Stack>
    );
};

const DescriptionEditorBox = ({
                                  value,
                                  onChange,
                              }: {
    value: string;
    onChange: (value: string) => void;
}) => {
    const imageInputRef = useRef<HTMLInputElement | null>(null);
    const editorAreaRef = useRef<HTMLDivElement | null>(null);
    const [linkOpen, setLinkOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkText, setLinkText] = useState('');
    const [tableAnchorEl, setTableAnchorEl] = useState<null | HTMLElement>(null);
    const [tablePropertiesOpen, setTablePropertiesOpen] = useState(false);
    const [tablePropertiesTab, setTablePropertiesTab] = useState<'general' | 'advanced'>('general');
    const [textColorAnchorEl, setTextColorAnchorEl] = useState<null | HTMLElement>(null);
    const [highlightAnchorEl, setHighlightAnchorEl] = useState<null | HTMLElement>(null);
    const [tableRows, setTableRows] = useState(0);
    const [tableCols, setTableCols] = useState(0);
    const [tableToolbarPosition, setTableToolbarPosition] = useState<{ top: number; left: number } | null>(null);
    const [tableProperties, setTableProperties] = useState({
        width: '100%',
        height: '',
        cellSpacing: '',
        cellPadding: '',
        borderWidth: '1px',
        alignment: '',
        borderStyle: 'solid',
        borderColor: '#E5E7EB',
        backgroundColor: '',
        showCaption: false,
    });
    const textColors = ['#111827', '#1976d2', '#2e7d32', '#ed6c02', '#d32f2f', '#7b1fa2'];
    const highlightColors = ['#d8ecff', '#fff4b8', '#d7f5dc', '#ffe2cc', '#ffd6d6', '#eadcff'];

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                italic: false,
            }),
            StyledItalic,
            Image.configure({
                allowBase64: true,
            }),
            UnderlineMark,
            LinkMark,
            TextStyleMark,
            TextAlignExtension,
            TableNode,
            TableRowNode,
            TableCellNode,
        ],
        content: value || '',
        editorProps: {
            attributes: {
                class: 'form-description-tiptap-editor',
            },
        },
        onUpdate: ({editor}) => onChange(editor.getHTML()),
        immediatelyRender: false,
    });

    const getTableContext = React.useCallback(() => {
        if (!editor) return null;
        const {$from} = editor.state.selection;
        let tableDepth = -1;
        let rowDepth = -1;
        let cellDepth = -1;

        for (let depth = $from.depth; depth > 0; depth -= 1) {
            const nodeName = $from.node(depth).type.name;
            if (nodeName === 'tableCell') cellDepth = depth;
            if (nodeName === 'tableRow') rowDepth = depth;
            if (nodeName === 'table') tableDepth = depth;
        }

        if (tableDepth < 0 || rowDepth < 0 || cellDepth < 0) return null;

        return {
            tableNode: $from.node(tableDepth),
            rowNode: $from.node(rowDepth),
            tablePos: $from.before(tableDepth),
            rowPos: $from.before(rowDepth),
            cellPos: $from.before(cellDepth),
            rowIndex: $from.index(tableDepth),
            colIndex: $from.index(rowDepth),
        };
    }, [editor]);

    useEffect(() => {
        if (!editor || editor.getHTML() === value) return;
        editor.commands.setContent(value || '', false);
    }, [editor, value]);

    useEffect(() => {
        if (!editor) return;
        const updateTableToolbar = () => {
            const context = getTableContext();
            const editorArea = editorAreaRef.current;
            const tableDom = context ? editor.view.nodeDOM(context.tablePos) : null;

            if (!context || !editorArea || !(tableDom instanceof HTMLElement)) {
                setTableToolbarPosition(null);
                return;
            }

            const tableRect = tableDom.getBoundingClientRect();
            const areaRect = editorArea.getBoundingClientRect();
            setTableToolbarPosition({
                top: tableRect.bottom - areaRect.top + editorArea.scrollTop + 10,
                left: tableRect.left - areaRect.left + editorArea.scrollLeft + tableRect.width / 2,
            });
        };
        const hideTableToolbar = () => setTimeout(updateTableToolbar, 120);
        editor.on('selectionUpdate', updateTableToolbar);
        editor.on('focus', updateTableToolbar);
        editor.on('blur', hideTableToolbar);
        updateTableToolbar();
        return () => {
            editor.off('selectionUpdate', updateTableToolbar);
            editor.off('focus', updateTableToolbar);
            editor.off('blur', hideTableToolbar);
        };
    }, [editor, getTableContext]);

    const createEmptyTableCell = () => {
        const schema = editor?.state.schema;
        return schema?.nodes.tableCell.create(null, schema.nodes.paragraph.create());
    };

    const createEmptyTableRow = (colCount: number) => {
        const schema = editor?.state.schema;
        if (!schema) return null;
        const cells = [];
        for (let index = 0; index < colCount; index += 1) {
            const cell = createEmptyTableCell();
            if (cell) cells.push(cell);
        }
        return schema.nodes.tableRow.create(null, cells);
    };

    const setTextStyle = (attrs: Record<string, string>) => {
        editor?.chain().focus().setMark('textStyle', attrs).run();
    };

    const setAlignment = (textAlign: string) => {
        editor?.chain().focus().command(({tr, state, dispatch}) => {
            const {from, to} = state.selection;
            state.doc.nodesBetween(from, to, (node, pos) => {
                if (['paragraph', 'heading'].includes(node.type.name)) {
                    tr.setNodeMarkup(pos, undefined, {...node.attrs, textAlign});
                }
            });
            dispatch?.(tr);
            return true;
        }).run();
    };

    const insertTable = (rows = 2, cols = 2) => {
        const tableRowsHtml = Array.from({length: rows}, () => (
            `<tr>${Array.from({length: cols}, () => '<td><p></p></td>').join('')}</tr>`
        )).join('');
        editor?.chain().focus().insertContent(`<table>${tableRowsHtml}</table><p></p>`).run();
        setTableAnchorEl(null);
        setTableRows(0);
        setTableCols(0);
    };

    const deleteTable = () => {
        editor?.chain().focus().command(({tr, state, dispatch}) => {
            const {$from} = state.selection;
            for (let depth = $from.depth; depth > 0; depth -= 1) {
                const node = $from.node(depth);
                if (node.type.name === 'table') {
                    const pos = $from.before(depth);
                    tr.delete(pos, pos + node.nodeSize);
                    dispatch?.(tr);
                    return true;
                }
            }
            return false;
        }).run();
        setTableAnchorEl(null);
    };

    const insertTableRow = (placement: 'before' | 'after') => {
        editor?.chain().focus().command(({tr, dispatch}) => {
            const context = getTableContext();
            if (!context) return false;
            const row = createEmptyTableRow(context.rowNode.childCount);
            if (!row) return false;
            const insertPos = placement === 'before' ? context.rowPos : context.rowPos + context.rowNode.nodeSize;
            tr.insert(insertPos, row);
            dispatch?.(tr);
            return true;
        }).run();
    };

    const deleteTableRow = () => {
        const context = getTableContext();
        if (!context) return;
        if (context.tableNode.childCount <= 1) {
            deleteTable();
            return;
        }
        editor?.chain().focus().command(({tr, dispatch}) => {
            tr.delete(context.rowPos, context.rowPos + context.rowNode.nodeSize);
            dispatch?.(tr);
            return true;
        }).run();
    };

    const insertTableColumn = (placement: 'before' | 'after') => {
        editor?.chain().focus().command(({tr, dispatch}) => {
            const context = getTableContext();
            const cell = createEmptyTableCell();
            if (!context || !cell) return false;
            const positions: number[] = [];

            context.tableNode.forEach((rowNode, rowOffset) => {
                const rowStart = context.tablePos + 1 + rowOffset;
                let cellOffset = 0;
                rowNode.forEach((cellNode, _cellOffset, cellIndex) => {
                    if (cellIndex < context.colIndex || (placement === 'after' && cellIndex <= context.colIndex)) {
                        cellOffset += cellNode.nodeSize;
                    }
                });
                positions.push(rowStart + 1 + cellOffset);
            });

            positions.reverse().forEach((position) => tr.insert(position, cell));
            dispatch?.(tr);
            return true;
        }).run();
    };

    const deleteTableColumn = () => {
        const context = getTableContext();
        if (!context) return;
        if (context.rowNode.childCount <= 1) {
            deleteTable();
            return;
        }

        editor?.chain().focus().command(({tr, dispatch}) => {
            const deleteRanges: Array<{ from: number; to: number }> = [];
            context.tableNode.forEach((rowNode, rowOffset) => {
                const rowStart = context.tablePos + 1 + rowOffset;
                let cellOffset = 0;
                rowNode.forEach((cellNode, _cellOffset, cellIndex) => {
                    if (cellIndex === context.colIndex) {
                        const from = rowStart + 1 + cellOffset;
                        deleteRanges.push({from, to: from + cellNode.nodeSize});
                    }
                    cellOffset += cellNode.nodeSize;
                });
            });
            deleteRanges.reverse().forEach(({from, to}) => tr.delete(from, to));
            dispatch?.(tr);
            return true;
        }).run();
    };

    const openTableProperties = () => {
        const context = getTableContext();
        if (context) {
            setTableProperties((cur) => ({
                ...cur,
                width: context.tableNode.attrs.width || '100%',
                height: context.tableNode.attrs.height || '',
                cellSpacing: context.tableNode.attrs.cellSpacing || '',
                cellPadding: context.tableNode.attrs.cellPadding || '',
                borderWidth: context.tableNode.attrs.borderWidth || '1px',
                alignment: context.tableNode.attrs.alignment || '',
                borderStyle: context.tableNode.attrs.borderStyle || 'solid',
                borderColor: context.tableNode.attrs.borderColor || '#E5E7EB',
                backgroundColor: context.tableNode.attrs.backgroundColor || '',
            }));
        }
        setTablePropertiesTab('general');
        setTablePropertiesOpen(true);
    };

    const saveTableProperties = () => {
        editor?.chain().focus().command(({tr, dispatch}) => {
            const context = getTableContext();
            if (!context) return false;
            tr.setNodeMarkup(context.tablePos, undefined, {
                ...context.tableNode.attrs,
                width: tableProperties.width,
                height: tableProperties.height || null,
                cellSpacing: tableProperties.cellSpacing || null,
                cellPadding: tableProperties.cellPadding || null,
                borderWidth: tableProperties.borderWidth,
                alignment: tableProperties.alignment || null,
                borderStyle: tableProperties.borderStyle,
                borderColor: tableProperties.borderColor || null,
                backgroundColor: tableProperties.backgroundColor || null,
            });
            dispatch?.(tr);
            return true;
        }).run();
        setTablePropertiesOpen(false);
    };

    const openLinkDialog = () => {
        const selectedText = editor?.state.doc.textBetween(
            editor.state.selection.from,
            editor.state.selection.to,
            ' ',
        ) || '';
        setLinkText(selectedText);
        setLinkUrl('');
        setLinkOpen(true);
    };

    const saveLink = () => {
        if (!editor || !linkUrl.trim()) return;
        const href = linkUrl.trim();
        const text = linkText.trim() || href;
        editor.chain().focus().insertContent(`<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`).run();
        setLinkOpen(false);
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !editor) return;
        const reader = new FileReader();
        reader.onload = () => {
            editor.chain().focus().setImage({src: String(reader.result)}).run();
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    return (
        <Box
            sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                overflow: 'hidden',
                bgcolor: 'background.paper',
            }}
        >
            <Toolbar
                disableGutters
                sx={{
                    minHeight: 'auto !important',
                    px: 1.25,
                    py: 0.75,
                    gap: 0.75,
                    flexWrap: 'wrap',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Select
                    size="small"
                    defaultValue="11pt"
                    onChange={(event) => setTextStyle({fontSize: String(event.target.value)})}
                    sx={{width: 105, height: 32, fontSize: 14}}
                >
                    {['10pt', '11pt', '12pt', '14pt', '18pt', '24pt'].map((size) => (
                        <MenuItem key={size} value={size}>{size}</MenuItem>
                    ))}
                </Select>

                <ToggleButtonGroup size="small">
                    <ToggleButton value="bold" selected={editor?.isActive('bold')}
                                  onClick={() => editor?.chain().focus().toggleBold().run()}>
                        <FormatBoldIcon fontSize="small"/>
                    </ToggleButton>
                    <ToggleButton value="italic" selected={editor?.isActive('italic')}
                                  onClick={() => editor?.chain().focus().toggleMark('italic').run()}>
                        <FormatItalicIcon fontSize="small"/>
                    </ToggleButton>
                    <ToggleButton value="underline" selected={editor?.isActive('underline')}
                                  onClick={() => editor?.chain().focus().toggleMark('underline').run()}>
                        <FormatUnderlinedIcon fontSize="small"/>
                    </ToggleButton>
                </ToggleButtonGroup>

                <IconButton size="small" onClick={(event) => setTextColorAnchorEl(event.currentTarget)}>
                    <FormatColorTextIcon fontSize="small"/>
                    <IconChevronDown size={13}/>
                </IconButton>
                <IconButton size="small" onClick={(event) => setHighlightAnchorEl(event.currentTarget)}>
                    <BorderColorIcon fontSize="small"/>
                    <IconChevronDown size={13}/>
                </IconButton>

                <ToggleButtonGroup size="small">
                    <ToggleButton value="left" onClick={() => setAlignment('left')}><FormatAlignLeftIcon
                        fontSize="small"/></ToggleButton>
                    <ToggleButton value="center" onClick={() => setAlignment('center')}><FormatAlignCenterIcon
                        fontSize="small"/></ToggleButton>
                    <ToggleButton value="right" onClick={() => setAlignment('right')}><FormatAlignRightIcon
                        fontSize="small"/></ToggleButton>
                    <ToggleButton value="justify" onClick={() => setAlignment('justify')}><FormatAlignJustifyIcon
                        fontSize="small"/></ToggleButton>
                </ToggleButtonGroup>

                <IconButton size="small" onClick={() => editor?.chain().focus().undo().run()}><UndoIcon
                    fontSize="small"/></IconButton>
                <IconButton size="small" onClick={() => editor?.chain().focus().redo().run()}><RedoIcon
                    fontSize="small"/></IconButton>
                <IconButton size="small"
                            onClick={() => editor?.chain().focus().toggleBulletList().run()}><FormatListBulletedIcon
                    fontSize="small"/></IconButton>
                <IconButton size="small"
                            onClick={() => editor?.chain().focus().toggleOrderedList().run()}><FormatListNumberedIcon
                    fontSize="small"/></IconButton>
                <IconButton size="small" onClick={openLinkDialog}><LinkIcon fontSize="small"/></IconButton>
                <IconButton size="small" onClick={() => imageInputRef.current?.click()}><ImageIcon
                    fontSize="small"/></IconButton>
                <IconButton size="small" onClick={(event) => setTableAnchorEl(event.currentTarget)}>
                    <TableChartIcon fontSize="small"/>
                    <IconChevronDown size={13}/>
                </IconButton>
                <input ref={imageInputRef} hidden type="file" accept="image/*" onChange={handleImageUpload}/>
            </Toolbar>

            <Box
                ref={editorAreaRef}
                sx={{
                    position: 'relative',
                    minHeight: 330,
                    maxHeight: {xs: 340, sm: 430},
                    overflow: 'auto',
                    p: 2,
                    '& .ProseMirror': {
                        minHeight: 300,
                        outline: 'none',
                        fontSize: 14,
                        lineHeight: 1.5,
                    },
                    '& .ProseMirror p': {my: 0.75},
                    '& .ProseMirror ul, & .ProseMirror ol': {pl: 3},
                    '& .ProseMirror a': {color: 'primary.main', textDecoration: 'underline'},
                    '& .ProseMirror em, & .ProseMirror i, & .ProseMirror span[style*="italic"]': {
                        fontStyle: 'italic !important',
                    },
                    '& .ProseMirror img': {maxWidth: '100%', height: 'auto', display: 'block', my: 1},
                    '& .ProseMirror table': {borderCollapse: 'collapse', my: 1},
                    '& .ProseMirror td': {
                        borderWidth: 'var(--table-border-width, 1px)',
                        borderStyle: 'var(--table-border-style, solid)',
                        borderColor: 'var(--table-border-color, #E5E7EB)',
                        minWidth: 80,
                        height: 28,
                        padding: 'var(--table-cell-padding, 4px 8px)',
                    },
                    '& .ProseMirror blockquote': {
                        borderLeft: '3px solid',
                        borderColor: 'divider',
                        color: 'text.secondary',
                        ml: 0,
                        pl: 1.5
                    },
                }}
            >
                <EditorContent editor={editor}/>
                {tableToolbarPosition && (
                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={0.5}
                        sx={{
                            position: 'absolute',
                            top: tableToolbarPosition.top,
                            left: tableToolbarPosition.left,
                            transform: 'translateX(-50%)',
                            zIndex: 4,
                            p: 0.75,
                            borderRadius: 1,
                            bgcolor: 'background.paper',
                            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.18)',
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: -7,
                                left: '50%',
                                transform: 'translateX(-50%) rotate(45deg)',
                                width: 14,
                                height: 14,
                                bgcolor: 'background.paper',
                                boxShadow: '-2px -2px 3px rgba(15, 23, 42, 0.04)',
                            },
                        }}
                        onMouseDown={(event) => event.preventDefault()}
                    >
                        <Tooltip title="Table properties">
                            <IconButton size="small" onClick={openTableProperties}>
                                <TableChartIcon fontSize="small"/>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Table">
                            <IconButton size="small" onClick={deleteTable}>
                                <DeleteOutlineIcon fontSize="small"/>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Insert Row Before">
                            <IconButton size="small" onClick={() => insertTableRow('before')}>
                                <AddBoxOutlinedIcon fontSize="small"/>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Insert Row After">
                            <IconButton size="small" onClick={() => insertTableRow('after')}>
                                <AddBoxOutlinedIcon fontSize="small" sx={{transform: 'rotate(180deg)'}}/>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Row">
                            <IconButton size="small" onClick={deleteTableRow}>
                                <DeleteForeverOutlinedIcon fontSize="small"/>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Insert Col Before">
                            <IconButton size="small" onClick={() => insertTableColumn('before')}>
                                <ViewColumnOutlinedIcon fontSize="small"/>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Insert Col After">
                            <IconButton size="small" onClick={() => insertTableColumn('after')}>
                                <ViewColumnOutlinedIcon fontSize="small" sx={{transform: 'rotate(180deg)'}}/>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Col">
                            <IconButton size="small" onClick={deleteTableColumn}>
                                <DeleteForeverOutlinedIcon fontSize="small" sx={{transform: 'rotate(90deg)'}}/>
                            </IconButton>
                        </Tooltip>
                    </Stack>
                )}
            </Box>

            <Menu anchorEl={tableAnchorEl} open={Boolean(tableAnchorEl)} onClose={() => setTableAnchorEl(null)}>
                <MenuItem sx={{display: 'block', cursor: 'default'}}>
                    <Stack spacing={1}>
                        <Typography fontSize={13} fontWeight={600}>Insert Table</Typography>
                        <Box sx={{display: 'grid', gridTemplateColumns: 'repeat(6, 18px)', gap: 0.5}}>
                            {Array.from({length: 36}, (_, index) => {
                                const row = Math.floor(index / 6) + 1;
                                const col = (index % 6) + 1;
                                const active = row <= tableRows && col <= tableCols;
                                return (
                                    <Box
                                        key={index}
                                        onMouseEnter={() => {
                                            setTableRows(row);
                                            setTableCols(col);
                                        }}
                                        onClick={() => insertTable(row, col)}
                                        sx={{
                                            width: 18,
                                            height: 18,
                                            border: '1px solid',
                                            borderColor: active ? 'primary.main' : 'divider',
                                            bgcolor: active ? 'primary.light' : 'background.paper',
                                            cursor: 'pointer',
                                        }}
                                    />
                                );
                            })}
                        </Box>
                        <Typography textAlign="center" color="text.secondary" fontSize={12}>
                            {tableRows && tableCols ? `${tableRows}x${tableCols}` : '0x0'}
                        </Typography>
                    </Stack>
                </MenuItem>
                <Divider/>
                <MenuItem onClick={() => setTableAnchorEl(null)}>Cell</MenuItem>
                <MenuItem onClick={() => setTableAnchorEl(null)}>Row</MenuItem>
                <MenuItem onClick={() => setTableAnchorEl(null)}>Column</MenuItem>
                <MenuItem onClick={() => {
                    setTableAnchorEl(null);
                    openTableProperties();
                }}>Table Properties</MenuItem>
                <MenuItem onClick={deleteTable}>
                    <DeleteOutlineIcon fontSize="small" sx={{mr: 1}}/>
                    Delete Table
                </MenuItem>
            </Menu>

            <Menu anchorEl={textColorAnchorEl} open={Boolean(textColorAnchorEl)}
                  onClose={() => setTextColorAnchorEl(null)}>
                <Stack direction="row" spacing={1} sx={{p: 1}}>
                    {textColors.map((color) => (
                        <Box
                            key={color}
                            onClick={() => {
                                setTextStyle({color});
                                setTextColorAnchorEl(null);
                            }}
                            sx={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                bgcolor: color,
                                border: '1px solid',
                                borderColor: 'divider',
                                cursor: 'pointer',
                            }}
                        />
                    ))}
                </Stack>
            </Menu>

            <Menu anchorEl={highlightAnchorEl} open={Boolean(highlightAnchorEl)}
                  onClose={() => setHighlightAnchorEl(null)}>
                <Stack direction="row" spacing={1} sx={{p: 1}}>
                    {highlightColors.map((color) => (
                        <Box
                            key={color}
                            onClick={() => {
                                setTextStyle({backgroundColor: color});
                                setHighlightAnchorEl(null);
                            }}
                            sx={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                bgcolor: color,
                                border: '1px solid',
                                borderColor: 'divider',
                                cursor: 'pointer',
                            }}
                        />
                    ))}
                </Stack>
            </Menu>

            <Dialog open={tablePropertiesOpen} onClose={() => setTablePropertiesOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography fontSize={20}>Table Properties</Typography>
                        <IconButton size="small" onClick={() => setTablePropertiesOpen(false)}>
                            <IconX size={18}/>
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent sx={{pt: 1}}>
                    <Stack direction={{xs: 'column', sm: 'row'}} spacing={3}>
                        <Stack spacing={1} minWidth={80}>
                            <Button
                                size="small"
                                variant={tablePropertiesTab === 'general' ? 'text' : 'text'}
                                onClick={() => setTablePropertiesTab('general')}
                                sx={{
                                    justifyContent: 'flex-start',
                                    borderBottom: tablePropertiesTab === 'general' ? '2px solid' : 'none',
                                    borderRadius: 0
                                }}
                            >
                                General
                            </Button>
                            <Button
                                size="small"
                                variant="text"
                                onClick={() => setTablePropertiesTab('advanced')}
                                sx={{
                                    justifyContent: 'flex-start',
                                    borderBottom: tablePropertiesTab === 'advanced' ? '2px solid' : 'none',
                                    borderRadius: 0
                                }}
                            >
                                Advanced
                            </Button>
                        </Stack>

                        {tablePropertiesTab === 'general' ? (
                            <Box sx={{
                                flex: 1,
                                display: 'grid',
                                gridTemplateColumns: {xs: '1fr', sm: '1fr 1fr'},
                                gap: 1.25
                            }}>
                                <Stack mt={1}>
                                    <Typography
                                        color="#1a1a1a"
                                        component="label"
                                        htmlFor="type"
                                        variant="body2"
                                    >
                                        Width
                                    </Typography>
                                    <CustomTextField
                                        className="custom_font"
                                        value={tableProperties.width}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTableProperties((cur) => ({
                                            ...cur,
                                            width: e.target.value
                                        }))}
                                        variant="outlined"
                                        fullWidth
                                    />
                                </Stack>

                                <Stack mt={1}>
                                    <Typography
                                        color="#1a1a1a"
                                        component="label"
                                        htmlFor="type"
                                        variant="body2"
                                    >
                                        Height
                                    </Typography>
                                    <CustomTextField
                                        className="custom_font"
                                        value={tableProperties.height}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTableProperties((cur) => ({
                                            ...cur,
                                            height: e.target.value
                                        }))}
                                        variant="outlined"
                                        fullWidth
                                    />
                                </Stack>

                                <Stack mt={1}>
                                    <Typography
                                        color="#1a1a1a"
                                        component="label"
                                        htmlFor="type"
                                        variant="body2"
                                    >
                                        Cell spacing
                                    </Typography>
                                    <CustomTextField
                                        className="custom_font"
                                        value={tableProperties.cellSpacing}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTableProperties((cur) => ({
                                            ...cur,
                                            cellSpacing: e.target.value
                                        }))}
                                        variant="outlined"
                                        fullWidth
                                    />
                                </Stack>

                                <Stack mt={1}>
                                    <Typography
                                        color="#1a1a1a"
                                        component="label"
                                        htmlFor="type"
                                        variant="body2"
                                    >
                                        Cell padding
                                    </Typography>
                                    <CustomTextField
                                        className="custom_font"
                                        value={tableProperties.cellPadding}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTableProperties((cur) => ({
                                            ...cur,
                                            cellPadding: e.target.value
                                        }))}
                                        variant="outlined"
                                        fullWidth
                                    />
                                </Stack>

                                <Stack mt={1}>
                                    <Typography
                                        color="#1a1a1a"
                                        component="label"
                                        htmlFor="type"
                                        variant="body2"
                                    >
                                        Border width
                                    </Typography>
                                    <CustomTextField
                                        className="custom_font"
                                        value={tableProperties.borderWidth}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTableProperties((cur) => ({
                                            ...cur,
                                            borderWidth: e.target.value
                                        }))}
                                        variant="outlined"
                                        fullWidth
                                    />
                                </Stack>

                                <Stack mt={1}>
                                    <Typography
                                        color="#1a1a1a"
                                        component="label"
                                        htmlFor="type"
                                        variant="body2"
                                    >
                                        Caption
                                    </Typography>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={tableProperties.showCaption}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTableProperties((cur) => ({
                                                    ...cur,
                                                    showCaption: e.target.checked
                                                }))}
                                            />
                                        }
                                        label="Show caption"
                                    />
                                </Stack>

                                <Stack mt={1}>
                                    <Typography
                                        color="#1a1a1a"
                                        component="label"
                                        htmlFor="type"
                                        variant="body2"
                                    >
                                        Alignment
                                    </Typography>
                                    <Select
                                        size="small"
                                        displayEmpty
                                        value={tableProperties.alignment}
                                        onChange={(e) => setTableProperties((cur) => ({
                                            ...cur,
                                            alignment: String(e.target.value)
                                        }))}
                                        sx={{gridColumn: {xs: 'auto', sm: '1 / 2'}}}
                                    >
                                        <MenuItem value="">None</MenuItem>
                                        <MenuItem value="left">Left</MenuItem>
                                        <MenuItem value="center">Center</MenuItem>
                                        <MenuItem value="right">Right</MenuItem>
                                    </Select>
                                </Stack>
                            </Box>
                        ) : (
                            <Stack spacing={1.25} flex={1}>
                                <Select
                                    size="small"
                                    value={tableProperties.borderStyle}
                                    onChange={(e) => setTableProperties((cur) => ({
                                        ...cur,
                                        borderStyle: String(e.target.value)
                                    }))}
                                >
                                    {['solid', 'dotted', 'dashed', 'double', 'groove', 'ridge', 'inset', 'outset', 'none', 'hidden'].map(
                                        (style) => (
                                            <MenuItem
                                                key={style}
                                                value={style}
                                            >
                                                {style[0].toUpperCase() + style.slice(1)}
                                            </MenuItem>
                                        ))
                                    }
                                </Select>
                                <ColorPickerField
                                    label="Border color"
                                    value={tableProperties.borderColor}
                                    onChange={
                                        (color) => setTableProperties(
                                            (cur) => ({
                                                ...cur, borderColor:
                                                color
                                            }))
                                    }
                                />
                                <ColorPickerField
                                    label="Background color"
                                    value={tableProperties.backgroundColor}
                                    onChange={(color) => setTableProperties((cur) => ({
                                        ...cur,
                                        backgroundColor: color
                                    }))}
                                />
                            </Stack>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{px: 3, pb: 2}}>
                    <Button
                        color="inherit"
                        onClick={() => setTablePropertiesOpen(false)}
                    >
                        Cancel
                    </Button>
                    <Button variant="contained" onClick={saveTableProperties}>Save</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={linkOpen} onClose={() => setLinkOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>Insert/Edit Link</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} mt={1}>
                        <CustomTextField
                            label="URL"
                            value={linkUrl}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLinkUrl(e.target.value)}
                            fullWidth
                            size="small"
                        />
                        <CustomTextField
                            label="Text to display"
                            value={linkText}
                            onChange={
                                (e: React.ChangeEvent<HTMLInputElement>) => setLinkText(e.target.value)
                            }
                            fullWidth
                            size="small"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button
                        color="inherit"
                        onClick={() => setLinkOpen(false)}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        onClick={saveLink}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default DescriptionEditorBox;
