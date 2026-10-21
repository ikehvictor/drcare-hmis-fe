import { Badge } from "@/components/ui";
import type { UserStatus } from "@/lib/types";

const TONE = { active: "success", suspended: "danger" } as const;
const LABEL: Record<UserStatus, string> = { active: "Active", suspended: "Suspended" };

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return <Badge tone={TONE[status]}>{LABEL[status]}</Badge>;
}
