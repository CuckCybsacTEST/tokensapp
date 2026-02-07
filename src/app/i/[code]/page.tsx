import { InvitationValidateClient } from "./InvitationValidateClient";

export const dynamic = "force-dynamic";

export default function InvitationPage({ params }: { params: { code: string } }) {
  return <InvitationValidateClient code={params.code} />;
}
