'use client';
import React from 'react';
import {IconArrowRight} from '@tabler/icons-react';
import {
    Box,
    ButtonBase,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';

// Theme light colours where available so dark mode works; purple is a soft tint.
export type Tone = 'blue' | 'purple' | 'green' | 'pink' | 'orange' | 'teal';
export const TONES: Record<Tone, { bg: string; fg: string }> = {
    blue: {bg: 'info.light', fg: 'info.main'},
    purple: {bg: 'rgba(124, 77, 255, 0.10)', fg: '#7c4dff'},
    green: {bg: 'success.light', fg: 'success.main'},
    pink: {bg: 'error.light', fg: 'error.main'},
    orange: {bg: 'warning.light', fg: '#b26a00'},
    teal: {bg: 'primary.light', fg: 'primary.main'},
};
export const CARD_TONE: Record<'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info', Tone> = {
    primary: 'blue',
    secondary: 'purple',
    success: 'green',
    error: 'pink',
    warning: 'orange',
    info: 'teal',
};
const TONE_ORDER: Tone[] = ['blue', 'purple', 'green', 'pink', 'orange', 'teal'];
// Tones in a fixed order, so tiles next to each other never share a colour.
export const toneAt = (i: number): Tone => TONE_ORDER[i % TONE_ORDER.length];

export const StatTile: React.FC<{
    label: string;
    value: React.ReactNode;
    sub?: React.ReactNode;
    // unused; kept so callers can pass it
    tone?: Tone;
}> = ({label, value, sub}) => (
    <Paper
        variant="outlined"
        sx={{p: 1.5, borderRadius: '12px', height: '100%'}}
    >
        <Typography
            variant="caption"
            color="textSecondary"
            sx={{textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600}}
        >
            {label}
        </Typography>
        {/* divs, not <h6>/<span>: value and sub can hold chips or progress bars */}
        <Typography component="div" variant="h6" fontWeight={700} sx={{fontVariantNumeric: 'tabular-nums'}}>
            {value}
        </Typography>
        {sub && (
            <Typography component="div" variant="caption" color="textSecondary">
                {sub}
            </Typography>
        )}
    </Paper>
);

export const Section: React.FC<{
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
}> = ({title, subtitle, actions, children}) => (
    <Box>
        <Stack
            direction={{xs: 'column', sm: 'row'}}
            justifyContent="space-between"
            alignItems={{sm: 'center'}}
            spacing={1}
            mb={1.5}
        >
            <Box>
                <Typography variant="h6" fontWeight={700}>
                    {title}
                </Typography>
                {subtitle && (
                    <Typography variant="body2" color="textSecondary">
                        {subtitle}
                    </Typography>
                )}
            </Box>
            {actions && (
                // keep the buttons on one line when the subtitle is long
                <Stack direction="row" spacing={1} flexWrap="wrap"
                       sx={{flexShrink: 0, '& .MuiButton-root': {whiteSpace: 'nowrap'}}}>
                    {actions}
                </Stack>
            )}
        </Stack>
        {children}
    </Box>
);

export interface Column<T> {
    header: string;
    render: (row: T) => React.ReactNode;
    align?: 'left' | 'right';
}

export function RecordTable<T extends { id: number | string }>({
                                                                   columns,
                                                                   rows,
                                                                   empty,
                                                               }: {
    columns: Column<T>[];
    rows: T[];
    empty: string;
}) {
    if (!rows.length) {
        return (
            <Paper
                variant="outlined"
                sx={{p: 3, borderRadius: 2, borderStyle: 'dashed', textAlign: 'center'}}
            >
                <Typography color="textSecondary">{empty}</Typography>
            </Paper>
        );
    }
    return (
        <TableContainer component={Paper} variant="outlined" sx={{borderRadius: 2}}>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        {columns.map((c) => (
                            <TableCell
                                key={c.header}
                                align={c.align}
                                sx={{py: 1.25, whiteSpace: 'nowrap'}}
                            >
                                <Typography variant="subtitle2">{c.header}</Typography>
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row) => (
                        <TableRow key={row.id} hover>
                            {columns.map((c) => (
                                <TableCell
                                    key={c.header}
                                    align={c.align}
                                    sx={{py: 1.25, fontVariantNumeric: 'tabular-nums'}}
                                >
                                    {c.render(row)}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

export const StatCard: React.FC<{
    icon: React.ReactNode;
    tone: Tone;
    value: React.ReactNode;
    label: string;
    // shown as a tooltip on the label
    hint?: string;
    active?: boolean;
    alert?: boolean;
    // shows a small arrow: the card opens another page
    link?: boolean;
    onClick: () => void;
    title?: string;
}> = ({icon, tone, value, label, hint, active, alert, link, onClick, title}) => (
    <ButtonBase
        onClick={onClick}
        aria-pressed={link ? undefined : !!active}
        title={title}
        sx={{
            width: '100%',
            height: '100%',
            justifyContent: 'flex-start',
            gap: 1.5,
            p: 1.5,
            borderRadius: 2,
            border: '1px solid',
            borderColor: active ? TONES[tone].fg : 'grey.200',
            boxShadow: active ? 1 : 0,
            backgroundColor: 'background.paper',
            textAlign: 'left',
            transition: 'all .15s',
            '&:hover': {borderColor: TONES[tone].fg},
        }}
    >
        <Box
            sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: TONES[tone].fg,
                backgroundColor: TONES[tone].bg,
                flexShrink: 0,
            }}
        >
            {icon}
        </Box>
        <Box minWidth={0}>
            <Typography
                variant="h5"
                fontWeight={700}
                lineHeight={1.1}
                color={alert ? TONES[tone].fg : undefined}
                sx={{fontVariantNumeric: 'tabular-nums'}}
            >
                {value}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography variant="body2" color="textSecondary" noWrap title={hint}>
                    {label}
                </Typography>
                {link && <IconArrowRight size={14} style={{flexShrink: 0, opacity: 0.6}}/>}
            </Stack>
        </Box>
    </ButtonBase>
);
