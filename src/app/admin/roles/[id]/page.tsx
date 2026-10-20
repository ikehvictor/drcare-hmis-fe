import { Suspense } from "react";
import { RoleDetail } from "@/components/pages/role-detail";

// Role ids can be created in the browser, so the role editor renders client-side.
export default function RoleDetailPage() {
  return (
    <Suspense>
      <RoleDetail />
    </Suspense>
  );
}
