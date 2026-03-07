import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Github } from "lucide-react";

interface Project {
  name: string;
  github: string;
  vercel_url: string;
  deployed_at: string;
  prd_source: string;
  description: string;
}

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold truncate">{project.name}</h3>
            <Badge variant="secondary" className="text-[10px] shrink-0">
              Live
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {project.description}
          </p>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Deployed: {project.deployed_at}
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {project.vercel_url && !project.vercel_url.startsWith("pending") && (
          <a href={project.vercel_url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
              <ExternalLink className="h-3 w-3" />
              Visit
            </Button>
          </a>
        )}
        <a href={project.github} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
            <Github className="h-3 w-3" />
            GitHub
          </Button>
        </a>
      </div>
    </Card>
  );
}
