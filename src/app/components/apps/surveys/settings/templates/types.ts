// Survey › Settings › Templates: shared types and helpers.

export type TemplateRow = {
  id: number;
  name: string;
  source: "manual" | "import";
  source_file: string | null;
  updated_at: string;
  rooms: number;
  groups: number;
  elements: number;
  not_in_nhf: number;
  skipped: number;
};

export type TplElement = {
  id: number;
  node_id: number;
  name: string;
  code: string | null;
  uom: string | null;
  description: string | null;
  custom_rate: number | null;
  default_qty: number | null;
  vo_main: "Main" | "VO";
  comment: string | null;
  nhf: { found: true; sheet_id: number; sheet_name: string; rate: number | null; short_name: string | null; uom: string | null } | { found: false } | null;
  rate: number | null;
};

export type TplNode = {
  id: number;
  kind: "room" | "group";
  name: string;
  elements: TplElement[];
  children: TplNode[];
};

export type TplSkipped = {
  id: number;
  room_name: string;
  path: string | null;
  name: string;
  code: string | null;
  uom: string | null;
  qty: number | null;
  vo_main: "Main" | "VO";
  comment: string | null;
  in_nhf: boolean;
};

export type TemplateDetail = {
  id: number;
  name: string;
  source: "manual" | "import";
  source_file: string | null;
  updated_at: string;
  rooms: TplNode[];
  skipped: TplSkipped[];
};

export type NhfHit = {
  code: string;
  short_name: string | null;
  element_1: string | null;
  uom: string | null;
  rate: number | null;
  sheet_id: number;
  sheet_name: string;
};

export const countEls = (n: TplNode): number => n.elements.length + n.children.reduce((a, c) => a + countEls(c), 0);
export const countGroups = (n: TplNode): number => n.children.reduce((a, c) => a + 1 + countGroups(c), 0);
export const plural = (n: number, word: string) => `${n.toLocaleString("en-GB")} ${word}${n === 1 ? "" : "s"}`;

/** Path of a node from its room, e.g. ["General", "Common"]. */
export function pathOf(rooms: TplNode[], id: number): TplNode[] {
  const walk = (list: TplNode[], acc: TplNode[]): TplNode[] | null => {
    for (const n of list) {
      if (n.id === id) return [...acc, n];
      const hit = walk(n.children, [...acc, n]);
      if (hit) return hit;
    }
    return null;
  };
  return walk(rooms, []) ?? [];
}
