import "server-only";
import { accessRequired, isMember, isStaff } from "./access";
import { authClient } from "./auth-server";

export async function requireMember() {
  if (!accessRequired()) return null;
  const { data: { user }, error } = await (await authClient()).auth.getUser();
  if (error || !isMember(user)) throw new Error("Sign-in with a confirmed email is required.");
  return user;
}

export async function currentStaff() {
  if (!accessRequired()) return true;
  const { data: { user }, error } = await (await authClient()).auth.getUser();
  return !error && isStaff(user);
}

export async function requireStaff() {
  const user = await requireMember();
  if (accessRequired() && !isStaff(user)) throw new Error("Staff approval is required.");
  return user;
}
