import { AdminVerificationRequestDetailsPage } from '../../../../src/components/admin-verification-request-details-page';

export default async function VerificationRequestDetailsRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AdminVerificationRequestDetailsPage requestId={id} />;
}
