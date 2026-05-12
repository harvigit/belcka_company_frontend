"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

export default function CompanySyncProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const { update } = useSession();

    useEffect(() => {
        const handler = async (event: any) => {
            const company = event.detail;

            await update({
                company_id: company.id,
                company_name: company.name,
                company_image: company.image,
                trade_name: company.trade_name,
                trade_id: company.trade_id,
                currency_id: company.currency_id,
            });
        };

        window.addEventListener(
            "company-changed",
            handler,
        );

        return () => {
            window.removeEventListener(
                "company-changed",
                handler,
            );
        };
    }, [update]);

    return <>{children}</>;
}