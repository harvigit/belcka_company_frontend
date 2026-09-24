"use client";
import React, { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { DayPicker } from "react-day-picker";
import { styled } from "@mui/material/styles";

const StyledDayPicker = styled(Box)(({ theme }) => ({
  "& .rdp": {
    "--rdp-cell-size": "36px",
    "--rdp-accent-color": "#50ABFF",
    "--rdp-background-color": "#e6f3ff",
    "--rdp-selected-color": "#fff",
    "--rdp-selected-background": "#50ABFF",
    "--rdp-today-background": "#f0f0f0",
    fontSize: "14px",
    padding: theme.spacing(1),
    backgroundColor: "#fff",
  },
  "& .rdp-day": {
    borderRadius: "4px",
  },
  "& .rdp-day_selected": {
    backgroundColor: "#50ABFF",
    color: "#fff",
  },
  "& .rdp-day:hover": {
    backgroundColor: "#e6f3ff",
  },
}));

type DeliveryDateDialogProps = {
  open: boolean;
  selectedDate?: Date;
  onClose: () => void;
  onSave: (date: Date) => void | Promise<void>;
};

const DeliveryDateDialog: React.FC<DeliveryDateDialogProps> = ({
  open,
  selectedDate,
  onClose,
  onSave,
}) => {
  const [singleDate, setSingleDate] = useState<Date | undefined>(selectedDate);

  React.useEffect(() => {
    if (open) setSingleDate(selectedDate);
  }, [open, selectedDate]);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Select Delivery Date</DialogTitle>
      <DialogContent>
        <StyledDayPicker>
          <DayPicker
            mode="single"
            selected={singleDate}
            onSelect={setSingleDate}
            showOutsideDays
            defaultMonth={singleDate || new Date()}
            modifiersClassNames={{
              selected: "rdp-day_selected",
            }}
          />
        </StyledDayPicker>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => {
            if (singleDate) onSave(singleDate);
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeliveryDateDialog;
