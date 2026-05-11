import Link from 'next/link';
import { DemoShell } from '../../../src/components/demo-shell';
import { PhoneAuthFlow } from '../../../src/components/phone-auth-flow';

export default function LoginPage() {
  return (
    <DemoShell
      title="Войти в RAQET"
      description="Продолжите матч, бронь корта или работу с клубом через быстрый вход по телефону."
    >
      <PhoneAuthFlow mode="login" />
      <p className="helper-copy">
        Впервые в RAQET?{' '}
        <Link href="/auth/register" className="inline-link">
          Присоединиться
        </Link>
      </p>
    </DemoShell>
  );
}
