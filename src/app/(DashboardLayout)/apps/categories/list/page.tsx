import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import CategoryList from "@/app/components/apps/categories/list";

const CategoryListing = () => {
  return (
    <PageContainer title="Category List" description="this is Category List">
      <BlankCard>
        <CategoryList />
      </BlankCard>
    </PageContainer>
  );
};
export default CategoryListing;
