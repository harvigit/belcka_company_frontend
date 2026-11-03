import React from "react";
import { Stack } from "@mui/material";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";

// Class InventoryTable uses to show a row's checkbox while the row is hovered.
export const ROW_CHECKBOX_CLASS = "row-select-checkbox";

// Checkbox column used for bulk actions (remove, approve, reject) on the Inventory New lists.
// The header checkbox only looks at, and only selects or clears, the rows on the current page.
export function selectColumn(
  data: { id: number }[],
  selected: Set<number>,
  setSelected: (ids: Set<number>) => void,
) {
  const pageIds = data.map((d) => d.id);
  const selectedOnPage = pageIds.filter((id) => selected.has(id)).length;
  const allSelected = pageIds.length > 0 && selectedOnPage === pageIds.length;

  return {
    id: "select",
    header: () => (
      <Stack direction="row" alignItems="center">
        <CustomCheckbox
          className="header-checkbox"
          checked={allSelected}
          indeterminate={selectedOnPage > 0 && !allSelected}
          disabled={pageIds.length === 0}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const next = new Set(selected);
            pageIds.forEach((id) =>
              e.target.checked ? next.add(id) : next.delete(id),
            );
            setSelected(next);
          }}
        />
      </Stack>
    ),
    cell: ({ row }: any) => {
      const id = row.original.id as number;
      const isChecked = selected.has(id);
      return (
        <Stack direction="row" alignItems="center" sx={{ pl: 1 }}>
          <CustomCheckbox
            className={ROW_CHECKBOX_CLASS}
            checked={isChecked}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            onChange={() => {
              const next = new Set(selected);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              setSelected(next);
            }}
            sx={{
              opacity: isChecked ? 1 : 0,
              pointerEvents: isChecked ? "auto" : "none",
              transition: "opacity 0.2s ease",
            }}
          />
        </Stack>
      );
    },
  };
}

// Keeps only the selected ids that are still in the newly loaded rows.
export const keepVisibleSelection =
  (rows: { id: number }[]) => (prev: Set<number>) => {
    const ids = new Set(rows.map((r) => r.id));
    const next = new Set([...prev].filter((id) => ids.has(id)));
    return next.size === prev.size ? prev : next;
  };
