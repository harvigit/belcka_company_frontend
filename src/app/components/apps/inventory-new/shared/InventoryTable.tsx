"use client";
import React from "react";
import {
  Box,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import Image from "next/image";
import { flexRender } from "@/utils/flexRender";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import { ROW_CHECKBOX_CLASS } from "./selectColumn";

interface InventoryTableProps {
  table: any;
  loading: boolean;
  rowCount: number;
  // Optional content shown under a row (e.g. linked supplier items); null keeps the row closed.
  renderExpanded?: (row: any) => React.ReactNode | null;
}

const stickyActions = (isScrollable: boolean, zIndex: number) => ({
  position: "sticky",
  right: 0,
  backgroundColor: "background.paper",
  zIndex,
  boxShadow: isScrollable ? "-2px 0 4px -2px rgba(0,0,0,0.1)" : "none",
});

// Table body shared by the Inventory New lists (same look as the other inventory lists).
const InventoryTable: React.FC<InventoryTableProps> = ({
  table,
  loading,
  rowCount,
  renderExpanded,
}) => {
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = React.useState(false);

  React.useEffect(() => {
    const checkScroll = () => {
      if (tableContainerRef.current) {
        setIsScrollable(
          tableContainerRef.current.scrollWidth >
            tableContainerRef.current.clientWidth,
        );
      }
    };
    checkScroll();
    window.addEventListener("resize", checkScroll);
    const observer = new MutationObserver(checkScroll);
    if (tableContainerRef.current) {
      observer.observe(tableContainerRef.current, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
    return () => {
      window.removeEventListener("resize", checkScroll);
      observer.disconnect();
    };
  }, []);

  const leafColumns = table.getVisibleLeafColumns();
  const simpleColumns = leafColumns.map((column: any) => ({
    name: column.id,
    width: "auto",
  }));

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
      <TableContainer ref={tableContainerRef}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            {table.getHeaderGroups().map((headerGroup: any) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header: any) => {
                  const isActive = header.column.getIsSorted();
                  const isAsc = header.column.getIsSorted() === "asc";
                  const isSortable = header.column.getCanSort();

                  return (
                    <TableCell
                      key={header.id}
                      align="center"
                      sx={{
                        paddingTop: "10px",
                        paddingBottom: "10px",
                        whiteSpace: "nowrap",
                        width:
                          header.column.id === "actions"
                            ? 120
                            : header.column.id === "select"
                              ? 30
                              : "auto",
                        ...(header.column.id === "actions" &&
                          stickyActions(isScrollable, 3)),
                      }}
                    >
                      <Box
                        onClick={header.column.getToggleSortingHandler()}
                        p={0}
                        sx={{
                          cursor: isSortable ? "pointer" : "default",
                          border: "2px solid transparent",
                          borderRadius: "6px",
                          display: "flex",
                          justifyContent: "flex-start",
                          "&:hover": { color: "#888" },
                          "&:hover .hoverIcon": { opacity: 1 },
                        }}
                      >
                        <Typography variant="subtitle2">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        </Typography>
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
                })}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {loading ? (
              <SkeletonLoader columns={simpleColumns} rowCount={10} />
            ) : rowCount === 0 ? (
              <TableRow>
                <TableCell colSpan={leafColumns.length}>
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
              table.getRowModel().rows.map((row: any) => {
                const expanded = renderExpanded ? renderExpanded(row) : null;
                return (
                  <React.Fragment key={row.id}>
                    <TableRow
                      hover
                      sx={{
                        cursor: "pointer",
                        [`&:hover .${ROW_CHECKBOX_CLASS}, &:focus-within .${ROW_CHECKBOX_CLASS}`]:
                          { opacity: 1, pointerEvents: "auto" },
                        ...(expanded && { "& > td": { borderBottom: "none" } }),
                      }}
                    >
                      {row.getVisibleCells().map((cell: any) => (
                        <TableCell
                          key={cell.id}
                          sx={{
                            padding: "10px",
                            ...(cell.column.id === "actions" &&
                              stickyActions(isScrollable, 1)),
                          }}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                    {expanded && (
                      <TableRow>
                        <TableCell
                          colSpan={row.getVisibleCells().length}
                          sx={{
                            py: 1.5,
                            pl: 9,
                            pr: 2,
                            backgroundColor: "#f8fafc",
                          }}
                        >
                          {expanded}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {rowCount ? <Divider /> : <></>}
    </Box>
  );
};

export default InventoryTable;
