import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import SupplierItemList from "@/app/components/apps/inventory-new/supplier-items";

const SupplierItemListing = () => {
  return (
    <PageContainer title="Supplier Items" description="this is Supplier Items">
      <BlankCard>
        <SupplierItemList />
      </BlankCard>
    </PageContainer>
  );
};
export default SupplierItemListing;
