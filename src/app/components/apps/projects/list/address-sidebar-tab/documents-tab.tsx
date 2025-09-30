"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import { Stack } from "@mui/system";
import { IconFilter, IconSearch, IconDownload } from "@tabler/icons-react";
import api from "@/utils/axios";

interface DocumentsTabProps {
  addressId: number;
  projectId: number;
  companyId: number;
}

export const DocumentsTab = ({ addressId, projectId,companyId }: DocumentsTabProps) => {
  const [tabData, setTabData] = useState<any[]>([]);
  const [searchUser, setSearchUser] = useState<string>("");

  const fetchDocumentTabData = async () => {
    try {
      const res = await api.get(
        `address/address-document?address_id=${addressId}&company_id=${companyId}`
      );
      if (res.data?.IsSuccess) {
        setTabData(res.data.info || []);
      } else {
        setTabData([]);
      }
    } catch {
      setTabData([]);
    }
  };

  useEffect(() => {
    if (addressId) {
      fetchDocumentTabData();
    }
  }, [addressId, projectId]);

  const handleDownloadZip = async (addressId: number, taskId: number) => {
    try {
      const response = await api.get(
        `address/download-tasks-zip/${addressId}?taskId=${taskId}`,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `tasks_address_${addressId}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Download failed", error);
    }
  };

  const filteredData = useMemo(() => {
    const search = searchUser.trim().toLowerCase();
    if (!search) return tabData;
    return tabData.filter(
      (item) =>
        item.title?.toLowerCase().includes(search) ||
        item.created_at?.toLowerCase().includes(search)
    );
  }, [searchUser, tabData]);
  return (
    <Box>
      {/* Search + Filter */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
      >
        <TextField
          placeholder="Search..."
          size="small"
          value={searchUser}
          onChange={(e) => setSearchUser(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconSearch size={16} />
              </InputAdornment>
            ),
          }}
          sx={{ width: "80%" }}
        />
        <Button variant="contained">
          <IconFilter width={18} />
        </Button>
      </Stack>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <b>Title</b>
              </TableCell>
              <TableCell>
                <b>Date</b>
              </TableCell>
              <TableCell align="center">
                <b>Actions</b>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.length > 0 ? (
              filteredData
                .filter((doc) =>
                  doc.title?.toLowerCase().includes(searchUser.toLowerCase())
                )
                .map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>{doc.title || `Document #${doc.id}`}</TableCell>
                    <TableCell>
                      {doc.created_at
                        ? new Date(doc.created_at).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell align="center">
                      <Badge
                        badgeContent={doc.count}
                        color="error"
                        overlap="circular"
                      >
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={() =>
                            handleDownloadZip(doc.address_id, doc.id)
                          }
                        >
                          <IconDownload size={18} />
                        </Button>
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  No documents found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
