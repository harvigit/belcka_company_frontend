import React from "react";
import { Box, Skeleton, TableRow, TableCell } from "@mui/material";

interface Column {
  name: string;
}

interface SkeletonLoaderProps {
  columns: Column[];
  rowCount: number;
  hasAvatar?: boolean;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  columns,
  rowCount,
  hasAvatar = false,
}) => {
  return (
    <>
      {[...Array(rowCount)].map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {columns.map((column, colIndex) => (
            <TableCell key={colIndex} sx={{ padding: "13px" }}>
              {colIndex === 0 && hasAvatar ? (
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Skeleton
                    variant="circular"
                    width={30}
                    height={25}
                    sx={{
                      marginRight: 2,
                      border: "1px solid #fff",
                      borderRadius: "50%",
                    }}
                  />
                  <Skeleton
                    variant="rectangular"
                    width="100%"
                    height={50}
                    sx={{ borderRadius: 1 }}
                  />
                </Box>
              ) : (
                <Skeleton
                  variant="rectangular"
                  width="100%"
                  height={20}
                  sx={{ borderRadius: 1 }}
                />
              )}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
};

export default SkeletonLoader;
