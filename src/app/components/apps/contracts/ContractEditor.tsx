'use client';

import React, {useEffect, useRef, useState} from 'react';
import {EditorContent, useEditor} from '@tiptap/react';
import {Extension} from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import {Plugin, PluginKey} from '@tiptap/pm/state';
import {Decoration, DecorationSet} from '@tiptap/pm/view';
import {
    Box,
    Button,
    Divider,
    IconButton,
    ListItemText,
    Menu,
    MenuItem,
    Stack,
    Tooltip,
} from '@mui/material';
import {
    IconArrowBackUp,
    IconArrowForwardUp,
    IconBold,
    IconH2,
    IconH3,
    IconItalic,
    IconList,
    IconListNumbers,
    IconForms,
    IconPlus,
    IconSeparatorHorizontal,
} from '@tabler/icons-react';
import FormFieldDialog from './FormFieldDialog';
import {extractFormFields} from './contracts-api';
import type {ContractField} from './contracts-api';

interface Props {
    value: string;
    onChange: (html: string) => void;
    fields: ContractField[];
    onReady?: (insert: (key: string) => void) => void;
    /** Known values shown in place of their {{key}} tokens (the stored HTML keeps the token). */
    fieldValues?: Record<string, string>;
}

const fieldValuesKey = new PluginKey<DecorationSet>('contractFieldValues');

/** Shows each {{key}} with a known value as that value, without changing the document. */
const FieldValues = (values: React.MutableRefObject<Record<string, string>>) =>
    Extension.create({
        name: 'contractFieldValues',
        addProseMirrorPlugins() {
            const build = (doc: any) => {
                const decorations: Decoration[] = [];
                doc.descendants((node: any, pos: number) => {
                    if (!node.isText) return;
                    for (const m of node.text.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)) {
                        const value = values.current[m[1]];
                        if (!value) continue;
                        const from = pos + m.index;
                        const to = from + m[0].length;
                        decorations.push(
                            Decoration.widget(from, () => {
                                const span = document.createElement('span');
                                span.className = 'contract-field-value';
                                span.textContent = value;
                                span.title = m[0];
                                return span;
                            }, {side: -1, key: `${m[1]}:${value}`}),
                            Decoration.inline(from, to, {class: 'contract-field-token'}),
                        );
                    }
                });
                return DecorationSet.create(doc, decorations);
            };
            return [
                new Plugin({
                    key: fieldValuesKey,
                    state: {
                        init: (_, {doc}) => build(doc),
                        apply: (tr, old) => (tr.docChanged || tr.getMeta(fieldValuesKey) ? build(tr.doc) : old),
                    },
                    props: {decorations: (state) => fieldValuesKey.getState(state)},
                }),
            ];
        },
    });

const ContractEditor = ({value, onChange, fields, onReady, fieldValues}: Props) => {
    const [fieldMenu, setFieldMenu] = useState<HTMLElement | null>(null);
    const [formFieldOpen, setFormFieldOpen] = useState(false);
    const valuesRef = useRef<Record<string, string>>(fieldValues ?? {});

    const editor = useEditor({
        extensions: [StarterKit, FieldValues(valuesRef)],
        content: value || '',
        editorProps: {attributes: {class: 'contract-editor-content'}},
        onUpdate: ({editor}) => onChange(editor.getHTML()),
        immediatelyRender: false,
    });

    // Only replace content when it changed from outside, so the cursor stays put.
    useEffect(() => {
        if (!editor || editor.getHTML() === value) return;
        editor.commands.setContent(value || '', false);
    }, [editor, value]);

    // Redraw the shown values when they arrive or change.
    useEffect(() => {
        valuesRef.current = fieldValues ?? {};
        if (editor && !editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta(fieldValuesKey, true));
    }, [editor, fieldValues]);

    useEffect(() => {
        if (!editor || !onReady) return;
        onReady((key: string) => {
            editor.chain().focus().insertContent(`{{${key}}}`).run();
        });
    }, [editor, onReady]);

    const tool = (
        label: string,
        icon: React.ReactNode,
        onClick: () => void,
        active = false,
    ) => (
        <Tooltip title={label}>
            <IconButton
                size="small"
                aria-label={label}
                onClick={onClick}
                color={active ? 'primary' : 'default'}
                sx={{borderRadius: 1, bgcolor: active ? 'primary.light' : 'transparent'}}
            >
                {icon}
            </IconButton>
        </Tooltip>
    );

    return (
        <Box>
            <Stack
                direction="row"
                alignItems="center"
                flexWrap="wrap"
                gap={0.5}
                sx={{px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider'}}
            >
                {tool('Heading', <IconH2
                    size={18}/>, () => editor?.chain().focus().toggleHeading({level: 2}).run(), editor?.isActive('heading', {level: 2}))}
                
                {tool('Subheading', <IconH3
                    size={18}/>, () => editor?.chain().focus().toggleHeading({level: 3}).run(), editor?.isActive('heading', {level: 3}))}
                
                {tool('Bold', <IconBold
                    size={18}/>, () => editor?.chain().focus().toggleBold().run(), editor?.isActive('bold'))}
                
                {tool('Italic', <IconItalic
                    size={18}/>, () => editor?.chain().focus().toggleItalic().run(), editor?.isActive('italic'))}
                
                <Divider orientation="vertical" flexItem sx={{mx: 0.5}}/>
                
                {tool('Numbered list', <IconListNumbers
                    size={18}/>, () => editor?.chain().focus().toggleOrderedList().run(), editor?.isActive('orderedList'))}
                
                {tool('Bullet list', <IconList
                    size={18}/>, () => editor?.chain().focus().toggleBulletList().run(), editor?.isActive('bulletList'))}
                
                {tool('Divider line', <IconSeparatorHorizontal
                    size={18}/>, () => editor?.chain().focus().setHorizontalRule().run())}
                
                <Divider orientation="vertical" flexItem sx={{mx: 0.5}}/>
                
                {tool('Undo', <IconArrowBackUp size={18}/>, () => editor?.chain().focus().undo().run())}
                
                {tool('Redo', <IconArrowForwardUp size={18}/>, () => editor?.chain().focus().redo().run())}
                
                <Divider orientation="vertical" flexItem sx={{mx: 0.5}}/>
                
                <Button
                    size="small"
                    variant="text"
                    startIcon={<IconPlus size={16}/>}
                    onClick={(e) => setFieldMenu(e.currentTarget)}
                    sx={{bgcolor: 'primary.light'}}
                >
                    Insert field
                </Button>
                
                <Menu anchorEl={fieldMenu} open={Boolean(fieldMenu)} onClose={() => setFieldMenu(null)}>
                    {fields.map((field) => (
                        <MenuItem
                            key={field.key}
                            onClick={() => {
                                editor?.chain().focus().insertContent(`{{${field.key}}}`).run();
                                setFieldMenu(null);
                            }}
                        >
                            <ListItemText primary={field.label} secondary={field.source}/>
                        </MenuItem>
                    ))}
                </Menu>
                
                <Button
                    size="small"
                    variant="text"
                    startIcon={<IconForms size={16}/>}
                    onClick={() => setFormFieldOpen(true)}
                    sx={{bgcolor: 'primary.light'}}
                >
                    Form field
                </Button>
            </Stack>
            
            <FormFieldDialog
                open={formFieldOpen}
                usedKeys={formFieldOpen ? extractFormFields(value).fields.map((f) => f.key) : []}
                onClose={() => setFormFieldOpen(false)}
                onInsert={(token) => editor?.chain().focus().insertContent(token).run()}
            />
            
            <Box
                sx={{
                    '& .contract-editor-content': {
                        minHeight: 480,
                        px: {xs: 2, md: 5},
                        py: 3,
                        outline: 'none',
                        fontSize: 15,
                        lineHeight: 1.7,
                    },
                    '& .contract-editor-content p': {my: 1},
                    '& .contract-editor-content h2, & .contract-editor-content h3': {mt: 2, mb: 1},
                    // A field with a known value shows the value; the {{key}} token stays in the saved HTML.
                    '& .contract-field-token': {display: 'none'},
                    '& .contract-field-value': {
                        bgcolor: 'primary.light',
                        color: 'primary.main',
                        borderRadius: 0.5,
                        px: 0.5,
                    },
                }}
            >
                <EditorContent editor={editor}/>
            </Box>
        </Box>
    );
};

export default ContractEditor;
