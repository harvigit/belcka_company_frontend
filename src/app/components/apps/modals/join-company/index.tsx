"use client";
import React from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
} from "@mui/material";

interface Trade {
  trade_id: number;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (otp: string) => void;
  otp: string;
  setOtp: (otp: string) => void;
}

const JoinCompanyDialog: React.FC<Props> = ({
  open,
  onClose,
  onSubmit,
  otp,
  setOtp,
}) => {
  const isDisabled = !(otp.length === 6 );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Join company</DialogTitle>
      <DialogContent>
        <TextField
          sx={{ marginBottom: "5%" }}
          autoFocus
          margin="dense"
          label="OTP"
          type="text"
          fullWidth
          inputProps={{
            maxLength: 6,
            inputMode: "numeric",
            pattern: "[0-9]*",
          }}
          value={otp}
          onChange={(e) => {
            const value = e.target.value;
            if (/^\d{0,6}$/.test(value)) {
              setOtp(value);
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="error">
          Cancel
        </Button>
        <Button
          onClick={() => onSubmit(otp)}
          disabled={isDisabled}
          variant="contained"
          color="primary"
        >
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default JoinCompanyDialog;
