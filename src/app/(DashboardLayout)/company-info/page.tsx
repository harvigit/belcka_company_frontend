import React from "react";
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import Company from "@/app/components/apps/company-info";
import BlankCard from "@/app/components/shared/BlankCard";
import { CompanyProvider } from "@/app/context/CompanyContext";

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Company Info",
  },
];

const CompanyInfo = () => {
  return (
    <CompanyProvider>
      <PageContainer title="Company Info" description="this is Company Info">
        <Breadcrumb title="Company Info" items={BCrumb} />
        <BlankCard>
          {/* <CardContent> */}
            <Company />
          {/* </CardContent> */}
        </BlankCard>
      </PageContainer>
    </CompanyProvider>
  );
}
export default CompanyInfo;
