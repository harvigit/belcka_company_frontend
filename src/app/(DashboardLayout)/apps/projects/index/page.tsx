import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import ProjectList from "@/app/components/apps/projects/index";
import { UserProvider } from "@/app/context/UserContext";

const ProjectListing = () => {
  return (
    <UserProvider>
      <PageContainer title="Project List" description="this is Project List">
        <ProjectList />
      </PageContainer>
    </UserProvider>
  );
};
export default ProjectListing;
