import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import ProductList from "@/app/components/apps/products/list";

const ProductListing = () => {
  return (
    <PageContainer title="Product List" description="this is Product List">
      <BlankCard>
        <ProductList />
      </BlankCard>
    </PageContainer>
  );
};
export default ProductListing;
