import { toast } from "sonner";
import { authApi } from "./api";

/** Superadmin applies immediately; other admins queue a change request. */
export async function requestOrApply({
  isSuperadmin,
  feature,
  action,
  resourceType,
  resourceId,
  payload,
  previous,
  title,
  apply,
}) {
  if (isSuperadmin) {
    await apply();
    return { queued: false };
  }
  await authApi.submitChangeRequest({
    feature,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    title,
    payload: payload || {},
    previous: previous || {},
  });
  toast.success("Submitted for approval. Track progress under Approvals → My requests.");
  return { queued: true };
}
