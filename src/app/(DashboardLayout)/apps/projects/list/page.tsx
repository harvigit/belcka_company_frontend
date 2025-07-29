import React from "react";
import ProjectList from "@/app/components/apps/projects/list";
import { TeamProvider } from "@/app/context/TeamContext";
import { useRouter } from "next/router";

const ProjectListing = () => {
  const router = useRouter();
  const { projectId } = router.query; 

  const projectIdNumber = projectId ? parseInt(projectId as string) : null;

  return (
    <TeamProvider>
      <ProjectList projectId={projectIdNumber} />
    </TeamProvider>
  );
};

export default ProjectListing;
