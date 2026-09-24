"use client";
import React from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { IconX } from "@tabler/icons-react";

const PRINT_STYLES = `
    <style>
      body {
        font-family: Arial, sans-serif;
        color: #000;
        margin: 20px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 10px;
      }
      th, td {
        border: 1px solid #ddd;
        padding: 8px;
      }
      th {
        background-color: #f2f2f2;
        text-align: left;
      }
      .company-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }

      .company-logo {
        width: 100px;
        height: auto;
      }

      .amount-section {
        width: 30%;
        margin-left: auto;
        border: 1px solid #e9e9e9;
        padding: 10px;
      }
      .amount-section div {
        display: flex;
        justify-content: space-between;
        margin-bottom: 5px;
      }
      @media print {
        @page { size: A4; margin: 0.5in; }
      }
      .purchase-order {
        padding: 2rem !important;
      }
      .print-order .card-body{
        padding: 0 !important;
        color: #000;
      }

      .company-info {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
      }

      .company-logo {
        max-width: 100px;
        height: auto;
      }

      .company-details {
        text-align: right;
      }

      .company-details h1 {
        margin: 0;
        font-size: 20px;
      }

      .company-details p {
        margin: 5px 0 0;
        font-size: 14px;
      }

      .purchase-order {
        font-family: Arial, sans-serif;
        max-width: 800px;
        margin: 0 auto;
      }

      h4 {
        font-size: 27px;
        text-align: center;
        margin-bottom: 10px;
        color: #000;
        margin-top: 0;
      }

      .sub-header {
        color: #000;
        text-align: center;
        font-size: 13px;
        margin-bottom: 10px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 10px;
        border: 1px solid #ddd;
      }

      th, td {
        padding: 8px;
        text-align: left;
      }
      .order-table{
          .font-14 {
            font-size: 14px !important;
            margin: 2px !important;
          }

          .font-12 {
            color: #777e89;
            font-size: 12px !important;
          }
      }
      .order-table thead th{
        padding: 5px !important;
      }

      .order-table tbody td{
        padding: 5px !important;
      }

      th {
        background-color: #f2f2f2;
      }

      .to-address {
        width: 48%;
        margin-left: 32px;

        h5{
          margin: 0px !important;
          margin-bottom: 5px !important;
        }
      }
      .delivery-address {
        width: 48%;
        h5{
          margin: 0px !important;
          margin-bottom: 5px !important;
        }
      }

      .company-details h5{
        margin: 0.5rem 0;    
      }

      h5{
        color: #000;
        font-weight: 400;
      }
      .address_wrapper {
        border: 1px solid #ddd;
        display: flex;
        justify-content: space-between;
        margin-top: 10px;
        margin-bottom: 10px;
        padding-top: 16px;
        padding-bottom : 16px;
      }

      .info_wrapper {
        border: 1px solid #ddd;
      }

      .info-table {
        width: 33.33%;
        display: flex;
        gap: 6px;
        padding: 2px 5px !important;

        p {
          margin: 3px !important;
        }
      }

      .address-table  {
        width: 50%;
        vertical-align: top;
      }

      .font-size-13{
        font-size: 13px;
        margin: 0;
      }

      .text-right {
        text-align: right;
      }

      .alert-text{
        color: crimson;
        margin-bottom: 10px;
      }

      .description-col{
        width: 50%;
      }

      .qty-col{
        text-align: center;
        width: 10%;
      }

      .rate-col{
        text-align: right;
        width: 15%;
      }

      .line-total-col{
        text-align: right;
        width: 15%;
      }

      .sub-total-col{
        text-align: right;
        border: 1px solid #ddd;
      }

      .tbody-qty-col{
        text-align: center;
      }

      .amount-col{
        text-align: right;
      }

      .amount-section{
        width: 30%;
        float: right;
      }

      .amount-section-label{
        text-align: left !important;
        p {
          margin: 2px !important;
          font-size: 14px !important;
        }

        .bold {
          font-weight: bold;
        }
      }

      .amount-section td{
        text-align: right;
      }
    </style>
  `;

type InvoicePreviewDialogProps = {
  open: boolean;
  onClose: () => void;
  loading?: boolean;
  purchaseOrder: any | null;
};

const printPurchaseOrder = (purchaseOrder: any) => {
  if (!purchaseOrder) return;
  const divContents = document.getElementById("purchase-order-preview");
  if (!divContents) return;
  const printWindow = window.open("", "_blank", "height=800,width=800");
  if (!printWindow) return;
  printWindow.document.write(
    "<html lang='en'><head><title>Purchase Order</title>",
  );
  printWindow.document.write(PRINT_STYLES);
  printWindow.document.write("</head><body>");
  printWindow.document.write(divContents.innerHTML);
  printWindow.document.write("</body></html>");
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
};

const InvoicePreviewDialog: React.FC<InvoicePreviewDialogProps> = ({
  open,
  onClose,
  loading = false,
  purchaseOrder,
}) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
    <DialogTitle>
      <Typography>Preview</Typography>
      <IconButton
        onClick={onClose}
        sx={{ position: "absolute", right: 8, top: 8 }}
      >
        <IconX />
      </IconButton>
    </DialogTitle>
    <DialogContent
      dividers
      sx={{ height: "100vh", overflowY: "auto" }}
      className="print-order"
    >
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center">
          <CircularProgress />
        </Box>
      ) : purchaseOrder ? (
        <Paper id="purchase-order-preview" sx={{ p: 2 }}>
          <Box
            display="flex"
            justifyContent={"space-between"}
            alignItems="center"
            mb={2}
            className="company-info"
          >
            {purchaseOrder?.company_image && (
              <img
                src={purchaseOrder?.company_image}
                alt="Company Logo"
                style={{ width: 90, marginRight: 16 }}
                className="company-logo"
              />
            )}
            <Box justifyItems={"end"} className="company-details">
              <Typography variant="h1" fontSize={18}>
                {purchaseOrder?.company_name}
              </Typography>
              {purchaseOrder?.company.address && (
                <Typography>{purchaseOrder?.company.address}</Typography>
              )}
            </Box>
          </Box>
          <Typography
            variant="h4"
            fontSize={24}
            fontWeight={500}
            align="center"
            mb={1}
          >
            Purchase Order
          </Typography>
          <Typography
            variant="body2"
            align="center"
            mb={2}
            className="sub-header"
          >
            SUPPLY THE MATERIAL/EQUIPMENT/GOODS TO THE REQUIRED SPECIFICATION AS
            SET OUT BELOW. THIS ORDER IS PLACED SUBJECT TO OUR TERMS AND
            CONDITIONS.
          </Typography>
          <Box
            display="flex"
            flexDirection="column"
            mb={2}
            border="1px solid #e9e9e9"
            borderRadius={0}
            p={2}
            className="info_wrapper"
            gap={1}
          >
            <Box display="flex" gap={2} className="info-table">
              <Typography variant="body2" fontWeight="bold">
                PO:
              </Typography>
              <Typography variant="body2">{purchaseOrder?.order_id}</Typography>
            </Box>
            <Box display="flex" gap={2} className="info-table">
              <Typography variant="body2" fontWeight="bold">
                Date:
              </Typography>
              <Typography variant="body2">{purchaseOrder?.date}</Typography>
            </Box>
            <Box display="flex" gap={2} className="info-table">
              <Typography variant="body2" fontWeight="bold">
                Account No:
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {purchaseOrder?.supplier?.account_number}
              </Typography>
            </Box>
          </Box>
          <Box
            display="flex"
            justifyContent="space-between"
            mb={2}
            border="1px solid #e9e9e9"
            borderRadius={0}
            className="address_wrapper"
            py={2}
          >
            <Box width="48%" ml={4} className="to-address">
              <Typography variant="h5">To</Typography>
              <Typography variant="h5">
                <b>Name:</b> {purchaseOrder?.supplier?.name}
              </Typography>
              <Typography variant="h5">
                <b>Street:</b> {purchaseOrder?.supplier?.street}
              </Typography>
              <Typography variant="h5">
                <b>Location:</b> {purchaseOrder?.supplier?.location}
              </Typography>
              <Typography variant="h5">
                <b>Town:</b> {purchaseOrder?.supplier?.town}
              </Typography>
              <Typography variant="h5">
                <b>Postcode:</b> {purchaseOrder?.supplier?.postcode}
              </Typography>
              <Typography variant="h5">
                <b>Contact:</b> {purchaseOrder?.supplier?.company_name}
              </Typography>
              <Typography variant="h5">
                <b>Tel:</b> {purchaseOrder?.supplier?.phone_with_extension}
              </Typography>
              <Typography variant="h5">
                <b>Email:</b> {purchaseOrder?.supplier?.email}
              </Typography>
            </Box>
            <Box width="48%" className="delivery-address">
              <Typography variant="h5">Deliver To</Typography>
              <Typography variant="h5">
                <b>Name:</b> {purchaseOrder?.store?.name}
              </Typography>
              <Typography variant="h5">
                <b>Street:</b> {purchaseOrder?.store?.street}
              </Typography>
              <Typography variant="h5">
                <b>Location:</b> {purchaseOrder?.store?.location}
              </Typography>
              <Typography variant="h5">
                <b>Town:</b> {purchaseOrder?.store?.town}
              </Typography>
              <Typography variant="h5">
                <b>Postcode:</b> {purchaseOrder?.store?.postcode}
              </Typography>
              <Typography variant="h5">
                <b>Contact:</b> {purchaseOrder?.user_name}
              </Typography>
              <Typography variant="h5">
                <b>Tel:</b> {purchaseOrder?.store?.phone_with_extension}
              </Typography>
              <Typography variant="h5">
                <b>Email:</b> {purchaseOrder?.store?.email}
              </Typography>
            </Box>
          </Box>
          <Box mt={2}>
            <TableContainer>
              <Table className="order-table">
                <TableHead>
                  <TableRow>
                    <TableCell className="item-col">Item</TableCell>
                    <TableCell className="description-col">Products</TableCell>
                    <TableCell className="qty-col">Qty</TableCell>
                    <TableCell className="rate-col">Rate</TableCell>
                    <TableCell className="line-total-col" width={100}>
                      Line Total
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {purchaseOrder?.purchase_orders.map(
                    (product: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-14">
                          {product.product.supplier_code}
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="h6"
                            className="font-14"
                            fontWeight={500}
                          >
                            {product.product.name || product.product.short_name}
                          </Typography>
                          <Typography
                            className="font-12"
                            variant="caption"
                            color="text.secondary"
                          >
                            {product.product.description
                              ? product.product.description
                              : ""}
                          </Typography>
                        </TableCell>
                        <TableCell className="font-14">{product.qty}</TableCell>
                        <TableCell className="font-14">
                          {purchaseOrder.currency}
                          {product.price}
                        </TableCell>
                        <TableCell className="font-14">
                          {purchaseOrder.currency}
                          {product.price}
                        </TableCell>
                      </TableRow>
                    ),
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Box display="flex" justifyContent="flex-end" mt={2}>
              <Box
                display="flex"
                flexDirection="column"
                width="30%"
                border="1px solid #e9e9e9"
                borderRadius={0}
                p={2}
                gap={1}
                className="amount-section"
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  className="amount-section-label"
                >
                  <Typography variant="body2" fontWeight="bold" className="bold">
                    Sub Total
                  </Typography>
                  <Typography variant="body2">
                    {purchaseOrder?.currency}
                    {purchaseOrder?.total_amount}
                  </Typography>
                </Box>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  className="amount-section-label"
                >
                  <Typography variant="body2" fontWeight="bold" className="bold">
                    Add VAT @20%
                  </Typography>
                  <Typography variant="body2">
                    {purchaseOrder?.currency}
                    {purchaseOrder?.tax}
                  </Typography>
                </Box>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  className="amount-section-label"
                >
                  <Typography variant="body2" fontWeight="bold" className="bold">
                    Total
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {purchaseOrder?.currency}
                    {(
                      (Number(purchaseOrder?.total_amount) || 0) +
                      (Number(purchaseOrder?.tax) || 0)
                    ).toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Paper>
      ) : (
        <Typography>No data found</Typography>
      )}
    </DialogContent>
    <DialogActions>
      <Button variant="contained" onClick={() => printPurchaseOrder(purchaseOrder)}>
        Print
      </Button>
      <Button variant="outlined" color="error" onClick={onClose}>
        Cancel
      </Button>
    </DialogActions>
  </Dialog>
);

export default InvoicePreviewDialog;
