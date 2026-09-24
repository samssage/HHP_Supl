import { authConfig } from "@/lib/access";
import CompleteInvitation from "./CompleteInvitation";
export const dynamic = "force-dynamic";
export default function Callback() {
  const config = authConfig();
  return config ? <CompleteInvitation url={config.url} publicKey={config.key} /> : <p>Sign-in is being set up. Please check back shortly.</p>;
}
