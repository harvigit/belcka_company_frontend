import React from "react";
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import RequestList from "@/app/components/apps/requests/list";
import BlankCard from "@/app/components/shared/BlankCard";

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Request List",
  },
];

const RequestListing = () => {
  return (
    // <PermissionProvider>
      <PageContainer title="Request List" description="this is Request List">
        <Breadcrumb title="Request List" items={BCrumb} />
        <BlankCard>
          {/* <CardContent> */}
            <RequestList open={true} onClose={()=> {}}/>
          {/* </CardContent> */}
        </BlankCard>
      </PageContainer>
    // </PermissionProvider>
  );
}
export default RequestListing;
