import {useEffect, useState} from 'react';
import {useSession} from 'next-auth/react';
import api from '@/utils/axios';

export type BillingContact = {
    first_name: string;
    last_name: string;
    name: string;
    email: string;
};

// One profile request per user and company, shared by every component using the hook.
const cache = new Map<string, Promise<BillingContact | null>>();

const loadContact = (userId: number, companyId: number) => {
    const key = `${userId}:${companyId}`;
    if (!cache.has(key)) {
        cache.set(
            key,
            api
                .get(`user/profile?user_id=${userId}&company_id=${companyId}`, {skipToast: true} as any)
                .then((res) => {
                    const info = res.data?.info;
                    if (!info) return null;
                    const firstName = info.billing_first_name ?? info.first_name ?? '';
                    const lastName = info.billing_last_name ?? info.last_name ?? '';
                    return {
                        first_name: firstName,
                        last_name: lastName,
                        name: info.billing_name || `${firstName} ${lastName}`.trim(),
                        email: info.billing_email ?? info.email ?? '',
                    };
                })
                .catch(() => {
                    cache.delete(key);
                    return null;
                }),
        );
    }
    return cache.get(key)!;
};

// Signed-in user's name and email as shown across the app: billing info when the user has
// one for the active company, else the users table values from the session.
export function useBillingContact(): BillingContact {
    const {data} = useSession();
    const user = data?.user as any;
    const fallback: BillingContact = {
        first_name: user?.first_name ?? '',
        last_name: user?.last_name ?? '',
        name: `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim(),
        email: user?.email ?? '',
    };
    const [contact, setContact] = useState<BillingContact | null>(null);

    useEffect(() => {
        const userId = Number(user?.id);
        const companyId = Number(user?.company_id);
        if (!userId || !companyId) return;
        let active = true;
        loadContact(userId, companyId).then((value) => {
            if (active) setContact(value);
        });
        return () => {
            active = false;
        };
    }, [user?.id, user?.company_id]);

    return contact ?? fallback;
}
