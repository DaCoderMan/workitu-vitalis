import { readFileSync } from "fs";
import { join } from "path";
import { requireUser } from "@/lib/auth";
import { ProjectCard } from "@/components/dashboard/project-card";
import { FolderGit2 } from "lucide-react";

function getProjects() {
  try {
    const config = JSON.parse(
      readFileSync(join(process.cwd(), "config/bee-config.json"), "utf-8")
    );
    return config.deployed_projects ?? [];
  } catch {
    return [];
  }
}

export default async function ProjectsPage() {
  await requireUser();

  const projects = getProjects();

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <FolderGit2 className="h-5 w-5 text-violet-500" />
          <h1 className="text-2xl font-bold">Projects</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          All deployed Vercel projects managed by Ria
        </p>
      </div>

      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">No projects deployed yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: Record<string, string>) => (
            <ProjectCard key={project.name} project={project as any} />
          ))}
        </div>
      )}
    </div>
  );
}
