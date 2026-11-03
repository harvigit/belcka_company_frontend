"use client";

import React, { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
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
} from "@mui/material";
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
} from "@tabler/icons-react";
import FormFieldDialog from "./FormFieldDialog";
import { extractFormFields } from "./contracts-api";
import type { ContractField } from "./contracts-api";

interface Props {
  value: string;
  onChange: (html: string) => void;
  fields: ContractField[];
  /** Lets the side panel insert a field at the cursor. */
  onReady?: (insert: (key: string) => void) => void;
}

const ContractEditor = ({ value, onChange, fields, onReady }: Props) => {
  const [fieldMenu, setFieldMenu] = useState<HTMLElement | null>(null);
  const [formFieldOpen, setFormFieldOpen] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    editorProps: { attributes: { class: "contract-editor-content" } },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    immediatelyRender: false,
  });

  // Only replace content when it changed from outside, so the cursor stays put.
  useEffect(() => {
    if (!editor || editor.getHTML() === value) return;
    editor.commands.setContent(value || "", false);
  }, [editor, value]);

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
        color={active ? "primary" : "default"}
        sx={{ borderRadius: 1, bgcolor: active ? "primary.light" : "transparent" }}
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
        sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: "divider" }}
      >
        {tool("Heading", <IconH2 size={18} />, () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), editor?.isActive("heading", { level: 2 }))}
        {tool("Subheading", <IconH3 size={18} />, () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), editor?.isActive("heading", { level: 3 }))}
        {tool("Bold", <IconBold size={18} />, () => editor?.chain().focus().toggleBold().run(), editor?.isActive("bold"))}
        {tool("Italic", <IconItalic size={18} />, () => editor?.chain().focus().toggleItalic().run(), editor?.isActive("italic"))}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        {tool("Numbered list", <IconListNumbers size={18} />, () => editor?.chain().focus().toggleOrderedList().run(), editor?.isActive("orderedList"))}
        {tool("Bullet list", <IconList size={18} />, () => editor?.chain().focus().toggleBulletList().run(), editor?.isActive("bulletList"))}
        {tool("Divider line", <IconSeparatorHorizontal size={18} />, () => editor?.chain().focus().setHorizontalRule().run())}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        {tool("Undo", <IconArrowBackUp size={18} />, () => editor?.chain().focus().undo().run())}
        {tool("Redo", <IconArrowForwardUp size={18} />, () => editor?.chain().focus().redo().run())}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <Button
          size="small"
          variant="text"
          startIcon={<IconPlus size={16} />}
          onClick={(e) => setFieldMenu(e.currentTarget)}
          sx={{ bgcolor: "primary.light" }}
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
              <ListItemText primary={field.label} secondary={field.source} />
            </MenuItem>
          ))}
        </Menu>
        <Button
          size="small"
          variant="text"
          startIcon={<IconForms size={16} />}
          onClick={() => setFormFieldOpen(true)}
          sx={{ bgcolor: "primary.light" }}
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
          "& .contract-editor-content": {
            minHeight: 480,
            px: { xs: 2, md: 5 },
            py: 3,
            outline: "none",
            fontSize: 15,
            lineHeight: 1.7,
          },
          "& .contract-editor-content p": { my: 1 },
          "& .contract-editor-content h2, & .contract-editor-content h3": { mt: 2, mb: 1 },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
};

export default ContractEditor;
