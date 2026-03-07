import { readFileSync } from "fs";
import { join } from "path";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Shield, Server, GitBranch, Plug } from "lucide-react";

const ENV_KEYS = [
  "DEEPSEEK_API_KEY",
  "CLICKUP_API_TOKEN",
  "MONGODB_URI",
  "AUTH_SECRET",
  "ADMIN_USER",
  "ADMIN_PASSWORD",
  "ADMIN_EMAIL",
];

function getConfig() {
  try {
    return JSON.parse(
      readFileSync(join(process.cwd(), "config/bee-config.json"), "utf-8")
    );
  } catch {
    return null;
  }
}

function getPackageVersion() {
  try {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf-8")
    );
    return {
      name: pkg.name,
      nextVersion: pkg.dependencies?.next ?? "unknown",
    };
  } catch {
    return { name: "unknown", nextVersion: "unknown" };
  }
}

export default async function SettingsPage() {
  const user = await requireUser();

  const config = getConfig();
  const pkg = getPackageVersion();

  const envStatus = ENV_KEYS.map((key) => ({
    key,
    isSet: !!process.env[key],
  }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          System configuration and status
        </p>
      </div>

      {/* Environment Variables */}
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Environment Variables
        </h3>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {envStatus.map((env) => (
            <div
              key={env.key}
              className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5"
            >
              <code className="text-xs">{env.key}</code>
              <Badge
                variant="secondary"
                className={
                  env.isSet
                    ? "text-[10px] border-green-500/30 text-green-400"
                    : "text-[10px] border-red-500/30 text-red-400"
                }
              >
                {env.isSet ? "SET" : "UNSET"}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* System Info */}
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
          <Server className="h-4 w-4" />
          System Info
        </h3>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">App</span>
            <span>{pkg.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Next.js</span>
            <span>{pkg.nextVersion}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Node</span>
            <span>{process.version}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Session</span>
            <span>{user.email}</span>
          </div>
        </div>
      </Card>

      {/* MCP Tools */}
      {config?.mcp_tools && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
            <Plug className="h-4 w-4" />
            MCP Integrations
          </h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {Object.entries(config.mcp_tools).map(
              ([name, tool]: [string, any]) => (
                <div
                  key={name}
                  className="rounded-md bg-muted/50 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">
                      {name}
                    </span>
                    <Badge
                      variant="secondary"
                      className={
                        tool.status === "connected"
                          ? "text-[10px] border-green-500/30 text-green-400"
                          : "text-[10px] border-yellow-500/30 text-yellow-400"
                      }
                    >
                      {tool.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {tool.capabilities?.length ?? 0} capabilities
                  </p>
                </div>
              )
            )}
          </div>
        </Card>
      )}

      {/* Infrastructure */}
      {config?.infrastructure && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Infrastructure
          </h3>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">VPS Provider</span>
              <span>{config.infrastructure.vps?.provider}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">VPS IP</span>
              <span className="font-mono text-xs">
                {config.infrastructure.vps?.ip}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">GitHub Org</span>
              <span>{config.infrastructure.github?.org}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Repo</span>
              <span>{config.infrastructure.github?.brain_repo}</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
