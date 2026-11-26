import { WorkspaceClient } from "@/components/workspace/WorkspaceClient";
import { listWorkspaceData } from "@/lib/issues-service";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const data = await listWorkspaceData();

  return (
    <Suspense
      fallback={
        <div className="p-6 text-xs text-zinc-500">
          Cargando workspace de PulseIssues...
        </div>
      }
    >
      <WorkspaceClient
        initialIssues={data.issues}
        initialLabels={data.labels}
        initialProject={data.project}
      />
    </Suspense>
  );
}
