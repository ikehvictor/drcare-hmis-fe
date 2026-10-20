import { Suspense } from "react";
import { UserDetail } from "@/components/pages/user-detail";

// User ids can be created in the browser, so the profile renders client-side.
export default function UserDetailPage() {
  return (
    <Suspense>
      <UserDetail />
    </Suspense>
  );
}
