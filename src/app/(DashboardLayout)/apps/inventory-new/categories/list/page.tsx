import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import NewCategoryList from "@/app/components/apps/inventory-new/new-categories/list";

const NewCategoryListing = () => {
  return (
    <PageContainer title="Categories" description="this is Inventory New Categories">
      <BlankCard>
        <NewCategoryList />
      </BlankCard>
    </PageContainer>
  );
};
export default NewCategoryListing;
