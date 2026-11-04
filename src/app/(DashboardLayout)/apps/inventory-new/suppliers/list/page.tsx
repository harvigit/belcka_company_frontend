import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import NewSupplierList from "@/app/components/apps/inventory-new/new-suppliers/list";

const NewSupplierListing = () => {
  return (
    <PageContainer title="Suppliers" description="this is Inventory New Suppliers">
      <BlankCard>
        <NewSupplierList />
      </BlankCard>
    </PageContainer>
  );
};
export default NewSupplierListing;
