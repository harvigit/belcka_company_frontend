'use client';
import React from 'react';
import {Button, Chip, Typography} from '@mui/material';
import {IconUserPlus} from '@tabler/icons-react';
import dayjs from 'dayjs';
import {DriverName} from '../shared';
import {DriverLog, formatDate, formatMiles, Vehicle, VehicleEvent} from '../lib/types';
import {RecordTable, Section} from '../shared/common';

interface DriversTabProps {
    vehicle: Vehicle;
    logs: DriverLog[];
    events: VehicleEvent[];
    readOnly: boolean;
    onAssign: () => void;
}

const DriversTab: React.FC<DriversTabProps> = ({vehicle, logs, events, readOnly, onAssign}) => {
    const today = dayjs().format('YYYY-MM-DD');
    const rows = [...logs]
        .sort((a, b) => b.from.localeCompare(a.from))
        .map((l) => {
            const end = l.to ?? today;
            const during = events.filter((e) => e.date >= l.from && e.date <= end);
            const readings = during.filter((e) => e.mileage).map((e) => e.mileage as number);
            return {
                ...l,
                days: dayjs(end).diff(dayjs(l.from), 'day'),
                records: during.length,
                miles: readings.length > 1 ? Math.max(...readings) - Math.min(...readings) : null,
            };
        });

    return (
        <Section
            title="Driver history"
            subtitle="Who had this vehicle and when. A new row starts every time the driver changes."
            actions={
                !readOnly && (
                    <Button variant="contained" startIcon={<IconUserPlus size={16} />} onClick={onAssign}>
                        {vehicle.driver_id ? 'Change driver' : 'Assign driver'}
                    </Button>
                )
            }
        >
            <RecordTable
                rows={rows}
                empty="Nobody has driven this vehicle yet."
                columns={[
                    {
                        header: 'Driver',
                        render: (r) => <DriverName name={r.driver_name} image={r.driver_image} />,
                    },
                    {header: 'From', render: (r) => formatDate(r.from)},
                    {
                        header: 'To',
                        render: (r) =>
                            r.to ? formatDate(r.to) : <Chip size="small" color="success" label="Current" />,
                    },
                    {header: 'Days', render: (r) => r.days},
                    {header: 'Miles recorded', render: (r) => (r.miles === null ? '-' : formatMiles(r.miles))},
                    {
                        header: 'Records',
                        render: (r) => (
                            <Typography variant="body2" color="textSecondary">
                                {r.records}
                            </Typography>
                        ),
                    },
                ]}
            />
        </Section>
    );
};

export default DriversTab;
