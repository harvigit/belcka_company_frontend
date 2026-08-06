import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import InvoiceList from "@/app/components/apps/invoices/list";

const InvoiceListing = () => {
  return (
    <PageContainer title="Invoices" description="Invoices List">
      <BlankCard>
        <InvoiceList />
      </BlankCard>
    </PageContainer>
  );
};

export default InvoiceListing;
