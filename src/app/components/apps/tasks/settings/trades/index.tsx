'use client';

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
    Box,
    CircularProgress,
    InputAdornment,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import {IconSearch} from '@tabler/icons-react';
import {useSession} from 'next-auth/react';
import {User} from 'next-auth';
import toast from 'react-hot-toast';
import IOSSwitch from '@/app/components/common/IOSSwitch';
import api from '@/utils/axios';

type CheckinTrade = {
    id: number;
    name: string;
    is_checkin_enabled: boolean;
};

const TaskTradeCheckinSettings: React.FC = () => {
    const session = useSession();
    const user = session.data?.user as User & {company_id?: number | null};
    const [loading, setLoading] = useState(true);
    const [savingTradeId, setSavingTradeId] = useState<number | null>(null);
    const [trades, setTrades] = useState<CheckinTrade[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchTrades = useCallback(async () => {
        if (!user?.company_id) return;

        setLoading(true);
        try {
            const res = await api.get(`trade/checkin-trades?company_id=${user.company_id}`);
            setTrades(Array.isArray(res.data?.info) ? res.data.info : []);
        } catch (error) {
            console.error('Failed to load check-in trades:', error);
            toast.error('Failed to load trades');
        } finally {
            setLoading(false);
        }
    }, [user?.company_id]);

    useEffect(() => {
        fetchTrades();
    }, [fetchTrades]);

    const filteredTrades = useMemo(() => {
        const searchWords = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);
        if (!searchWords.length) return trades;

        return trades.filter((trade) => {
            const searchText = [trade.name].filter(Boolean).join(' ').toLowerCase();
            return searchWords.every((word) => searchText.includes(word));
        });
    }, [searchTerm, trades]);

    const handleToggleTrade = async (trade: CheckinTrade, checked: boolean) => {
        if (!user?.company_id || savingTradeId) return;

        const previousTrades = trades;
        setSavingTradeId(trade.id);
        setTrades((prev) =>
            prev.map((item) =>
                item.id === trade.id ? {...item, is_checkin_enabled: checked} : item,
            ),
        );

        try {
            const res = await api.put('trade/change-checkin-trade-status', {
                company_id: user.company_id,
                trade_id: trade.id,
                is_checkin_enabled: checked,
            });

            if (!res.data?.IsSuccess) {
                setTrades(previousTrades);
                toast.error(res.data?.message || 'Failed to update trade');
                return;
            }

            toast.success(res.data?.message || 'Trade updated');
        } catch (error: any) {
            setTrades(previousTrades);
            toast.error(error?.response?.data?.message || 'Failed to update trade');
        } finally {
            setSavingTradeId(null);
        }
    };

    return (
        <Box sx={{p: 2, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', gap: 2}}>
            <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2}}>
                <TextField
                    size="small"
                    placeholder="Search trade"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <IconSearch size={18}/>
                            </InputAdornment>
                        ),
                    }}
                    sx={{width: 280}}
                />
            </Box>

            <TableContainer component={Paper} sx={{flex: 1, overflow: 'auto', border: '1px solid #e2e8f0'}}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{fontWeight: 700, bgcolor: '#f8fafc'}}>Trade</TableCell>
                            <TableCell align="center" sx={{fontWeight: 700, bgcolor: '#f8fafc'}}>
                                Show in Check-in
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading && (
                            <TableRow>
                                <TableCell colSpan={3} align="center" sx={{py: 8}}>
                                    <CircularProgress/>
                                </TableCell>
                            </TableRow>
                        )}

                        {!loading && filteredTrades.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} align="center" sx={{py: 8, color: '#64748b'}}>
                                    No trades found
                                </TableCell>
                            </TableRow>
                        )}

                        {!loading && filteredTrades.map((trade) => (
                            <TableRow key={trade.id} hover>
                                <TableCell sx={{borderRight: '1px solid #e2e8f0'}}>
                                    {trade.name || '-'}
                                </TableCell>
                                
                                <TableCell align="center">
                                    <IOSSwitch
                                        checked={Boolean(trade.is_checkin_enabled)}
                                        disabled={savingTradeId === trade.id}
                                        onChange={(event) => handleToggleTrade(trade, event.target.checked)}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Typography sx={{fontSize: '0.8rem', color: '#64748b', pl: 1}}>
                {filteredTrades.length} trade{filteredTrades.length === 1 ? '' : 's'}
            </Typography>
        </Box>
    );
};

export default TaskTradeCheckinSettings;
