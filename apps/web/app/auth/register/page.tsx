import Link from 'next/link';
import { DemoShell } from '../../../src/components/demo-shell';
import { PhoneAuthFlow } from '../../../src/components/phone-auth-flow';
import { Notice } from '../../../src/components/ui';

export default function RegisterPage() {
  return (
    <DemoShell
      title="Регистрация"
      description="Подтвердите телефон, выберите сценарий и перейдите к заполнению профиля игрока или партнёра."
    >
      <Notice>
        Администратор не регистрируется публично. Доступ администратора остаётся через
        seeded account или закрытый server-side процесс.
      </Notice>
      <PhoneAuthFlow mode="register" />
      <p className="helper-copy">
        Уже есть аккаунт?{' '}
        <Link href="/auth/login" className="inline-link">
          Войти
        </Link>
      </p>
    </DemoShell>
  );
}
