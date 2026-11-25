"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  InputAdornment,
  ListItemIcon,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  IconArrowBackUp,
  IconArrowLeft,
  IconArrowsMove,
  IconChevronDown,
  IconChevronRight,
  IconChevronsDown,
  IconChevronsUp,
  IconClipboard,
  IconCopy,
  IconDoor,
  IconDotsVertical,
  IconEdit,
  IconFolder,
  IconFolderPlus,
  IconHistory,
  IconPlus,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import Image from "next/image";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import ConfirmDialog from "@/app/components/apps/inventory-new/shared/ConfirmDialog";
import { NhfSheet, apiMessage, money, uomLabel } from "../nhf-rates/types";
import { AddToNhfDrawer, ElementDrawer, NameDrawer } from "./drawers";
import MultiAddDialog from "./MultiAddDialog";
import MoveToDialog from "./MoveToDialog";
import { TemplateDetail as Detail, TplElement, TplNode, countEls, countGroups, pathOf, plural } from "./types";
import Chip from "@/app/components/apps/surveys/shared/SurveyChip";
import { WARN_BG, WARN_BORDER, WARN_TEXT } from "@/app/components/apps/surveys/shared/colors";

type NameDlg = { kind: "room" | "group" | "rename-node" | "rename-template"; parentId?: number; node?: TplNode } | null;
type DelDlg = { kind: "node"; node: TplNode } | { kind: "element"; element: TplElement } | { kind: "selected"; ids: number[] } | { kind: "template" } | null;

// ---------- copy / paste / move and undo ----------
type Clip = { elements: number[]; nodes: number[]; label: string; names: string[] };
type UndoStep = { label: string; run: () => Promise<unknown> };
const UNDO_STEPS = 10;

type Ctx = {
  sel: Set<number>;
  toggle: (id: number) => void;
  clip: Clip | null;
  pasteInto: (targetId: number) => void;
  closed: Record<number, boolean>;
  setClosed: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  query: string;
  match: (e: TplElement) => boolean;
  visible: (n: TplNode) => boolean;
  onEdit: (e: TplElement) => void;
  onDelete: (e: TplElement) => void;
  onAddToNhf: (e: TplElement) => void;
  onAddHere: (nodeId: number) => void;
  onMenu: (anchor: HTMLElement, node: TplNode) => void;
};
const TreeCtx = createContext<Ctx | null>(null);
const useTree = () => useContext(TreeCtx)!;

/** First names of a list, e.g. “Paint ceiling, Renew carpet +2 more”. */
const preview = (names: string[], max = 2) => (names.length <= max ? names.join(", ") : `${names.slice(0, max).join(", ")} +${names.length - max} more`);

const PasteHere: React.FC<{ targetId: number; compact?: boolean }> = ({ targetId, compact }) => {
  const c = useTree();
  if (!c.clip) return null;
  const btn = (
    <Button
      size="small"
      variant="outlined"
      startIcon={compact ? undefined : <IconClipboard size={15} />}
      onClick={(e) => {
        e.stopPropagation();
        c.pasteInto(targetId);
      }}
      sx={{ whiteSpace: "nowrap", py: 0.1, minWidth: 0, px: compact ? 0.75 : 1.25, bgcolor: "#fff" }}
    >
      {compact ? <IconClipboard size={15} /> : "Paste here"}
    </Button>
  );
  return compact ? <Tooltip title={`Paste ${c.clip.label} here`}>{btn}</Tooltip> : btn;
};

const ElementRow: React.FC<{ e: TplElement; depth: number }> = ({ e, depth }) => {
  const c = useTree();
  const selected = c.sel.has(e.id);
  const notInNhf = e.nhf && !e.nhf.found;
  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={1}
      sx={{
        pl: 1 + depth * 2.5,
        pr: 1,
        py: 0.75,
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: selected ? "#eef4ff" : undefined,
        "&:hover": { bgcolor: selected ? "#e6efff" : "#f8fafc" },
        "&:hover .row-acts, &:hover .row-hint": { opacity: 1 },
      }}
    >
      <Checkbox
        size="small"
        className="row-hint"
        checked={selected}
        onChange={() => c.toggle(e.id)}
        sx={{ p: 0.25, opacity: selected || c.sel.size ? 1 : 0.45 }}
        slotProps={{ input: { "aria-label": `Select ${e.name}` } }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography className="f-14" fontWeight={600} noWrap>{e.name}</Typography>
        {e.description && e.description.toLowerCase() !== e.name.toLowerCase() && (
          <Typography variant="caption" color="textSecondary" noWrap display="block">{e.description}</Typography>
        )}
      </Box>
      {e.vo_main === "VO" && <Chip size="small" color="warning" variant="outlined" label="VO" />}
      <Box sx={{ width: 110, textAlign: "left" }}>
        {e.code ? <Chip size="small" variant="outlined" label={e.code} /> : <Typography variant="caption" color="textSecondary">Custom</Typography>}
      </Box>
      <Typography className="f-14" color="textSecondary" sx={{ width: 60 }}>{uomLabel(e.uom)}</Typography>
      <Typography className="f-14" color="textSecondary" sx={{ width: 50, textAlign: "right" }}>{e.default_qty ?? "–"}</Typography>
      <Box sx={{ width: 120, textAlign: "right" }}>
        {notInNhf ? (
          <Tooltip title="This code is not in any NHF sheet, so it has no price">
            <Button size="small" variant="outlined" sx={{ color: WARN_TEXT, borderColor: WARN_BORDER, "&:hover": { borderColor: WARN_TEXT, bgcolor: WARN_BG } }} onClick={() => c.onAddToNhf(e)}>Add to NHF</Button>
          </Tooltip>
        ) : (
          <Tooltip title={e.nhf && e.nhf.found ? `Base rate from ${e.nhf.sheet_name}` : "Rate kept on this element"}>
            <Typography className="f-14" fontWeight={600}>{money(e.rate)}</Typography>
          </Tooltip>
        )}
      </Box>
      <Stack direction="row" className="row-acts" sx={{ opacity: 0.35, transition: "opacity .15s" }}>
        <Tooltip title="Edit"><IconButton size="small" color="primary" onClick={() => c.onEdit(e)}><IconEdit size={17} /></IconButton></Tooltip>
        <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => c.onDelete(e)}><IconTrash size={17} /></IconButton></Tooltip>
      </Stack>
    </Stack>
  );
};

const GroupBlock: React.FC<{ g: TplNode; depth: number }> = ({ g, depth }) => {
  const c = useTree();
  if (c.query && !c.visible(g)) return null;
  const isClosed = c.closed[g.id] && !c.query;
  return (
    <Box>
      <Stack direction="row" alignItems="center" gap={1} sx={{ pl: 1 + depth * 2.5, pr: 1, py: 0.6, bgcolor: "#f8fafc", borderBottom: 1, borderColor: "divider" }}>
        <IconButton size="small" onClick={() => c.setClosed((x) => ({ ...x, [g.id]: !x[g.id] }))} aria-label={isClosed ? "Open group" : "Close group"}>
          {isClosed ? <IconChevronRight size={16} /> : <IconChevronDown size={16} />}
        </IconButton>
        <IconFolder size={16} color="#7D92A9" />
        <Typography className="f-14" fontWeight={600} sx={{ flex: 1 }} noWrap>{g.name}</Typography>
        <PasteHere targetId={g.id} />
        <Typography variant="caption" color="textSecondary" sx={{ whiteSpace: "nowrap" }}>{plural(countEls(g), "element")}</Typography>
        <Tooltip title="Add elements here"><IconButton size="small" color="primary" onClick={() => c.onAddHere(g.id)}><IconPlus size={17} /></IconButton></Tooltip>
        <Tooltip title="More"><IconButton size="small" onClick={(e) => c.onMenu(e.currentTarget, g)}><IconDotsVertical size={17} /></IconButton></Tooltip>
      </Stack>
      <Collapse in={!isClosed} unmountOnExit>
        {g.elements.filter(c.match).map((e) => <ElementRow key={e.id} e={e} depth={depth + 1} />)}
        {g.children.map((ch) => <GroupBlock key={ch.id} g={ch} depth={depth + 1} />)}
        {!g.elements.length && !g.children.length && (
          <Typography variant="caption" color="textSecondary" display="block" sx={{ pl: 6 + depth * 2.5, py: 1, borderBottom: 1, borderColor: "divider" }}>
            No elements yet. Use <b>+</b> to add some, or paste copied elements here.
          </Typography>
        )}
      </Collapse>
    </Box>
  );
};

// One template: areas on the left, the selected area's groups and elements on the right.
const TemplateDetail: React.FC<{ id: number; onBack: () => void }> = ({ id, onBack }) => {
  const [t, setT] = useState<Detail | null>(null);
  const [sheets, setSheets] = useState<NhfSheet[]>([]);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [closed, setClosed] = useState<Record<number, boolean>>({});
  const [q, setQ] = useState("");
  const [nameDlg, setNameDlg] = useState<NameDlg>(null);
  const [elDlg, setElDlg] = useState<{ nodeId: number | null; element: TplElement | null } | null>(null);
  const [addDlg, setAddDlg] = useState<number | null>(null);
  const [nhfDlg, setNhfDlg] = useState<TplElement | null>(null);
  const [del, setDel] = useState<DelDlg>(null);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; node: TplNode } | null>(null);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [clip, setClip] = useState<Clip | null>(null);
  const [moveDlg, setMoveDlg] = useState<{ elements: number[]; nodes: number[]; label: string } | null>(null);
  const [undo, setUndo] = useState<UndoStep[]>([]);
  const [undoHidden, setUndoHidden] = useState(false);
  const [undoBusy, setUndoBusy] = useState(false);

  const load = useCallback(async (): Promise<Detail | null> => {
    try {
      const [res, sh] = await Promise.all([api.get(`survey-templates/${id}`), api.get("nhf-rates/sheets")]);
      const d: Detail = res.data.data;
      setT(d);
      setSheets((sh.data.data as NhfSheet[]).filter((s) => s.current_version));
      setRoomId((cur) => (cur && d.rooms.some((r) => r.id === cur) ? cur : d.rooms[0]?.id ?? null));
      return d;
    } catch (e) {
      toast.error(apiMessage(e, "Could not load the template."));
      onBack();
      return null;
    }
  }, [id, onBack]);
  useEffect(() => {
    load();
  }, [load]);

  const room = useMemo(() => t?.rooms.find((r) => r.id === roomId) ?? null, [t, roomId]);
  const totals = useMemo(
    () => (t ? { rooms: t.rooms.length, groups: t.rooms.reduce((a, r) => a + countGroups(r), 0), els: t.rooms.reduce((a, r) => a + countEls(r), 0) } : null),
    [t],
  );
  const roomSkipped = t && room ? t.skipped.filter((s) => s.room_name === room.name).length : 0;
  const nodeName = useCallback((nid: number) => (t ? pathOf(t.rooms, nid).slice(-1)[0]?.name ?? "" : ""), [t]);
  const elementById = useCallback(
    (eid: number, d: Detail | null = t): TplElement | null => {
      if (!d) return null;
      const walk = (n: TplNode): TplElement | null => n.elements.find((e) => e.id === eid) ?? n.children.map(walk).find(Boolean) ?? null;
      return d.rooms.map(walk).find(Boolean) ?? null;
    },
    [t],
  );

  // ---------- undo (up to 10 steps; the bar's Undo takes back the newest) ----------
  const pushUndo = (label: string, run: () => Promise<unknown>) => {
    setUndo((s) => [...s.slice(-(UNDO_STEPS - 1)), { label, run }]);
    setUndoHidden(false);
  };
  const lastUndo = undo[undo.length - 1];
  const undoLast = async () => {
    if (!lastUndo || undoBusy) return;
    setUndoBusy(true);
    try {
      await lastUndo.run();
      toast.success(`Undone: ${lastUndo.label}`);
      setUndo((s) => s.slice(0, -1));
    } catch (e) {
      toast.error(apiMessage(e, "Could not undo it. The template has changed since."));
      setUndo((s) => s.slice(0, -1));
    }
    await load();
    setUndoBusy(false);
  };

  // ---------- API helpers ----------
  const paste = async (body: { element_ids?: number[]; node_ids?: number[]; target_id: number; mode: "copy" | "move" }) => (await api.post(`survey-templates/${id}/paste`, body)).data;
  const undoPaste = (data: any) => async () => {
    if (data.element_ids?.length) await api.post(`survey-templates/${id}/elements/delete`, { ids: data.element_ids });
    for (const n of data.node_ids ?? []) await api.delete(`survey-templates/nodes/${n}`);
    if (data.moved?.length) await api.put(`survey-templates/${id}/elements/place`, { items: data.moved });
    if (data.moved_nodes?.length) await api.put(`survey-templates/${id}/nodes/place`, { items: data.moved_nodes });
  };
  const nothingDone = (data: any) => !data.element_ids?.length && !data.node_ids?.length && !data.moved?.length && !data.moved_nodes?.length;

  // ---------- selection / clipboard ----------
  const toggle = (eid: number) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(eid)) n.delete(eid);
      else n.add(eid);
      return n;
    });
  const selNames = [...sel].map((x) => elementById(x)?.name).filter((x): x is string => !!x);
  const copySelected = () => {
    if (!sel.size) return;
    const label = sel.size === 1 ? `“${selNames[0] ?? "element"}”` : `${sel.size} elements`;
    setClip({ elements: [...sel], nodes: [], label, names: selNames });
    setSel(new Set());
    toast.success(`${label} copied. Use Paste here on any group or area.`);
  };
  const pasteInto = async (targetId: number) => {
    if (!clip) return;
    try {
      const res = await paste({ element_ids: clip.elements, node_ids: clip.nodes, target_id: targetId, mode: "copy" });
      const d = await load();
      if (nothingDone(res.data)) return toast(res.message, { icon: "ℹ️" });
      toast.success(res.message);
      pushUndo(`paste into ${nodeName(targetId)}`, undoPaste(res.data));
      // one element pasted into its own group: open the copy so it can be renamed
      const src = clip.elements.length === 1 && !clip.nodes.length ? elementById(clip.elements[0], d) : null;
      if (src && src.node_id === targetId && res.data.element_ids.length === 1) {
        const copy = elementById(res.data.element_ids[0], d);
        if (copy) setElDlg({ nodeId: copy.node_id, element: copy });
      }
      if (targetId !== roomId && d?.rooms.some((r) => r.id === targetId)) setRoomId(targetId);
    } catch (e) {
      toast.error(apiMessage(e, "Could not paste."));
    }
  };
  const moveTo = async (targetId: number) => {
    if (!moveDlg) return;
    try {
      const res = await paste({ element_ids: moveDlg.elements, node_ids: moveDlg.nodes, target_id: targetId, mode: "move" });
      setMoveDlg(null);
      setSel(new Set());
      const name = nodeName(targetId);
      await load();
      if (nothingDone(res.data)) return toast(res.message, { icon: "ℹ️" });
      toast.success(res.message);
      pushUndo(`move ${moveDlg.label} to ${name}`, undoPaste(res.data));
    } catch (e) {
      toast.error(apiMessage(e, "Could not move."));
    }
  };

  // keyboard: Ctrl/⌘+C copies the selection, Ctrl/⌘+V pastes into the open area, Ctrl/⌘+Z undoes, Esc clears
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (nameDlg || elDlg || addDlg || moveDlg || del || nhfDlg) return;
      const el = e.target as HTMLElement;
      // typing in a text box keeps the normal copy / paste / undo; a ticked checkbox does not count
      const typing = !!el && (el.isContentEditable || el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && !["checkbox", "radio", "button"].includes((el as HTMLInputElement).type)));
      if (typing) return;
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (mod && k === "c" && sel.size && !window.getSelection()?.toString()) {
        e.preventDefault();
        copySelected();
      } else if (mod && k === "v" && clip && roomId) {
        e.preventDefault();
        pasteInto(roomId);
      } else if (mod && k === "z" && !e.shiftKey && lastUndo) {
        e.preventDefault();
        undoLast();
      } else if (e.key === "Escape" && (sel.size || clip)) {
        // clear the selection / clipboard only; do not close Survey Settings
        e.preventDefault();
        e.stopPropagation();
        if (sel.size) setSel(new Set());
        else setClip(null);
      }
    };
    // capture phase: runs before the drawer's own Esc handling
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  // ---------- names / delete ----------
  const saveName = async (name: string): Promise<string | null> => {
    if (!nameDlg || !t) return null;
    try {
      let res;
      if (nameDlg.kind === "room") res = await api.post(`survey-templates/${t.id}/nodes`, { name });
      else if (nameDlg.kind === "group") res = await api.post(`survey-templates/${t.id}/nodes`, { name, parent_id: nameDlg.parentId });
      else if (nameDlg.kind === "rename-node") res = await api.put(`survey-templates/nodes/${nameDlg.node!.id}`, { name });
      else res = await api.put(`survey-templates/${t.id}`, { name });
      toast.success(res.data.message);
      if (nameDlg.kind === "room" && res.data.data?.id) setRoomId(res.data.data.id);
      if (nameDlg.kind === "group" && nameDlg.parentId) setClosed((c) => ({ ...c, [nameDlg.parentId!]: false }));
      setNameDlg(null);
      await load();
      return null;
    } catch (e) {
      return apiMessage(e, "Could not save.");
    }
  };

  const doDelete = async () => {
    if (!del || !t) return;
    setBusy(true);
    try {
      let res;
      if (del.kind === "node") res = await api.delete(`survey-templates/nodes/${del.node.id}`);
      else if (del.kind === "element") res = await api.post(`survey-templates/${t.id}/elements/delete`, { ids: [del.element.id] });
      else if (del.kind === "selected") res = await api.post(`survey-templates/${t.id}/elements/delete`, { ids: del.ids });
      else res = await api.delete(`survey-templates/${t.id}`);
      setDel(null);
      toast.success(res.data.message);
      if (del.kind === "template") onBack();
      else {
        const ids = del.kind === "element" ? [del.element.id] : del.kind === "selected" ? del.ids : [];
        if (del.kind === "selected") setSel(new Set());
        if (ids.length) pushUndo(del.kind === "element" ? `delete “${del.element.name}”` : `delete ${plural(ids.length, "element")}`, () => api.post(`survey-templates/${t.id}/elements/restore`, { ids }));
        await load();
      }
    } catch (e) {
      toast.error(apiMessage(e, "Could not delete."));
    }
    setBusy(false);
  };

  // search inside the area: keep matching elements (and the groups that hold them)
  const query = q.trim().toLowerCase();
  const match = (e: TplElement) => !query || e.name.toLowerCase().includes(query) || (e.code ?? "").toLowerCase().includes(query) || (e.description ?? "").toLowerCase().includes(query);
  const visible = (n: TplNode): boolean => n.elements.some(match) || n.children.some(visible);

  if (!t || !totals) {
    return <Box textAlign="center" py={6}><CircularProgress size={28} /></Box>;
  }

  const allIds: number[] = [];
  const collect = (n: TplNode) => n.children.forEach((c) => { allIds.push(c.id); collect(c); });
  if (room) collect(room);
  // elements of the open area that the search shows (for "select all")
  const shownEls: number[] = [];
  const collectEls = (n: TplNode) => {
    n.elements.filter(match).forEach((e) => shownEls.push(e.id));
    n.children.forEach(collectEls);
  };
  if (room) collectEls(room);
  const allShownSelected = shownEls.length > 0 && shownEls.every((x) => sel.has(x));
  const barMode: "sel" | "clip" | "undo" | null = sel.size ? "sel" : clip ? "clip" : lastUndo && !undoHidden ? "undo" : null;

  const ctx: Ctx = {
    sel,
    toggle,
    clip,
    pasteInto,
    closed,
    setClosed,
    query,
    match,
    visible,
    onEdit: (e) => setElDlg({ nodeId: e.node_id, element: e }),
    onDelete: (e) => setDel({ kind: "element", element: e }),
    onAddToNhf: (e) => setNhfDlg(e),
    onAddHere: (nid) => setAddDlg(nid),
    onMenu: (anchor, n) => setMenu({ anchor, node: n }),
  };

  const undoButton = (
    <Tooltip title={lastUndo ? `Undo: ${lastUndo.label} (Ctrl/⌘ + Z)` : "Nothing to undo yet"}>
      <span>
        <Button size="small" color="inherit" startIcon={undoBusy ? <CircularProgress size={14} color="inherit" /> : <IconArrowBackUp size={16} />} disabled={!lastUndo || undoBusy} onClick={undoLast} sx={{ whiteSpace: "nowrap" }}>
          Undo{undo.length > 1 ? ` (${undo.length})` : ""}
        </Button>
      </span>
    </Tooltip>
  );
  const badge = (content: React.ReactNode, tone: "primary" | "grey") => (
    <Box sx={{ minWidth: 34, height: 34, px: 1, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0, bgcolor: tone === "primary" ? "primary.main" : "#eef2f7", color: tone === "primary" ? "#fff" : "#5A6A85" }}>
      {content}
    </Box>
  );

  return (
    <TreeCtx.Provider value={ctx}>
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {/* header */}
        <Stack mx={2} mb={1.5} direction={{ xs: "column", md: "row" }} alignItems={{ md: "center" }} gap={1}>
          <Stack direction="row" alignItems="center" gap={1}>
            <IconButton onClick={onBack} aria-label="Back to templates"><IconArrowLeft size={20} /></IconButton>
            <Box>
              <Typography variant="h5">{t.name}</Typography>
              <Typography className="f-14" color="textSecondary">
                {plural(totals.rooms, "area")} · {plural(totals.groups, "group")} · {plural(totals.els, "element")}
                {t.source === "import" && t.source_file ? ` · imported from ${t.source_file}` : ""}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" gap={1} ml={{ md: "auto" }}>
            <Button variant="outlined" startIcon={<IconEdit size={16} />} onClick={() => setNameDlg({ kind: "rename-template" })}>Rename</Button>
            <Button variant="outlined" color="error" startIcon={<IconTrash size={16} />} onClick={() => setDel({ kind: "template" })}>Delete</Button>
          </Stack>
        </Stack>
        <Divider />

        {!t.rooms.length ? (
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, py: 6 }}>
            <Image src="/images/no-data.png" alt="No areas" width={150} height={150} />
            <Typography variant="h6">This template has no areas yet</Typography>
            <Typography className="f-14" color="textSecondary">Start with the first area, for example General or Kitchen.</Typography>
            <Button variant="contained" startIcon={<IconPlus size={18} />} sx={{ mt: 1 }} onClick={() => setNameDlg({ kind: "room" })}>Add area</Button>
          </Box>
        ) : (
          <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: { xs: "column", md: "row" } }}>
            {/* areas */}
            <Box sx={{ width: { md: 250 }, flexShrink: 0, borderRight: { md: 1 }, borderBottom: { xs: 1, md: 0 }, borderColor: "divider", p: 1, overflowY: "auto" }}>
              <Typography variant="subtitle2" color="textSecondary" sx={{ px: 1, py: 0.5 }}>Areas ({t.rooms.length})</Typography>
              {t.rooms.map((r) => {
                const active = r.id === roomId;
                return (
                  <Stack
                    key={r.id}
                    direction="row"
                    alignItems="center"
                    gap={1}
                    onClick={() => {
                      setRoomId(r.id);
                      setQ("");
                    }}
                    sx={{ px: 1, py: 0.7, borderRadius: 1, cursor: "pointer", bgcolor: active ? "#eaf5ff" : "transparent", color: active ? "#203040" : "#5A6A85", "&:hover": { bgcolor: active ? "#eaf5ff" : "#f6f7f7" } }}
                  >
                    <IconDoor size={17} />
                    <Typography className="f-14" sx={{ flex: 1 }} noWrap fontWeight={active ? 600 : 400}>{r.name}</Typography>
                    <PasteHere targetId={r.id} compact />
                    <Typography variant="caption" color="textSecondary">{countEls(r)}</Typography>
                  </Stack>
                );
              })}
              <Button fullWidth startIcon={<IconPlus size={16} />} sx={{ mt: 1, border: "1px dashed", borderColor: "divider" }} onClick={() => setNameDlg({ kind: "room" })}>
                Add area
              </Button>
            </Box>

            {/* selected area */}
            {room && (
              <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", position: "relative" }}>
                <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} gap={1} sx={{ px: 2, py: 1.5 }}>
                  <Box>
                    <Typography variant="h6">{room.name}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {plural(countGroups(room), "group")} · {plural(countEls(room), "element")}
                      {roomSkipped > 0 && (
                        <>
                          {" · "}
                          <Box component="span" sx={{ color: WARN_TEXT, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }} onClick={() => setElDlg({ nodeId: room.id, element: null })}>
                            {roomSkipped} skipped at import
                          </Box>
                        </>
                      )}
                    </Typography>
                  </Box>
                  <Stack direction="row" gap={1} ml={{ sm: "auto" }} flexWrap="wrap" alignItems="center">
                    <PasteHere targetId={room.id} />
                    <Button variant="outlined" startIcon={<IconFolderPlus size={16} />} onClick={() => setNameDlg({ kind: "group", parentId: room.id })}>Add group</Button>
                    <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={() => setAddDlg(room.id)}>Add element</Button>
                    <Tooltip title="Rename area"><IconButton color="primary" onClick={() => setNameDlg({ kind: "rename-node", node: room })}><IconEdit size={18} /></IconButton></Tooltip>
                    <Tooltip title="Delete area"><IconButton color="error" onClick={() => setDel({ kind: "node", node: room })}><IconTrash size={18} /></IconButton></Tooltip>
                  </Stack>
                </Stack>
                <Stack direction="row" alignItems="center" gap={1} sx={{ px: 2, pb: 1.5 }}>
                  <TextField
                    size="small"
                    placeholder={`Search in ${room.name}...`}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    sx={{ minWidth: { sm: 300 } }}
                    slotProps={{ input: { endAdornment: <InputAdornment position="end"><IconSearch size={16} /></InputAdornment> } }}
                  />
                  {allIds.length > 0 && (
                    <ButtonGroup size="small" variant="outlined" sx={{ ml: "auto", "& .MuiButton-root": { px: 1.5, whiteSpace: "nowrap" } }}>
                      <Button
                        startIcon={<IconChevronsDown size={16} />}
                        disabled={allIds.every((x) => !closed[x])}
                        onClick={() => setClosed((c) => ({ ...c, ...Object.fromEntries(allIds.map((x) => [x, false])) }))}
                      >
                        Expand all
                      </Button>
                      <Button
                        startIcon={<IconChevronsUp size={16} />}
                        disabled={allIds.every((x) => closed[x])}
                        onClick={() => setClosed((c) => ({ ...c, ...Object.fromEntries(allIds.map((x) => [x, true])) }))}
                      >
                        Collapse all
                      </Button>
                    </ButtonGroup>
                  )}
                </Stack>
                <Divider />
                <Stack direction="row" alignItems="center" gap={1} sx={{ pl: 1, pr: 1, py: 0.75, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}>
                  <Tooltip title={allShownSelected ? "Clear selection" : `Select all in ${room.name}`}>
                    <Checkbox
                      size="small"
                      sx={{ p: 0.25 }}
                      disabled={!shownEls.length}
                      checked={allShownSelected}
                      indeterminate={!allShownSelected && shownEls.some((x) => sel.has(x))}
                      onChange={() => setSel(allShownSelected ? new Set() : new Set(shownEls))}
                      slotProps={{ input: { "aria-label": `Select all in ${room.name}` } }}
                    />
                  </Tooltip>
                  <Typography variant="subtitle2" sx={{ flex: 1 }}>Element</Typography>
                  <Typography variant="subtitle2" sx={{ width: 110 }}>Code</Typography>
                  <Typography variant="subtitle2" sx={{ width: 60 }}>UOM</Typography>
                  <Typography variant="subtitle2" sx={{ width: 50, textAlign: "right" }}>Qty</Typography>
                  <Typography variant="subtitle2" sx={{ width: 120, textAlign: "right" }}>Rate</Typography>
                  <Box sx={{ width: 68 }} />
                </Stack>
                <Box sx={{ flex: 1, overflowY: "auto", pb: barMode ? 11 : 0 }}>
                  {room.elements.filter(match).map((e) => <ElementRow key={e.id} e={e} depth={0} />)}
                  {room.children.map((g) => <GroupBlock key={g.id} g={g} depth={0} />)}
                  {!room.elements.length && !room.children.length && (
                    <Box sx={{ textAlign: "center", py: 5 }}>
                      <Typography fontWeight={600}>Nothing in {room.name} yet.</Typography>
                      <Typography className="f-14" color="textSecondary">
                        Use <b>Add group</b> above for a group such as Floor, Window or Door, or <b>Add element</b> to add one directly to the area.
                      </Typography>
                    </Box>
                  )}
                  {query && !room.elements.some(match) && !room.children.some(visible) && (
                    <Typography className="f-14" color="textSecondary" sx={{ textAlign: "center", py: 4 }}>No element matches “{q.trim()}” in {room.name}.</Typography>
                  )}
                </Box>

                {/* action bar: selection, clipboard or the last change (Undo) */}
                {barMode && (
                  <Paper
                    elevation={0}
                    role="toolbar"
                    aria-label="Selected elements"
                    sx={{
                      position: "absolute",
                      left: 16,
                      right: 16,
                      bottom: 12,
                      px: 1.5,
                      py: 1,
                      borderRadius: 3,
                      border: 1,
                      borderColor: "divider",
                      bgcolor: "background.paper",
                      boxShadow: "0 10px 30px rgba(16,24,40,.14)",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      flexWrap: "wrap",
                    }}
                  >
                    {barMode === "sel" && (
                      <>
                        <Stack direction="row" alignItems="center" gap={1.25} sx={{ flex: 1, minWidth: 180 }}>
                          {badge(sel.size, "primary")}
                          <Box sx={{ minWidth: 0 }}>
                            <Typography className="f-14" fontWeight={700} lineHeight={1.3}>{sel.size === 1 ? "element selected" : "elements selected"}</Typography>
                            <Typography variant="caption" color="textSecondary" noWrap display="block">{preview(selNames)}</Typography>
                          </Box>
                        </Stack>
                        <Tooltip title="Copy (Ctrl/⌘ + C), then use Paste here on any group or area">
                          <Button size="small" variant="contained" startIcon={<IconCopy size={16} />} onClick={copySelected}>Copy</Button>
                        </Tooltip>
                        <Button size="small" variant="outlined" startIcon={<IconArrowsMove size={16} />} onClick={() => setMoveDlg({ elements: [...sel], nodes: [], label: plural(sel.size, "element") })}>
                          Move to…
                        </Button>
                        <Button size="small" variant="outlined" color="error" startIcon={<IconTrash size={16} />} onClick={() => setDel({ kind: "selected", ids: [...sel] })}>
                          Delete
                        </Button>
                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                        {undoButton}
                        <Tooltip title="Clear selection (Esc)"><IconButton size="small" onClick={() => setSel(new Set())} aria-label="Clear selection"><IconX size={18} /></IconButton></Tooltip>
                      </>
                    )}
                    {barMode === "clip" && clip && (
                      <>
                        <Stack direction="row" alignItems="center" gap={1.25} sx={{ flex: 1, minWidth: 200 }}>
                          {badge(<IconClipboard size={18} />, "primary")}
                          <Box sx={{ minWidth: 0 }}>
                            <Typography className="f-14" fontWeight={700} lineHeight={1.3}>{clip.label} copied</Typography>
                            <Typography variant="caption" color="textSecondary" noWrap display="block">
                              {clip.names.length ? `${preview(clip.names)} · ` : ""}use Paste here on any group or area
                            </Typography>
                          </Box>
                        </Stack>
                        <Button size="small" variant="contained" startIcon={<IconClipboard size={16} />} onClick={() => pasteInto(room.id)}>
                          Paste into {room.name}
                        </Button>
                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                        {undoButton}
                        <Tooltip title="Cancel copy (Esc)"><IconButton size="small" onClick={() => setClip(null)} aria-label="Cancel copy"><IconX size={18} /></IconButton></Tooltip>
                      </>
                    )}
                    {barMode === "undo" && lastUndo && (
                      <>
                        <Stack direction="row" alignItems="center" gap={1.25} sx={{ flex: 1, minWidth: 200 }}>
                          {badge(<IconHistory size={18} />, "grey")}
                          <Box sx={{ minWidth: 0 }}>
                            <Typography className="f-14" fontWeight={700} lineHeight={1.3}>Last change</Typography>
                            <Typography variant="caption" color="textSecondary" noWrap display="block">
                              {lastUndo.label.charAt(0).toUpperCase() + lastUndo.label.slice(1)}
                              {undo.length > 1 ? ` · ${undo.length} changes can be undone` : ""}
                            </Typography>
                          </Box>
                        </Stack>
                        {undoButton}
                        <Tooltip title="Hide"><IconButton size="small" onClick={() => setUndoHidden(true)} aria-label="Hide"><IconX size={18} /></IconButton></Tooltip>
                      </>
                    )}
                  </Paper>
                )}
              </Box>
            )}
          </Box>
        )}
      </Box>

      <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}>
        <MenuItem onClick={() => { if (menu) setNameDlg({ kind: "group", parentId: menu.node.id }); setMenu(null); }}>
          <ListItemIcon><IconFolderPlus size={18} /></ListItemIcon>Add sub-group
        </MenuItem>
        <MenuItem onClick={() => { if (menu) setNameDlg({ kind: "rename-node", node: menu.node }); setMenu(null); }}>
          <ListItemIcon><IconEdit size={18} /></ListItemIcon>Rename group
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menu) {
              setClip({ elements: [], nodes: [menu.node.id], label: `Group “${menu.node.name}”`, names: [] });
              toast.success(`Group “${menu.node.name}” copied. Use Paste here on any group or area.`);
            }
            setMenu(null);
          }}
        >
          <ListItemIcon><IconCopy size={18} /></ListItemIcon>Copy group
        </MenuItem>
        <MenuItem onClick={() => { if (menu) setMoveDlg({ elements: [], nodes: [menu.node.id], label: `group “${menu.node.name}”` }); setMenu(null); }}>
          <ListItemIcon><IconArrowsMove size={18} /></ListItemIcon>Move group to…
        </MenuItem>
        <Divider />
        <MenuItem sx={{ color: "#e53935" }} onClick={() => { if (menu) setDel({ kind: "node", node: menu.node }); setMenu(null); }}>
          <ListItemIcon sx={{ color: "#e53935" }}><IconTrash size={18} /></ListItemIcon>Delete group
        </MenuItem>
      </Menu>

      <NameDrawer
        open={!!nameDlg}
        title={nameDlg?.kind === "room" ? "Add area" : nameDlg?.kind === "group" ? "Add group" : nameDlg?.kind === "rename-template" ? "Rename template" : "Rename"}
        label={nameDlg?.kind === "rename-template" ? "Template name" : "Name"}
        placeholder={nameDlg?.kind === "room" ? "e.g. Bedroom 3" : nameDlg?.kind === "group" ? "e.g. Window" : undefined}
        hint={nameDlg?.kind === "group" ? "A group holds elements and can hold sub-groups." : undefined}
        initial={nameDlg?.kind === "rename-node" ? nameDlg.node?.name : nameDlg?.kind === "rename-template" ? t.name : ""}
        submitLabel={nameDlg?.kind === "room" ? "Add area" : nameDlg?.kind === "group" ? "Add group" : "Save"}
        onClose={() => setNameDlg(null)}
        onSave={saveName}
      />
      <MultiAddDialog
        open={addDlg !== null}
        template={t}
        nodeId={addDlg}
        sheets={sheets}
        onClose={() => setAddDlg(null)}
        onSaved={async (m, ids) => {
          toast.success(m);
          setAddDlg(null);
          if (ids.length) pushUndo(`add ${plural(ids.length, "element")}`, () => api.post(`survey-templates/${t.id}/elements/delete`, { ids }));
          await load();
        }}
        onMoreOptions={(nid) => {
          setAddDlg(null);
          setElDlg({ nodeId: nid, element: null });
        }}
      />
      <ElementDrawer
        open={!!elDlg}
        template={t}
        nodeId={elDlg?.nodeId ?? null}
        element={elDlg?.element ?? null}
        sheets={sheets}
        onClose={() => setElDlg(null)}
        onSaved={async (m) => {
          toast.success(m);
          setElDlg(null);
          await load();
        }}
        onSkippedChanged={load}
      />
      <AddToNhfDrawer
        open={!!nhfDlg}
        template={t}
        element={nhfDlg}
        sheets={sheets}
        onClose={() => setNhfDlg(null)}
        onSaved={async () => {
          setNhfDlg(null);
          await load();
        }}
      />
      <MoveToDialog open={!!moveDlg} template={t} label={moveDlg?.label ?? ""} groupIds={moveDlg?.nodes ?? []} onClose={() => setMoveDlg(null)} onMove={moveTo} />
      <ConfirmDialog
        open={!!del}
        title={del?.kind === "template" ? "Delete template" : "Delete"}
        confirmLabel="Delete"
        confirmColor="error"
        busy={busy}
        onClose={() => setDel(null)}
        onConfirm={doDelete}
        message={
          del?.kind === "template" ? (
            <>Delete the template <b>{t.name}</b> with {plural(totals.rooms, "area")} and {plural(totals.els, "element")}?</>
          ) : del?.kind === "node" ? (
            <>Delete <b>{del.node.name}</b> and everything inside it ({plural(countGroups(del.node), "group")}, {plural(countEls(del.node), "element")})? This cannot be undone.</>
          ) : del?.kind === "element" ? (
            <>Delete <b>{del.element.name}</b>? You can undo it from the bar at the bottom.</>
          ) : del?.kind === "selected" ? (
            <>Delete <b>{plural(del.ids.length, "element")}</b>? You can undo it from the bar at the bottom.</>
          ) : (
            ""
          )
        }
      />
    </TreeCtx.Provider>
  );
};

export default TemplateDetail;
