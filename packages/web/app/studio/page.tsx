import { readSetupPending } from '@/lib/setup-state';
import ClientRedirect from '@/components/ClientRedirect';
import StudioOverviewContent from '@/components/studio/StudioOverviewContent';

export const dynamic = 'force-dynamic';

export default function StudioPage() {
  if (readSetupPending()) return <ClientRedirect href="/setup" label="Opening setup..." />;
  return <StudioOverviewContent />;
}
