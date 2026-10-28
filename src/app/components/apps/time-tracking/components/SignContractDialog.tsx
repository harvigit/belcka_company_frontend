'use client';

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    MenuItem,
    Stack,
    Typography,
} from '@mui/material';
import api from '@/utils/axios';
import CustomTextField from '@/app/components/forms/theme-elements/CustomTextField';
import type {ContractFormField} from '@/app/components/apps/settings/contracts/contracts-api';

type MissingUserField = { key: string; label: string; fillable: boolean };

type ContractDetail = {
    id: number;
    title?: string;
    company_name?: string;
    what_changed?: string | null;
    html: string;
    contract_hash: string;
    can_sign: boolean;
    blocked_reason?: string | null;
    missing_user_fields?: MissingUserField[];
    form_fields?: (ContractFormField & { value: string })[];
};

interface SignContractDialogProps {
    contractId: number | null;
    message?: string;
    onClose: () => void;
    /** Called after a successful signature, so the caller can retry start work. */
    onSigned: () => void;
}

/** Server stores dates as dd/MM/yyyy; the date input wants yyyy-MM-dd. */
const toInputDate = (value: string) => {
    const uk = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value ?? '');
    return uk ? `${uk[3]}-${uk[2]}-${uk[1]}` : value ?? '';
};

const selectMenuProps = {PaperProps: {sx: {maxHeight: 300}}};

/** Label above the input, like the rest of the system's forms. */
const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({label, required, children}) => (
    <Box>
        <Typography variant="body2" fontWeight={600} mb={0.75}>
            {label}{required && <Box component="span" color="error.main"> *</Box>}
        </Typography>
        {children}
    </Box>
);

const SignaturePad: React.FC<{ canvasRef: React.RefObject<HTMLCanvasElement | null>; onChange: (empty: boolean) => void }> = ({
    canvasRef,
    onChange,
}) => {
    const drawingRef = useRef(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ratio = window.devicePixelRatio || 1;
        const {width, height} = canvas.getBoundingClientRect();
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.scale(ratio, ratio);
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#000';
    }, [canvasRef]);

    const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        return {x: e.clientX - rect.left, y: e.clientY - rect.top};
    };

    const handleDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const ctx = e.currentTarget.getContext('2d');
        if (!ctx) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drawingRef.current = true;
        const {x, y} = point(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 0.1, y + 0.1);
        ctx.stroke();
        onChange(false);
    };

    const handleMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drawingRef.current) return;
        const ctx = e.currentTarget.getContext('2d');
        if (!ctx) return;
        const {x, y} = point(e);
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const handleUp = () => {
        drawingRef.current = false;
    };

    return (
        <Box
            component="canvas"
            ref={canvasRef}
            onPointerDown={handleDown}
            onPointerMove={handleMove}
            onPointerUp={handleUp}
            onPointerLeave={handleUp}
            sx={{width: '100%', height: 160, border: 1, borderColor: 'divider', borderRadius: 1, touchAction: 'none', cursor: 'crosshair', bgcolor: '#fff'}}
        />
    );
};

const SignContractDialog: React.FC<SignContractDialogProps> = ({contractId, message, onClose, onSigned}) => {
    const [contract, setContract] = useState<ContractDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [filled, setFilled] = useState<Record<string, string>>({});
    const [formValues, setFormValues] = useState<Record<string, string>>({});
    const [agree, setAgree] = useState(false);
    const [signatureEmpty, setSignatureEmpty] = useState(true);
    const [padKey, setPadKey] = useState(0);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const load = useCallback(async (id: number) => {
        setLoading(true);
        setLoadError(null);
        try {
            const res = await api.get(`contracts/${id}`, {skipToast: true} as any);
            const info: ContractDetail = res.data?.info;
            setContract(info);
            setFormValues(Object.fromEntries((info?.form_fields ?? []).map((f) => [f.key, f.value ?? ''])));
        } catch (err: any) {
            setLoadError(err?.response?.data?.message || 'Failed to load the contract.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!contractId) return;
        setContract(null);
        setFilled({});
        setFormValues({});
        setAgree(false);
        setSignatureEmpty(true);
        setSubmitError(null);
        setPadKey((k) => k + 1);
        load(contractId);
    }, [contractId, load]);

    const clearSignature = () => {
        setSignatureEmpty(true);
        setPadKey((k) => k + 1);
    };

    const handleSign = async () => {
        if (!contract || !canvasRef.current) return;
        setSubmitting(true);
        setSubmitError(null);
        try {
            const blob = await new Promise<Blob | null>((resolve) => canvasRef.current!.toBlob(resolve, 'image/png'));
            if (!blob) throw new Error('Please draw your signature!');

            const body = new FormData();
            body.append('agree', 'true');
            body.append('contract_hash', contract.contract_hash);
            body.append('filled_fields', JSON.stringify(filled));
            body.append('form_values', JSON.stringify(formValues));
            body.append('device_info', JSON.stringify({platform: 'web', user_agent: navigator.userAgent.substring(0, 200)}));
            body.append('signature', blob, 'signature.png');

            await api.post(`contracts/${contract.id}/sign`, body, {
                headers: {'Content-Type': 'multipart/form-data'},
                skipToast: true,
            } as any);
            onSigned();
        } catch (err: any) {
            setSubmitError(err?.response?.data?.message || err?.message || 'Failed to sign the contract.');
        } finally {
            setSubmitting(false);
        }
    };

    const missingFields = contract?.missing_user_fields ?? [];
    const unfillable = missingFields.filter((f) => !f.fillable);
    const fillable = missingFields.filter((f) => f.fillable);
    const formFields = contract?.form_fields ?? [];

    const fieldsComplete =
        fillable.every((f) => filled[f.key]?.trim()) &&
        formFields.every((f) => !f.required || (f.type === 'checkbox' ? formValues[f.key] === 'true' : formValues[f.key]?.trim()));

    const canSubmit = Boolean(contract?.can_sign) && !unfillable.length && fieldsComplete && agree && !signatureEmpty && !submitting;

    const renderFormField = (f: ContractFormField) => {
        const value = formValues[f.key] ?? '';
        const set = (v: string) => setFormValues((prev) => ({...prev, [f.key]: v}));

        if (f.type === 'checkbox') {
            return (
                <FormControlLabel
                    key={f.key}
                    control={<Checkbox checked={value === 'true'} onChange={(e) => set(e.target.checked ? 'true' : 'false')}/>}
                    label={<>{f.label}{f.required && <Box component="span" color="error.main"> *</Box>}</>}
                />
            );
        }
        return (
            <Field key={f.key} label={f.label} required={f.required}>
                {f.type === 'select' ? (
                    <CustomTextField
                        select
                        size="small"
                        fullWidth
                        value={value}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => set(e.target.value)}
                        SelectProps={{
                            displayEmpty: true,
                            MenuProps: selectMenuProps,
                            renderValue: (v: unknown) => v
                                ? String(v)
                                : <Box component="span" sx={{color: 'text.secondary', opacity: 0.8}}>Select {f.label.toLowerCase()}</Box>,
                        }}
                    >
                        {f.options.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                    </CustomTextField>
                ) : (
                    <CustomTextField
                        size="small"
                        fullWidth
                        autoComplete="off"
                        placeholder={f.type === 'date' ? undefined : `Enter ${f.label.toLowerCase()}`}
                        type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                        multiline={f.type === 'textarea'}
                        minRows={f.type === 'textarea' ? 3 : undefined}
                        value={f.type === 'date' ? toInputDate(value) : value}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => set(e.target.value)}
                    />
                )}
            </Field>
        );
    };

    return (
        <Dialog open={Boolean(contractId)} onClose={submitting ? undefined : onClose} fullWidth maxWidth="md">
            <DialogTitle>
                {contract?.title || 'Sign your contract'}
                {contract?.company_name && (
                    <Typography variant="body2" color="text.secondary">{contract.company_name}</Typography>
                )}
            </DialogTitle>
            <DialogContent
                dividers
                sx={{
                    // The root already pads multiline inputs; drop the theme's extra input padding.
                    '& .MuiInputBase-inputMultiline': {padding: '0 !important'},
                }}
            >
                {loading && (
                    <Box display="flex" justifyContent="center" py={6}><CircularProgress size={28}/></Box>
                )}
                {loadError && <Alert severity="error">{loadError}</Alert>}
                {contract && !loading && (
                    <Stack spacing={2}>
                        <Alert severity="warning">{message || 'Please sign your contract before starting work.'}</Alert>
                        {contract.what_changed && (
                            <Alert severity="info"><b>What changed:</b> {contract.what_changed}</Alert>
                        )}
                        <Box
                            component="iframe"
                            title="Contract"
                            sandbox=""
                            srcDoc={contract.html}
                            sx={{width: '100%', height: '45vh', border: 1, borderColor: 'divider', borderRadius: 1}}
                        />

                        {!contract.can_sign && (
                            <Alert severity="error">{contract.blocked_reason || 'You can’t sign this contract yet.'}</Alert>
                        )}

                        {unfillable.length > 0 && (
                            <Alert severity="error">
                                Please update your profile first: {unfillable.map((f) => f.label).join(', ')}.
                            </Alert>
                        )}

                        {contract.can_sign && (fillable.length > 0 || formFields.length > 0) && (
                            <Stack spacing={1.5}>
                                <Typography variant="h6">Your details</Typography>
                                {fillable.map((f) => (
                                    <Field key={f.key} label={f.label} required>
                                        <CustomTextField
                                            size="small"
                                            fullWidth
                                            autoComplete="off"
                                            placeholder={`Enter ${f.label.toLowerCase()}`}
                                            value={filled[f.key] ?? ''}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilled((prev) => ({...prev, [f.key]: e.target.value}))}
                                        />
                                    </Field>
                                ))}
                                {formFields.map(renderFormField)}
                            </Stack>
                        )}

                        {contract.can_sign && (
                            <Stack spacing={1}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="h6">Signature</Typography>
                                    <Button size="small" onClick={clearSignature} disabled={signatureEmpty}>Clear</Button>
                                </Stack>
                                <SignaturePad key={padKey} canvasRef={canvasRef} onChange={setSignatureEmpty}/>
                                <FormControlLabel
                                    control={<Checkbox checked={agree} onChange={(e) => setAgree(e.target.checked)}/>}
                                    label="I have read and agree to this contract"
                                />
                            </Stack>
                        )}

                        {submitError && <Alert severity="error">{submitError}</Alert>}
                    </Stack>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={submitting}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={handleSign}
                    disabled={!canSubmit}
                    startIcon={submitting ? <CircularProgress size={16} color="inherit"/> : undefined}
                >
                    Sign & start work
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default SignContractDialog;
