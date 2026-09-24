import "server-only";
import { accessRequired, isStaff } from "./access";
import { authClient } from "./auth-server";

export async function requireStaff() {
  if (!accessRequired()) return;
  const { data: { user }, error } = await (await authClient()).auth.getUser();
  if (error || !isStaff(user)) throw new Error("Staff sign-in and approval are required.");
}
