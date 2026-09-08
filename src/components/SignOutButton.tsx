"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Sign out. A POST-shaped action behind a button, never a link — a GET that
 *  ends your session can be triggered by anything that follows a URL. */
export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      className="link-button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/account/session", { method: "DELETE" });
        router.refresh();
        router.push("/");
      }}
    >
      {busy ? "Signing out…" : "sign out"}
    </button>
  );
}
