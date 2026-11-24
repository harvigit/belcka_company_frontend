"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  InputAdornment,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  ButtonGroup,
} from "@mui/material";
import {
  IconArrowLeft,
  IconChevronDown,
  IconChevronRight,
  IconDoor,
  IconDotsVertical,
  IconEdit,
  IconFolder,
  IconFolderPlus,
  IconPlus,
  IconSearch,
  IconTrash,
  IconChevronsDown,
  IconChevronsUp,
} from "@tabler/icons-react";
import Image from "next/image";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import ConfirmDialog from "@/app/components/apps/inventory-new/shared/ConfirmDialog";
import { NhfSheet, apiMessage, money, uomLabel } from "../nhf-rates/types";
import { AddToNhfDrawer, ElementDrawer, NameDrawer } from "./drawers";
import { TemplateDetail as Detail, TplElement, TplNode, countEls, countGroups, plural } from "./types";

type NameDlg = { kind: "room" | "group" | "rename-node" | "rename-template"; parentId?: number; node?: TplNode } | null;
type DelDlg = { kind: "node"; node: TplNode } | { kind: "element"; element: TplElement } | { kind: "template" } | null;

// One template: rooms on the left, the selected room's groups and elements on the right.
const TemplateDetail: React.FC<{ id: number; onBack: () => void }> = ({ id, onBack }) => {
  const [t, setT] = useState<Detail | null>(null);
  const [sheets, setSheets] = useState<NhfSheet[]>([]);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [closed, setClosed] = useState<Record<number, boolean>>({});
  const [q, setQ] = useState("");
  const [nameDlg, setNameDlg] = useState<NameDlg>(null);
  const [elDlg, setElDlg] = useState<{ nodeId: number | null; element: TplElement | null } | null>(null);
  const [nhfDlg, setNhfDlg] = useState<TplElement | null>(null);
  const [del, setDel] = useState<DelDlg>(null);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; node: TplNode } | null>(null);

  const load = useCallback(async () => {
    try {
      const [res, sh] = await Promise.all([api.get(`survey-templates/${id}`), api.get("nhf-rates/sheets")]);
      const d: Detail = res.data.data;
      setT(d);
      setSheets((sh.data.data as NhfSheet[]).filter((s) => s.current_version));
      setRoomId((cur) => (cur && d.rooms.some((r) => r.id === cur) ? cur : d.rooms[0]?.id ?? null));
    } catch (e) {
      toast.error(apiMessage(e, "Could not load the template."));
      onBack();
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
      else if (del.kind === "element") res = await api.delete(`survey-templates/elements/${del.element.id}`);
      else res = await api.delete(`survey-templates/${t.id}`);
      toast.success(res.data.message);
      setDel(null);
      if (del.kind === "template") onBack();
      else await load();
    } catch (e) {
      toast.error(apiMessage(e, "Could not delete."));
    }
    setBusy(false);
  };

  // search inside the room: keep matching elements (and the groups that hold them)
  const query = q.trim().toLowerCase();
  const match = (e: TplElement) => !query || e.name.toLowerCase().includes(query) || (e.code ?? "").toLowerCase().includes(query) || (e.description ?? "").toLowerCase().includes(query);
  const visible = (n: TplNode): boolean => n.elements.some(match) || n.children.some(visible);

  const elementRow = (e: TplElement, depth: number) => {
    const notInNhf = e.nhf && !e.nhf.found;
    return (
      <Stack key={e.id} direction="row" alignItems="center" gap={1.5} sx={{ pl: 2 + depth * 2.5, pr: 1, py: 1, borderBottom: 1, borderColor: "divider", "&:hover": { bgcolor: "#f8fafc" }, "&:hover .row-acts": { opacity: 1 } }}>
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
              <Button size="small" color="warning" variant="outlined" onClick={() => setNhfDlg(e)}>Add to NHF</Button>
            </Tooltip>
          ) : (
            <Tooltip title={e.nhf && e.nhf.found ? `Base rate from ${e.nhf.sheet_name}` : "Rate kept on this element"}>
              <Typography className="f-14" fontWeight={600}>{money(e.rate)}</Typography>
            </Tooltip>
          )}
        </Box>
        <Stack direction="row" className="row-acts" sx={{ opacity: 0.35, transition: "opacity .15s" }}>
          <Tooltip title="Edit"><IconButton size="small" color="primary" onClick={() => setElDlg({ nodeId: e.node_id, element: e })}><IconEdit size={17} /></IconButton></Tooltip>
          <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDel({ kind: "element", element: e })}><IconTrash size={17} /></IconButton></Tooltip>
        </Stack>
      </Stack>
    );
  };

  const groupBlock = (g: TplNode, depth: number): React.ReactNode => {
    if (query && !visible(g)) return null;
    const isClosed = closed[g.id] && !query;
    return (
      <Box key={g.id}>
        <Stack direction="row" alignItems="center" gap={1} sx={{ pl: 1 + depth * 2.5, pr: 1, py: 0.75, bgcolor: "#f8fafc", borderBottom: 1, borderColor: "divider" }}>
          <IconButton size="small" onClick={() => setClosed((c) => ({ ...c, [g.id]: !c[g.id] }))}>
            {isClosed ? <IconChevronRight size={16} /> : <IconChevronDown size={16} />}
          </IconButton>
          <IconFolder size={16} color="#7D92A9" />
          <Typography className="f-14" fontWeight={600} sx={{ flex: 1 }}>{g.name}</Typography>
          <Typography variant="caption" color="textSecondary">{plural(countEls(g), "element")}</Typography>
          <Tooltip title="Add element here"><IconButton size="small" color="primary" onClick={() => setElDlg({ nodeId: g.id, element: null })}><IconPlus size={17} /></IconButton></Tooltip>
          <IconButton size="small" onClick={(e) => setMenu({ anchor: e.currentTarget, node: g })}><IconDotsVertical size={17} /></IconButton>
        </Stack>
        <Collapse in={!isClosed} unmountOnExit>
          {g.elements.filter(match).map((e) => elementRow(e, depth + 1))}
          {g.children.map((c) => groupBlock(c, depth + 1))}
          {!g.elements.length && !g.children.length && (
            <Typography variant="caption" color="textSecondary" display="block" sx={{ pl: 4 + depth * 2.5, py: 1, borderBottom: 1, borderColor: "divider" }}>
              No elements yet.
            </Typography>
          )}
        </Collapse>
      </Box>
    );
  };

  if (!t || !totals) {
    return <Box textAlign="center" py={6}><CircularProgress size={28} /></Box>;
  }

  const allIds: number[] = [];
  const collect = (n: TplNode) => n.children.forEach((c) => { allIds.push(c.id); collect(c); });
  if (room) collect(room);

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* header */}
      <Stack mx={2} mb={1.5} direction={{ xs: "column", md: "row" }} alignItems={{ md: "center" }} gap={1}>
        <Stack direction="row" alignItems="center" gap={1}>
          <IconButton onClick={onBack} aria-label="Back to templates"><IconArrowLeft size={20} /></IconButton>
          <Box>
            <Typography variant="h5">{t.name}</Typography>
            <Typography className="f-14" color="textSecondary">
              {plural(totals.rooms, "room")} · {plural(totals.groups, "group")} · {plural(totals.els, "element")}
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
          <Image src="/images/no-data.png" alt="No rooms" width={150} height={150} />
          <Typography variant="h6">This template has no rooms yet</Typography>
          <Typography className="f-14" color="textSecondary">Start with the first room, for example General or Kitchen.</Typography>
          <Button variant="contained" startIcon={<IconPlus size={18} />} sx={{ mt: 1 }} onClick={() => setNameDlg({ kind: "room" })}>Add room</Button>
        </Box>
      ) : (
        <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: { xs: "column", md: "row" } }}>
          {/* rooms */}
          <Box sx={{ width: { md: 240 }, flexShrink: 0, borderRight: { md: 1 }, borderBottom: { xs: 1, md: 0 }, borderColor: "divider", p: 1, overflowY: "auto" }}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ px: 1, py: 0.5 }}>Rooms ({t.rooms.length})</Typography>
            {t.rooms.map((r) => (
              <Stack
                key={r.id}
                direction="row"
                alignItems="center"
                gap={1}
                onClick={() => {
                  setRoomId(r.id);
                  setQ("");
                }}
                sx={{ px: 1, py: 0.85, borderRadius: 1, cursor: "pointer", bgcolor: r.id === roomId ? "#eaf5ff" : "transparent", color: r.id === roomId ? "#203040" : "#5A6A85", "&:hover": { bgcolor: r.id === roomId ? "#eaf5ff" : "#f6f7f7" } }}
              >
                <IconDoor size={17} />
                <Typography className="f-14" sx={{ flex: 1 }} noWrap fontWeight={r.id === roomId ? 600 : 400}>{r.name}</Typography>
                <Typography variant="caption" color="textSecondary">{countEls(r)}</Typography>
              </Stack>
            ))}
            <Button fullWidth startIcon={<IconPlus size={16} />} sx={{ mt: 1, border: "1px dashed", borderColor: "divider" }} onClick={() => setNameDlg({ kind: "room" })}>
              Add room
            </Button>
          </Box>

          {/* selected room */}
          {room && (
            <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
              <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} gap={1} sx={{ px: 2, py: 1.5 }}>
                <Box>
                  <Typography variant="h6">{room.name}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {plural(countGroups(room), "group")} · {plural(countEls(room), "element")}
                    {roomSkipped > 0 && (
                      <>
                        {" · "}
                        <Box component="span" sx={{ color: "warning.main", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }} onClick={() => setElDlg({ nodeId: room.id, element: null })}>
                          {roomSkipped} skipped at import
                        </Box>
                      </>
                    )}
                  </Typography>
                </Box>
                <Stack direction="row" gap={1} ml={{ sm: "auto" }} flexWrap="wrap">
                  <Button variant="outlined" startIcon={<IconFolderPlus size={16} />} onClick={() => setNameDlg({ kind: "group", parentId: room.id })}>Add group</Button>
                  <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={() => setElDlg({ nodeId: room.id, element: null })}>Add element</Button>
                  <IconButton onClick={(e) => setMenu({ anchor: e.currentTarget, node: room })}><IconDotsVertical size={18} /></IconButton>
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
              <Stack direction="row" gap={1.5} sx={{ pl: 2, pr: 1, py: 1, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}>
                <Typography variant="subtitle2" sx={{ flex: 1 }}>Element</Typography>
                <Typography variant="subtitle2" sx={{ width: 110 }}>Code</Typography>
                <Typography variant="subtitle2" sx={{ width: 60 }}>UOM</Typography>
                <Typography variant="subtitle2" sx={{ width: 50, textAlign: "right" }}>Qty</Typography>
                <Typography variant="subtitle2" sx={{ width: 120, textAlign: "right" }}>Rate</Typography>
                <Box sx={{ width: 68 }} />
              </Stack>
              <Box sx={{ flex: 1, overflowY: "auto" }}>
                {room.elements.filter(match).map((e) => elementRow(e, 0))}
                {room.children.map((g) => groupBlock(g, 0))}
                {!room.elements.length && !room.children.length && (
                  <Box sx={{ textAlign: "center", py: 5 }}>
                    <Typography fontWeight={600}>Nothing in {room.name} yet.</Typography>
                    <Typography className="f-14" color="textSecondary" mb={1.5}>Add a group such as Floor, Window or Door, or add an element directly to the room.</Typography>
                    <Stack direction="row" gap={1} justifyContent="center">
                      <Button variant="outlined" onClick={() => setNameDlg({ kind: "group", parentId: room.id })}>Add group</Button>
                      <Button variant="contained" onClick={() => setElDlg({ nodeId: room.id, element: null })}>Add element</Button>
                    </Stack>
                  </Box>
                )}
                {query && !room.elements.some(match) && !room.children.some(visible) && (
                  <Typography className="f-14" color="textSecondary" sx={{ textAlign: "center", py: 4 }}>No element matches “{q.trim()}” in {room.name}.</Typography>
                )}
              </Box>
            </Box>
          )}
        </Box>
      )}

      <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}>
        {menu?.node.kind === "group" && (
          <MenuItem onClick={() => { setElDlg({ nodeId: menu.node.id, element: null }); setMenu(null); }}>
            <ListItemIcon><IconPlus size={18} /></ListItemIcon>Add element
          </MenuItem>
        )}
        <MenuItem onClick={() => { if (menu) setNameDlg({ kind: "group", parentId: menu.node.id }); setMenu(null); }}>
          <ListItemIcon><IconFolderPlus size={18} /></ListItemIcon>{menu?.node.kind === "room" ? "Add group" : "Add sub-group"}
        </MenuItem>
        <MenuItem onClick={() => { if (menu) setNameDlg({ kind: "rename-node", node: menu.node }); setMenu(null); }}>
          <ListItemIcon><IconEdit size={18} /></ListItemIcon>Rename
        </MenuItem>
        <Divider />
        <MenuItem sx={{ color: "#e53935" }} onClick={() => { if (menu) setDel({ kind: "node", node: menu.node }); setMenu(null); }}>
          <ListItemIcon sx={{ color: "#e53935" }}><IconTrash size={18} /></ListItemIcon>Delete {menu?.node.kind === "room" ? "room" : "group"}
        </MenuItem>
      </Menu>

      <NameDrawer
        open={!!nameDlg}
        title={
          nameDlg?.kind === "room" ? "Add room" : nameDlg?.kind === "group" ? "Add group" : nameDlg?.kind === "rename-template" ? "Rename template" : "Rename"
        }
        label={nameDlg?.kind === "rename-template" ? "Template name" : "Name"}
        placeholder={nameDlg?.kind === "room" ? "e.g. Bedroom 3" : nameDlg?.kind === "group" ? "e.g. Window" : undefined}
        hint={nameDlg?.kind === "group" ? "A group holds elements and can hold sub-groups." : undefined}
        initial={nameDlg?.kind === "rename-node" ? nameDlg.node?.name : nameDlg?.kind === "rename-template" ? t.name : ""}
        submitLabel={nameDlg?.kind === "room" ? "Add room" : nameDlg?.kind === "group" ? "Add group" : "Save"}
        onClose={() => setNameDlg(null)}
        onSave={saveName}
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
            <>Delete the template <b>{t.name}</b> with {plural(totals.rooms, "room")} and {plural(totals.els, "element")}?</>
          ) : del?.kind === "node" ? (
            <>Delete <b>{del.node.name}</b> and everything inside it ({plural(countGroups(del.node), "group")}, {plural(countEls(del.node), "element")})?</>
          ) : del?.kind === "element" ? (
            <>Delete <b>{del.element.name}</b>?</>
          ) : (
            ""
          )
        }
      />
    </Box>
  );
};

export default TemplateDetail;
