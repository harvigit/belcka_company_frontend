"use client";

import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import UnitList from "@/app/components/apps/units/list";
import { useState } from "react";

const unitListing = () => {
  const [open, setOpen] = useState(false);

  return (
    <PageContainer title="Unit List" description="this is Unit List">
      <BlankCard>
        <UnitList openDrawer={open} onClose={() => setOpen(false)} />;
      </BlankCard>
    </PageContainer>
  );
};

export default unitListing;
