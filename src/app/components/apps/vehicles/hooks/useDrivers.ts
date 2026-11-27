'use client';
import {useEffect, useState} from 'react';
import api from '@/utils/axios';
import {DriverOption} from './useVehicles';

export function useDrivers(companyId?: number | null) {
    const [drivers, setDrivers] = useState<DriverOption[]>([]);

    useEffect(() => {
        if (!companyId) {
            setDrivers([]);
            return;
        }
        let cancelled = false;
        api.get('vehicles/get-drivers')
            .then((res) => !cancelled && setDrivers(res.data?.info ?? []))
            .catch(() => undefined); // the API's message is already shown
        return () => {
            cancelled = true;
        };
    }, [companyId]);

    return drivers;
}
