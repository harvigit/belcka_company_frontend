import React from 'react';
import { Stack, Box, Typography, MenuItem, IconButton } from '@mui/material';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import CustomSelect from '@/app/components/forms/theme-elements/CustomSelect';

interface TablePaginationFooterProps {
  table: any;
  totalRows: number;
}

export const TablePaginationFooter: React.FC<TablePaginationFooterProps> = ({ table, totalRows }) => {
  return (
    <Stack
      gap={1}
      pr={3}
      pt={1}
      pl={3}
      pb={2}
      alignItems="center"
      direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
    >
      <Box display="flex" alignItems="center" gap={1}>
        <Typography color="textSecondary" className="f-14">
          {totalRows} Rows
        </Typography>
      </Box>
      <Box
        sx={{
          display: {
            xs: "block",
            sm: "flex",
          },
        }}
        alignItems="center"
      >
        <Stack direction="row" alignItems="center">
          <Typography color="textSecondary" className="f-14">
            Page
          </Typography>
          <Typography
            color="textSecondary"
            className="f-14"
            fontWeight={600}
            ml={1}
          >
            {table.getState().pagination.pageIndex + 1} of{" "}
            {Math.max(1, table.getPageCount())}
          </Typography>
          <Typography color="textSecondary" ml="3px" className="f-14">
            {" "}
            | Entries :{" "}
          </Typography>
        </Stack>
        <Stack
          ml="5px"
          direction="row"
          alignItems="center"
          color="textSecondary"
        >
          <CustomSelect
            value={table.getState().pagination.pageSize}
            onChange={(e: { target: { value: any } }) =>
              table.setPageSize(Number(e.target.value))
            }
          >
            {[50, 100, 250, 500].map((size) => (
              <MenuItem key={size} value={size}>
                {size}
              </MenuItem>
            ))}
          </CustomSelect>
          <IconButton
            size="small"
            sx={{ width: "30px" }}
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <IconChevronLeft />
          </IconButton>
          <IconButton
            size="small"
            sx={{ width: "30px" }}
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <IconChevronRight />
          </IconButton>
        </Stack>
      </Box>
    </Stack>
  );
};

export default TablePaginationFooter;
