import React from "react";
import {
  Box,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { IconStarFilled } from "@tabler/icons-react";
import { money, qty } from "./useInventoryOptions";

const headCell = { fontWeight: 600, py: 1, whiteSpace: "nowrap" } as const;

interface LinkedSupplierItemsTableProps {
  items: any[];
  unit: string;
  showStatus?: boolean;
}

// Supplier items linked to one internal item: used in the expanded row and the details drawer.
const LinkedSupplierItemsTable: React.FC<LinkedSupplierItemsTableProps> = ({
  items,
  unit,
  showStatus = false,
}) => (
  <TableContainer
    sx={{
      border: "1px solid #eef2f7",
      borderRadius: 1,
      backgroundColor: "background.paper",
    }}
  >
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={headCell}>Supplier</TableCell>
          <TableCell sx={headCell}>Supplier Code</TableCell>
          <TableCell sx={headCell}>Pack</TableCell>
          <TableCell sx={headCell}>Pack Price</TableCell>
          <TableCell sx={headCell}>Per {unit}</TableCell>
          <TableCell sx={headCell}>Lead Time</TableCell>
          {showStatus && <TableCell sx={headCell}>Status</TableCell>}
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((s) => (
          <TableRow key={s.id} sx={{ opacity: s.status ? 1 : 0.55 }}>
            <TableCell>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography variant="body2">
                  {s.supplier_name ?? "-"}
                </Typography>
                {s.is_preferred && (
                  <Tooltip title="Preferred supplier">
                    <Box
                      component="span"
                      sx={{ color: "warning.main", display: "flex" }}
                    >
                      <IconStarFilled size={14} />
                    </Box>
                  </Tooltip>
                )}
              </Stack>
              <Typography variant="caption" color="textSecondary">
                {s.name}
              </Typography>
            </TableCell>
            <TableCell>
              <Typography variant="body2">{s.supplier_code}</Typography>
            </TableCell>
            <TableCell>
              <Typography variant="body2">
                {s.is_pack === false
                  ? "Single unit"
                  : `${qty(s.pack_qty)} ${s.pack_unit_name ?? ""}`}
              </Typography>
            </TableCell>
            <TableCell>
              <Typography variant="body2">{money(s.pack_price)}</Typography>
            </TableCell>
            <TableCell>
              <Typography variant="body2">
                {s.unit_price === null
                  ? "-"
                  : `£${Number(s.unit_price).toFixed(4)}`}
              </Typography>
            </TableCell>
            <TableCell>
              <Typography variant="body2">
                {s.lead_time_days === null ? "-" : `${s.lead_time_days} days`}
              </Typography>
            </TableCell>
            {showStatus && (
              <TableCell>
                <Typography
                  variant="body2"
                  color={s.status ? "success.main" : "textSecondary"}
                  fontWeight={500}
                >
                  {s.status ? "Active" : "Inactive"}
                </Typography>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

export default LinkedSupplierItemsTable;
