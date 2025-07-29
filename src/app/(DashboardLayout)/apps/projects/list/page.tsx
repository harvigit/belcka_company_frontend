import React from "react";
import ProjectList from "@/app/components/apps/projects/list";
import { TeamProvider } from "@/app/context/TeamContext";

const ProjectListing = ({ projectId }: { projectId: number | null }) => {
  return (
    <TeamProvider>
        <ProjectList projectId={projectId}/>
    </TeamProvider>
  );
}
export default ProjectListing;
