import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CloseIcon from "@mui/icons-material/Close";
import toast from "react-hot-toast";

interface GenerateCodeDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerate: () => Promise<string | null>;
}

const GenerateCodeDialog: React.FC<GenerateCodeDialogProps> = ({
  open,
  onClose,
  onGenerate,
}) => {
  const [code, setCode] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // const handleCopyCode = async (code: string | null) => {
  //   if (!code) {
  //     toast.error("No code to copy!");
  //     return;
  //   }

  //   try {
  //     if (navigator?.clipboard?.writeText) {
  //       await navigator.clipboard.writeText(code);
  //       toast.success("Code copied!");
  //     } else {
  //       const textArea = document.createElement("textarea");
  //       textArea.value = code;
  //       textArea.style.position = "fixed";
  //       textArea.style.opacity = "0";
  //       document.body.appendChild(textArea);
  //       textArea.focus();
  //       textArea.select();
  //       const success = document.execCommand("copy");
  //       document.body.removeChild(textArea);

  //       if (success) {
  //         toast.success("Code copied!");
  //       } else {
  //         fallbackCopy(code);
  //         throw new Error("Fallback copy failed");
  //       }
  //     }
  //   } catch (err) {
  //     console.error("Clipboard copy failed:", err);
  //     toast.error("Failed to copy code!");
  //   }
  // };

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);

      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, textArea.value.length);

      const successful = (document as any).execCommand("copy");
      document.body.removeChild(textArea);

      if (successful) toast.success("Copied!");
      else toast.error("Copy failed!");
    } catch (err) {
      console.error("Fallback copy failed:", err);
      toast.error("Failed to copy!");
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const generatedCode = await onGenerate();
      if (!generatedCode) {
        toast.error("Failed to received code from server");
        return;
      }

      setCode(generatedCode);
      setResendTimer(15 * 60); // 15 minutes

      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      toast.error("Failed to generate code");
    } finally {
      setIsGenerating(false);
    }
  };

  const formatTimer = () => {
    const m = Math.floor(resendTimer / 60)
      .toString()
      .padStart(2, "0");
    const s = (resendTimer % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const renderCodeBoxes = () => {
    if (!code) return null;
    return (
      <Box sx={{ display: "flex", gap: 1, justifyContent: "center", mt: 2 }}>
        {code.split("").map((digit, i) => (
          <Box
            key={i}
            sx={{
              width: 40,
              height: 50,
              borderRadius: 2,
              border: "1px solid #ccc",
              fontSize: 24,
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#f5f5f5",
            }}
          >
            {digit}
          </Box>
        ))}
      </Box>
    );
  };

  const handleDialogClose = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCode(null);
    setResendTimer(0);
    onClose();
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <Dialog open={open} onClose={handleDialogClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ pr: 4 }}>
        Generate Code
        <IconButton
          aria-label="close"
          onClick={handleDialogClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ textAlign: "center", minHeight: 120 }}>
        {!code && !isGenerating && (
          <Typography>Are you sure you want to generate a new code?</Typography>
        )}

        {isGenerating && <Typography>Generating code...</Typography>}

        {code && (
          <>
            <Typography sx={{ mt: 1 }}>Random code generator</Typography>
            {renderCodeBoxes()}

            <Typography sx={{ mt: 2, color: "text.secondary" }}>
              Resend code in {formatTimer()}
            </Typography>

            <Button
              variant="outlined"
              startIcon={<ContentCopyIcon />}
              sx={{ mt: 2 }}
              onClick={() => {
                if (!code) {
                  toast.error("No code to copy!");
                  return;
                }

                if (navigator?.clipboard?.writeText) {
                  navigator.clipboard
                    .writeText(code)
                    .then(() => toast.success("Code copied!"))
                    .catch((err) => {
                      console.error("Clipboard API failed:", err);
                      fallbackCopy(code); 
                    });
                } else {
                  fallbackCopy(code);
                }
              }}
            >
              Copy Code
            </Button>

            <Button
              sx={{ mt: 2, ml: 3 }}
              variant="text"
              disabled={resendTimer > 0 || isGenerating}
              onClick={handleGenerate}
            >
              Resend Code
            </Button>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: "center" }}>
        {!code && !isGenerating && (
          <>
            <Button onClick={handleDialogClose}>Cancel</Button>
            <Button variant="contained" onClick={handleGenerate}>
              Confirm
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default GenerateCodeDialog;
