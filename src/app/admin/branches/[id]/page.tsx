import { Suspense } from "react";
import { BranchDetail } from "@/components/pages/branch-detail";

// Branch ids are created in the browser, so the detail view renders client-side.
export default function BranchDetailPage() {
  return (
    <Suspense>
      <BranchDetail />
    </Suspense>
  );
}
