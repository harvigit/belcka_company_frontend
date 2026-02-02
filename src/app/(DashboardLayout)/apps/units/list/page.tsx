import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import UnitList from "@/app/components/apps/units/list";

const unitListing = () => {
  return (
    <PageContainer title="Unit List" description="this is Unit List">
      <BlankCard>
        <UnitList />
      </BlankCard>
    </PageContainer>
  );
};
export default unitListing;
