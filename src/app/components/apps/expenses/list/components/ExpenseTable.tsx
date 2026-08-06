"use client";

import React from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import Image from "next/image";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import { ExpenseListItem } from "../types";
import ExpenseRow from "./ExpenseRow";

type SortDir = false | "asc" | "desc";

type Props = {
  expenses: ExpenseListItem[];
  selectedIds: Set<number>;
  isSelectAll: boolean;
  loading?: boolean;
  skeletonColumns?: { name: string; width: string }[];
  dateSort?: SortDir;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onToggleDateSort?: () => void;
  onViewReceipt?: (id: number) => void;
  onOpenDetails?: (expense: ExpenseListItem) => void;
  columnVisibility?: Record<string, boolean>;
};

const isVisible = (
  columnVisibility: Record<string, boolean> | undefined,
  id: string,
) => columnVisibility?.[id] !== false;

const ExpenseTable = ({
  expenses,
  selectedIds,
  isSelectAll,
  loading = false,
  skeletonColumns,
  dateSort,
  onToggleSelect,
  onToggleSelectAll,
  onToggleDateSort,
  onViewReceipt,
  onOpenDetails,
  columnVisibility,
}: Props) => {
  const allSelected =
    isSelectAll ||
    (expenses.length > 0 && expenses.every((e) => selectedIds.has(e.id)));
  const someSelected =
    !isSelectAll &&
    expenses.some((e) => selectedIds.has(e.id)) &&
    !allSelected;

  const visibleColCount =
    1 +
    [
      "date",
      "submitted_by",
      "project",
      "category",
      "description",
      "amount",
      "receipt",
      "status",
      "actions",
    ].filter((id) => isVisible(columnVisibility, id)).length;

  const renderHeaderCell = (
    id: string,
    label: string,
    opts?: { sortable?: boolean; align?: "left" | "right" },
  ) => {
    if (!isVisible(columnVisibility, id)) return null;

    const isSortable = Boolean(opts?.sortable);
    const isActive = isSortable && Boolean(dateSort);
    const isAsc = dateSort === "asc";

    return (
      <TableCell
        key={id}
        align={opts?.align}
        sx={{
          paddingTop: "10px",
          paddingBottom: "10px",
          whiteSpace: "nowrap",
          bgcolor: "background.paper",
        }}
      >
        <Box
          onClick={isSortable ? onToggleDateSort : undefined}
          sx={{
            cursor: isSortable ? "pointer" : "default",
            border: "2px solid transparent",
            borderRadius: "6px",
            display: "flex",
            justifyContent: opts?.align === "right" ? "flex-end" : "flex-start",
            alignItems: "center",
            "&:hover": isSortable ? { color: "#888" } : undefined,
            "&:hover .hoverIcon": { opacity: 1 },
          }}
        >
          <Typography variant="subtitle2">{label}</Typography>
          {isSortable && (
            <Box
              component="span"
              className="hoverIcon"
              ml={0.5}
              sx={{
                transition: "opacity 0.2s",
                opacity: isActive ? 1 : 0,
                fontSize: "0.9rem",
                color: isActive ? "#000" : "#888",
                display: "flex",
                alignItems: "center",
              }}
            >
              {isActive ? (isAsc ? "↑" : "↓") : "↑"}
            </Box>
          )}
        </Box>
      </TableCell>
    );
  };

  return (
    <TableContainer
      sx={{
        flex: 1,
        minHeight: 0,
        overflowX: "auto",
        overflowY: "auto",
      }}
    >
      <Table stickyHeader aria-label="expenses sticky table">
        <TableHead>
          <TableRow>
            <TableCell
              padding="checkbox"
              sx={{
                paddingTop: "10px",
                paddingBottom: "10px",
                bgcolor: "background.paper",
              }}
            >
              <CustomCheckbox
                className="header-checkbox"
                checked={allSelected}
                indeterminate={someSelected}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onToggleSelectAll(e.target.checked)
                }
                disabled={expenses.length === 0 && !isSelectAll}
              />
            </TableCell>
            {renderHeaderCell("date", "Date", { sortable: true })}
            {renderHeaderCell("submitted_by", "Submitted By")}
            {renderHeaderCell("project", "Project")}
            {renderHeaderCell("category", "Category")}
            {renderHeaderCell("description", "Description")}
            {renderHeaderCell("amount", "Amount")}
            {renderHeaderCell("receipt", "Receipt")}
            {renderHeaderCell("status", "Status")}
            {renderHeaderCell("actions", "Actions", { align: "right" })}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <SkeletonLoader
              rowCount={8}
              columns={
                skeletonColumns ||
                Array.from({ length: visibleColCount }).map((_, i) => ({
                  name: `col-${i}`,
                }))
              }
            />
          ) : expenses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={visibleColCount}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "calc(50vh - 100px)",
                  }}
                >
                  <Image
                    src="/images/no-data.png"
                    alt="No data"
                    style={{ maxWidth: "100%", maxHeight: "100%" }}
                    width={200}
                    height={200}
                  />
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            expenses.map((expense) => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                selected={isSelectAll || selectedIds.has(expense.id)}
                onToggleSelect={onToggleSelect}
                onViewReceipt={onViewReceipt}
                onOpenDetails={onOpenDetails}
                columnVisibility={columnVisibility}
              />
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ExpenseTable;
