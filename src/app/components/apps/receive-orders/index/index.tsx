"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Drawer,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { IconX } from "@tabler/icons-react";
import Image from "next/image";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";

interface ReceiveProductRow {
  product_id: number;
  short_name: string;
  ordered_qty: number;
  received_qty: number;
  remaining_qty: number;
  receive_now: number;
  image_url?: string | null;
  uuid?: string;
  description?: string | null;
  supplier_code?: string | null;
}

const ReceivePurchaseOrder = () => {
  const params = useParams();
  const router = useRouter();
  const orderId = params ? Number(params.id) : "";
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [products, setProducts] = useState<ReceiveProductRow[]>([]);
  const [note, setNote] = useState("");
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const [receiveId, setReceiveId] = useState<number>(0);

  const [receiveDate, setReceiveDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  useEffect(() => {
    if (!orderId) return;
    setOpen(true);
    const fetchOrder = async () => {
      try {
        setLoading(true);

        const res = await api.get(
          `purchase-orders/get?company_id=${user.company_id}&id=${orderId}`,
        );
        const data = res.data.info[0];

        setOrder(data);

        const mapped: ReceiveProductRow[] = data.purchase_orders.map(
          (p: any) => {
            const ordered = Number(p.qty);
            const received = Number(p.received_qty || 0);

            return {
              product_id: p.product_id,
              short_name: p.short_name,
              supplier_code: p.supplier_code,
              ordered_qty: ordered,
              received_qty: received,
              remaining_qty: ordered - received,
              receive_now: ordered - received > 0 ? 1 : 0,
              image_url: p.image_url,
              uuid: p.uuid,
              description: p.description,
            };
          },
        );

        setProducts(mapped);
      } catch (error: any) {
        if (error.response?.status === 404) {
          router.replace("/apps/purchase-orders/list");
          return;
        }
      } finally {
        setLoading(false);
      }
    };
    if (open == true) {
      fetchOrder();
    }
  }, [open, orderId]);

  const supplierIdsFromPO = [
    ...new Set(order?.purchase_orders.map((po: any) => po.supplier_name)),
  ];
  const onClose = () => {
    setOpen(false);
    router.push("/apps/purchase-orders/list");
  };

  const updateReceiveQty = (productId: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    setProducts((prev) =>
      prev.map((p) =>
        p.product_id === productId
          ? {
              ...p,
              receive_now: Math.min(Number(value), p.remaining_qty),
            }
          : p,
      ),
    );
  };

  const handleReceive = async () => {
    try {
      setIsSaving(true);
      const product_data = products
        .filter((p) => p.receive_now > 0)
        .map((p) => ({
          product_id: p.product_id,
          received_qty: p.receive_now,
        }));

      if (!product_data.length) {
        alert("Please enter quantity to receive");
        return;
      }
      const response = await api.post("purchase-orders/purchase-receive", {
        order_id: order.id,
        company_id: order.company_id,
        store_id: order.store_id,
        receive_date: receiveDate,
        receive_id: receiveId,
        note,
        product_data: JSON.stringify(product_data),
      });

      if (response.data.IsSuccess) {
        toast.success(response.data.message);
        router.replace("/apps/purchase-orders/list");
      }
    } catch (error) {}
    setIsSaving(false);
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          height: "99vh",
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
        },
      }}
    >
      {/* HEADER */}
      <Box p={2} display="flex" justifyContent="space-between">
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={onClose}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={600}>
            Receive Purchase Order
          </Typography>
        </Box>
        <IconButton onClick={onClose}>
          <IconX />
        </IconButton>
      </Box>

      {/* BODY */}
      <Box px={10} py={2} flex={1} overflow="auto">
        {/* ORDER INFO */}
        <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} mb={3}>
          <TextField label="Order ID" value={order?.order_id || ""} disabled />
          <TextField label="Supplier" value={supplierIdsFromPO.join(", ")} disabled />
          <TextField label="Store" value={order?.store?.name || ""} disabled />
          <TextField
            label="Received By"
            value={user.name || ""}
            disabled
          />
          <Box className="form_inputs">
            <Typography variant="body2" gutterBottom>
              Purchase Receive
            </Typography>
            <TextField
              fullWidth
              value={receiveId || ""}
              onChange={(e: any) => setReceiveId(e.target.value)}
            />
          </Box>
          <Box className="form_inputs">
            <Typography variant="body2" gutterBottom>
              Receive Date
            </Typography>
            <TextField
              type="date"
              fullWidth
              value={receiveDate}
              onChange={(e) => setReceiveDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </Box>

        <Typography color="text.secondary" mb={2}>
          Note: Please check products before mark as receive.
        </Typography>

        {/* TABLE */}
        <TableContainer sx={{ border: "1px solid #eee", borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Item & Description</TableCell>
                <TableCell>ID</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Ordered</TableCell>
                <TableCell>Received</TableCell>
                <TableCell>Qty to Receive</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {products.map((p) => (
                <TableRow key={p.product_id}>
                  <TableCell>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      display={"flex"}
                      alignContent={"center"}
                      gap={2}
                    >
                      <Box>
                        <Image
                          src={p.image_url || ""}
                          alt={"product"}
                          width={50}
                          height={50}
                        />
                      </Box>
                      <Box display={"block"} width={"70%"}>
                        <Typography>{p.short_name}</Typography>
                        <Typography color="text.secondary" variant="caption">
                          {p.description ? p.description : ""}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>

                  <TableCell>{p.product_id}</TableCell>
                  <TableCell>{p.supplier_code}</TableCell>
                  <TableCell>{p.ordered_qty}</TableCell>
                  <TableCell>{p.received_qty}</TableCell>

                  <TableCell>
                    <TextField
                      size="small"
                      type="text"
                      value={p.receive_now}
                      disabled={order.status == 2}
                      inputProps={{
                        inputMode: "numeric",
                      }}
                      onChange={(e) =>
                        updateReceiveQty(p.product_id, e.target.value)
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* NOTE */}
        <Box mt={3}>
          <TextField
            label="Note"
            sx={{ width: "50%" }}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "start",
          gap: 2,
          p: 2,
          mt: "auto",
        }}
      >
        <Button
          color="primary"
          variant="contained"
          size="large"
          type="submit"
          onClick={handleReceive}
          disabled={isSaving}
          sx={{ borderRadius: 3, width: "10%" }}
        >
          {isSaving ? "Saving..." : "Save as received"}
        </Button>
        <Button
          color="inherit"
          onClick={onClose}
          variant="contained"
          size="large"
          sx={{
            backgroundColor: "transparent",
            borderRadius: 3,
            color: "GrayText",
          }}
        >
          Close
        </Button>
      </Box>
    </Drawer>
  );
};

export default ReceivePurchaseOrder;
