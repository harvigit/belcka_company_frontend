import { useSession } from "next-auth/react";

export const useCompanySync = () => {
    const { update } = useSession();

    const syncCompany = async (companyData: any) => {
        await update({
            company_id: companyData.id,
            company_name: companyData.name,
            company_image: companyData.image,
            trade_name: companyData.trade_name,
            trade_id: companyData.trade_id,
            currency_id: companyData.currency_id,
        });
    };

    return { syncCompany };
};