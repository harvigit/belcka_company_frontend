'use client';
import React, {useMemo} from 'react';
import {Chip, Stack, Tab, Tabs} from '@mui/material';
import {IconSettings} from '@tabler/icons-react';
import {usePathname, useRouter} from 'next/navigation';
import {buildActions} from './actions';
import {Defect, DriverLicence, ImportConflict, ParkingPermit, Vehicle, VehicleEvent, VehicleOnboarding} from './types';

const ITEMS = [
    {href: '/apps/vehicles/list', label: 'Vehicles', count: '' as const},
    {href: '/apps/vehicles/action-centre', label: 'Action Centre', count: 'actions' as const},
    {href: '/apps/vehicles/drivers', label: 'Drivers', count: '' as const},
    {href: '/apps/vehicles/expenses', label: 'Expenses', count: 'expenses' as const},
    {href: '/apps/vehicles/map', label: 'Map', count: '' as const},
    {href: '/apps/vehicles/fuel-cards', label: 'Fuel cards', count: '' as const},
    {href: '/apps/vehicles/road-costs', label: 'Road costs', count: 'conflicts' as const},
    {href: '/apps/vehicles/permits', label: 'Permits', count: 'permits' as const},
    {href: '/apps/vehicles/activity', label: 'Activity', count: '' as const},
    {href: '/apps/vehicles/settings', label: 'Settings', count: '' as const},
];

export interface FleetNavData {
    vehicles: Vehicle[];
    events: VehicleEvent[];
    defects: Defect[];
    permits: ParkingPermit[];
    onboardings: VehicleOnboarding[];
    licences: DriverLicence[];
    conflicts: ImportConflict[];
}

const FleetNav: React.FC<{ data: FleetNavData }> = ({data}) => {
    const router = useRouter();
    const pathname = usePathname() ?? '';
    const current = ITEMS.find((i) => pathname.startsWith(i.href))?.href ?? ITEMS[0].href;

    const actions = useMemo(() => buildActions(data), [data]);
    const urgent = actions.filter((a) => a.priority !== 'normal').length;
    const expenses = data.events.filter((e) => e.status === 'pending').length;
    const openConflicts = data.conflicts.filter((c) => !c.resolved).length;
    const archived = new Set(data.vehicles.filter((v) => v.status === 'archived').map((v) => v.id));
    const pendingPermits = data.permits.filter((p) => p.status === 'pending' && !archived.has(p.vehicle_id)).length;

    const badge = (key: (typeof ITEMS)[number]['count']) => {
        if (key === 'actions' && actions.length > 0)
            return <Chip size="small" color={urgent > 0 ? 'error' : 'primary'} label={actions.length}
                         sx={{height: 20}}/>;
        if (key === 'conflicts' && openConflicts > 0)
            return <Chip size="small" color="error" label={openConflicts} sx={{height: 20}}/>;
        if (key === 'permits' && pendingPermits > 0)
            return <Chip size="small" color="warning" label={pendingPermits} sx={{height: 20}}/>;
        if (key === 'expenses' && expenses > 0)
            return <Chip size="small" color="warning" label={expenses} sx={{height: 20}}/>;
        return null;
    };

    return (
        <Tabs
            value={current}
            onChange={(_, href: string) => router.push(href)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{px: 2, borderBottom: 1, borderColor: 'divider'}}
        >
            {ITEMS.map((item) => (
                <Tab
                    key={item.href}
                    value={item.href}
                    label={
                        <Stack direction="row" spacing={0.75} alignItems="center">
                            {item.label === 'Settings' && <IconSettings size={16}/>}
                            <span>{item.label}</span>
                            {badge(item.count)}
                        </Stack>
                    }
                />
            ))}
        </Tabs>
    );
};

export default FleetNav;
