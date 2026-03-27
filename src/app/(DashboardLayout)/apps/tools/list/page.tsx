import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import ToolsList from "@/app/components/apps/tools/list";

const ToolListing = () => {
  return (
    <PageContainer title="Tool List" description="this is Tool List">
      <BlankCard>
        <ToolsList />
      </BlankCard>
    </PageContainer>
  );
};
export default ToolListing;
