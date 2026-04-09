import Link from 'next/link';
import { DemoShell } from '../src/components/demo-shell';
import { Card, Notice } from '../src/components/ui';

const demoFlows = [
  {
    href: '/demo/auth',
    title: 'Demo auth',
    copy: 'Sign in as demo-player, demo-partner, demo-admin or review-partner.',
  },
  {
    href: '/me/player',
    title: 'Player profile',
    copy: 'Create or update the player profile over the live REST API.',
  },
  {
    href: '/me/partner',
    title: 'Partner profile',
    copy: 'Create the partner profile that will later go into verification review.',
  },
  {
    href: '/me/partner/verification',
    title: 'Verification submission',
    copy: 'Submit the partner verification request and inspect current status.',
  },
  {
    href: '/admin/verification-requests',
    title: 'Admin review queue',
    copy: 'Review seeded requests or the ones created during the current demo session.',
  },
];

export default function HomePage() {
  return (
    <DemoShell
      title="Reviewable MVP slice"
      description="This iteration closes one real business loop end-to-end: auth, profiles, verification submission and admin moderation."
    >
      <div className="split-grid">
        <Card accent>
          <h3>What is already wired</h3>
          <ul className="bullet-list">
            <li>Dev-friendly demo auth on top of the existing JWT auth architecture.</li>
            <li>Player and partner profile CRUD backed by PostgreSQL/Prisma endpoints.</li>
            <li>Partner verification submission with admin-only review actions.</li>
            <li>Audit log entries for verification submission and admin decisions.</li>
          </ul>
        </Card>

        <Card>
          <h3>How to review quickly</h3>
          <ol className="ordered-list">
            <li>Open Demo auth and sign in as `demo-partner` to create/update partner data.</li>
            <li>Submit a verification request on the verification page.</li>
            <li>Switch to `demo-admin` and open the admin queue.</li>
            <li>Review one request and change its status.</li>
          </ol>
        </Card>
      </div>

      <Notice title="Fast-path demo">
        Seed also creates `review-partner` with a submitted verification request, so the admin flow
        can be reviewed immediately after local startup.
      </Notice>

      <div className="demo-grid">
        {demoFlows.map((flow) => (
          <Link key={flow.href} href={flow.href} className="feature-link">
            <span className="feature-title">{flow.title}</span>
            <span className="feature-copy">{flow.copy}</span>
          </Link>
        ))}
      </div>
    </DemoShell>
  );
}
