"use client";
import React, { useEffect, useState } from "react";
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  Button,
  Stack,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import {
  IconX,
  IconCalendar,
  IconMapPin,
  IconBuilding,
  IconUser,
  IconFileInvoice,
  IconEye,
  IconFileText,
  IconCheck,
  IconArrowLeft,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import Image from "next/image";
import toast from "react-hot-toast";
import SkeletonLoader from "@/app/components/SkeletonLoader";

interface CollectViewDetailsProps {
  open: boolean;
  companyId: number | null;
  onClose: () => void;
  collectId: number | null;
  onSuccess: () => void;
}

const CollectViewDetails: React.FC<CollectViewDetailsProps> = ({
  open,
  companyId,
  onClose,
  collectId,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (open && collectId) {
      fetchDetail();
      fetchHistory();
    } else {
      setData(null);
      setHistory([]);
    }
  }, [open, collectId]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `po-collect/detail?company_id=${companyId}&id=${collectId}`,
      );
      if (res.data?.IsSuccess) {
        setData(res.data.info);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get(
        `po-collect/history?company_id=${companyId}&id=${collectId}`,
      );
      if (res.data?.IsSuccess) {
        setHistory(res.data.info || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReview = async () => {
    setReviewing(true);
    try {
      const res = await api.post(`po-collect/review`, {
        company_id: companyId,
        id: collectId,
      });
      if (res.data?.IsSuccess) {
        toast.success(res.data.message || "Marked as reviewed");
        onSuccess();
        onClose();
      } else {
        toast.error(res.data?.message || "Failed to review");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to review");
    } finally {
      setReviewing(false);
    }
  };

  const totalAmount =
    data?.poItems?.reduce(
      (acc: number, item: any) => acc + (Number(item.total) || 0),
      0,
    ) || 0;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 500, md: 550 },
          borderRadius: 0,
          boxShadow: "none",
        },
      }}
    >
      <Box p={3} pt={2} height="100%" display="flex" flexDirection="column">
        {/* Header */}
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
        >
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <IconButton onClick={onClose}>
              <IconArrowLeft />
            </IconButton>
            <Typography variant="h6" fontWeight={700}>
              Collect Details
            </Typography>
          </Box>
          <IconButton onClick={onClose}>
            <IconX />
          </IconButton>
        </Box>

        {loading ? (
          <Box flex={1} overflow="auto">
            <SkeletonLoader columns={[{ name: "" }]} rowCount={5} />
          </Box>
        ) : data ? (
          <Box flex={1} overflow="auto" sx={{ pr: 1, mt: 1 }}>
            <Box mb={3}>
              <Typography
                variant="body2"
                sx={{
                  bgcolor:
                    data.status === "New" ? "warning.light" : "success.light",
                  color:
                    data.status === "New" ? "warning.main" : "success.main",
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                  display: "inline-block",
                  fontWeight: 600,
                  mb: 2,
                }}
              >
                {data.status}
              </Typography>

              <Stack spacing={2}>
                <Box display="flex" alignItems="center">
                  <IconCalendar
                    size={20}
                    style={{ color: "#888", marginRight: 16 }}
                  />
                  <Typography variant="body2" color="textSecondary" width={120}>
                    Date & Time
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {data.created_at || "-"}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center">
                  <IconBuilding
                    size={20}
                    style={{ color: "#888", marginRight: 16 }}
                  />
                  <Typography variant="body2" color="textSecondary" width={120}>
                    Project
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {data.project_name || "-"}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center">
                  <IconMapPin
                    size={20}
                    style={{ color: "#888", marginRight: 16 }}
                  />
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    width={120}
                    sx={{
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      wordBreak: "break-word",
                      minWidth: "120px",
                      // width: "100px",
                      // maxWidth: "100px",
                    }}
                  >
                    Address
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {data.address_name || "-"}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center">
                  <IconUser
                    size={20}
                    style={{ color: "#888", marginRight: 16 }}
                  />
                  <Typography variant="body2" color="textSecondary" width={120}>
                    Supplier
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {data.supplier_name || "-"}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center">
                  <IconFileInvoice
                    size={20}
                    style={{ color: "#888", marginRight: 16 }}
                  />
                  <Typography variant="body2" color="textSecondary" width={120}>
                    Incl. Tax
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {data.inc_tax !== null && data.inc_tax !== undefined ? `£${Number(data.inc_tax).toFixed(2)}` : "-"}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center">
                  <IconFileInvoice
                    size={20}
                    style={{ color: "#888", marginRight: 16 }}
                  />
                  <Typography variant="body2" color="textSecondary" width={120}>
                    Excl. Tax
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {data.excl_tax !== null && data.excl_tax !== undefined ? `£${Number(data.excl_tax).toFixed(2)}` : "-"}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center">
                  <IconUser
                    size={20}
                    style={{ color: "#888", marginRight: 16 }}
                  />
                  <Typography variant="body2" color="textSecondary" width={120}>
                    Created By
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {data.order_by_name || "-"}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="flex-start">
                  <IconFileInvoice
                    size={20}
                    style={{ color: "#888", marginRight: 16, marginTop: 2 }}
                  />
                  <Box>
                    <Typography variant="body2" color="textSecondary" mb={1}>
                      Document / Receipt
                    </Typography>
                    {data.image && (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          border: "1px solid #eee",
                          borderRadius: 2,
                          p: 1,
                          width: 250,
                          cursor: "pointer",
                          "&:hover": { bgcolor: "#f9f9f9" },
                        }}
                        onClick={() => window.open(data.image, "_blank")}
                      >
                        <Box
                          sx={{
                            width: 50,
                            height: 50,
                            position: "relative",
                            mr: 2,
                            borderRadius: 1,
                            overflow: "hidden",
                          }}
                        >
                          {data.image.toLowerCase().endsWith(".pdf") ? (
                            <Box
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                              height="100%"
                              bgcolor="#f5f5f5"
                            >
                              <Typography
                                variant="caption"
                                fontWeight={600}
                                color="textSecondary"
                              >
                                PDF
                              </Typography>
                            </Box>
                          ) : (
                            <Image
                              src={data.image}
                              alt="Receipt"
                              fill
                              style={{ objectFit: "cover" }}
                            />
                          )}
                        </Box>
                        <Box flex={1} overflow="hidden">
                          <Typography variant="body2" noWrap fontWeight={500}>
                            Attachment
                          </Typography>
                        </Box>
                        <IconButton size="small">
                          <IconEye size={18} />
                        </IconButton>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Stack>
            </Box>

            <Box
              sx={{
                bgcolor: "#fafafa",
                borderRadius: 2,
                p: 2,
                mb: 3,
                border: "1px solid #f0f0f0",
              }}
            >
              <Typography
                variant="subtitle2"
                fontWeight={600}
                mb={2}
                display="flex"
                alignItems="center"
              >
                Items Extracted from Receipt
              </Typography>
              <TableContainer>
                <Table
                  size="small"
                  sx={{
                    "& .MuiTableCell-root": {
                      borderBottom: "none",
                      py: 1,
                      px: 1,
                    },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <Typography variant="caption" color="textSecondary">
                          Item
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption" color="textSecondary">
                          Qty
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption" color="textSecondary">
                          Unit Price
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption" color="textSecondary">
                          Total
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.poItems?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Typography variant="body2">
                            {item.description}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">{item.qty}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            £{Number(item.unit_price || 0).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            £{Number(item.total || 0).toFixed(2)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Typography variant="subtitle2" fontWeight={700} mt={1}>
                          Total
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle2" fontWeight={700} mt={1}>
                          £{totalAmount.toFixed(2)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              {data.image && (
                <Button
                  startIcon={<IconFileText size={18} />}
                  onClick={() => window.open(data.image, "_blank")}
                  sx={{ mt: 2, textTransform: "none", fontWeight: 600 }}
                  color="primary"
                >
                  View full receipt
                </Button>
              )}
            </Box>

            {history.length > 0 && (
              <Box mb={2}>
                <Typography variant="subtitle2" fontWeight={600} mb={2}>
                  History
                </Typography>
                <Stack
                  spacing={2}
                  sx={{
                    position: "relative",
                    ml: 1,
                    pl: 2,
                    borderLeft: "2px solid #eee",
                  }}
                >
                  {history.map((h, index) => (
                    <Box key={h.id} sx={{ position: "relative" }}>
                      <Box
                        sx={{
                          position: "absolute",
                          left: -23,
                          top: 4,
                          width: 8,
                          height: 8,
                          bgcolor:
                            index === 0 ? "warning.main" : "text.secondary",
                          borderRadius: "50%",
                        }}
                      />
                      <Typography variant="body2" fontWeight={600}>
                        {h.title}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {new Date(h.dateOfAction).toLocaleString()}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </Box>
        ) : (
          <Box flex={1} />
        )}

        {/* Footer */}
        {data && data.status === "New" && (
          <Box pt={2} mt="auto" borderTop="1px solid" borderColor="divider">
            <Button
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              startIcon={<IconCheck size={20} />}
              onClick={handleReview}
              disabled={reviewing}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                py: 1.5,
                fontSize: 16,
              }}
            >
              {reviewing ? "Reviewing..." : "Mark as Reviewed"}
            </Button>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default CollectViewDetails;
