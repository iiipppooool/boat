import type { Metadata } from "next";
import { LeaveWaitlist } from "@/components/LeaveWaitlist";

export const metadata: Metadata = {
  title: "Leave the waiting list",
  description: "Remove your address from the BoatXchange waiting list.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LeaveWaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <section className="section">
      <div className="wrap" style={{ maxWidth: "var(--wrap-narrow)" }}>
        <p className="eyebrow">Waiting list</p>
        <h1 className="mb-6">Leave the list</h1>
        <p className="lede mb-6">
          Confirm the address below and we will take it off. No follow-up, no
          &ldquo;are you sure&rdquo; email, no survey.
        </p>
        <LeaveWaitlist defaultEmail={email ?? ""} />
      </div>
    </section>
  );
}
