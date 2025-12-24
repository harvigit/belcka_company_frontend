import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import Company from "@/app/components/apps/company-info";
import BlankCard from "@/app/components/shared/BlankCard";

const CompanyInfo = () => {
  return (
    <PageContainer title="Company Info" description="this is Company Info">
      <BlankCard>
        <Company />
      </BlankCard>
    </PageContainer>
  );
};
export default CompanyInfo;
