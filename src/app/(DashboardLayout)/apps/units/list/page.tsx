"use client";

import PageContainer from "@/app/components/container/PageContainer";
import UnitList from "@/app/components/apps/units/list";

const unitListing = () => {
  return (
    <PageContainer title="Unit List" description="this is Unit List">
      <UnitList />
    </PageContainer>
  );
};

export default unitListing;
