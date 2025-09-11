import {Table, TableBody, TableCell, TableHead, TableRow, Typography} from '@mui/material';
import React from 'react';
type CheckLog = {
    pricework_amount: React.ReactNode;
    task_name: string;
    checklog_id: number;
    date_added: string;
    address_id: number;
    address_name: string;
    checkin_time: string;
    checkout_time: string;
    total_hours: number;
};

interface CheckLogRowsProps {
    logs: CheckLog[];
    currency: string;
    formatHour: (val: string | number | null | undefined) => string;
    visibleColumnConfigs: { [key: string]: { width: number; visible: boolean } };
    getVisibleCellsLength: number;
    isMultiRow?: boolean;
}

const CheckLogRows = ({logs, currency, formatHour, visibleColumnConfigs, getVisibleCellsLength, isMultiRow = false }: CheckLogRowsProps) => {
    return (
        <TableRow>
            {visibleColumnConfigs.select?.visible && <TableCell></TableCell>}
            {isMultiRow && visibleColumnConfigs.date?.visible && <TableCell></TableCell>}
            {!isMultiRow && visibleColumnConfigs.date?.visible && <TableCell></TableCell>}
            {!isMultiRow && visibleColumnConfigs.exclamation?.visible && <TableCell></TableCell>}
            {!isMultiRow && visibleColumnConfigs.expander?.visible && <TableCell></TableCell>}

            <TableCell sx={{padding: 0}} colSpan={getVisibleCellsLength}>
                {logs?.length > 0 ? (
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ color: "#4a4a4e !important"}}>
                                <TableCell className="check_log_list_cell">
                                    Address
                                </TableCell>
                                <TableCell className="check_log_list_cell">
                                    Task
                                </TableCell>
                                <TableCell className="check_log_list_cell">
                                    Check In
                                </TableCell>
                                <TableCell className="check_log_list_cell">
                                    Check Out
                                </TableCell>
                                <TableCell className="check_log_list_cell">
                                    Hours
                                </TableCell>
                                <TableCell className="check_log_list_cell">
                                    Amount
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {logs.map((checklog: CheckLog) => (
                                <TableRow key={checklog.checklog_id}>
                                    <TableCell sx={{py: 0.5}}>
                                        {checklog.address_name}
                                    </TableCell>
                                    <TableCell sx={{py: 0.5}}>
                                        {checklog.task_name || '--'}
                                    </TableCell>
                                    <TableCell sx={{py: 0.5}}>
                                        {checklog.checkin_time}
                                    </TableCell>
                                    <TableCell sx={{py: 0.5}}>
                                        {checklog.checkout_time}
                                    </TableCell>
                                    <TableCell sx={{py: 0.5}}>
                                        {formatHour(checklog.total_hours)}
                                    </TableCell>
                                    <TableCell sx={{py: 0.5}}>
                                        {checklog.pricework_amount ? `${currency}${checklog.pricework_amount}` : `${currency}0`}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        fontStyle="italic"
                        sx={{ p: 1 }}
                    >
                        This worklog has no checklogs
                    </Typography>
                )}
            </TableCell>
        </TableRow>
    );
};

export default CheckLogRows;
