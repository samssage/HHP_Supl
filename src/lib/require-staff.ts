import "server-only";
import { headers } from "next/headers";
import { accessRequired, validStaffAuthorization } from "./access";

export async function requireStaff() {
  if (accessRequired() && !validStaffAuthorization((await headers()).get("authorization"))) {
    throw new Error("Staff sign-in is required.");
  }
}
