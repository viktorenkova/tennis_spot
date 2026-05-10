import Link from 'next/link';
import { DemoShell } from '../../../src/components/demo-shell';
import { PhoneAuthFlow } from '../../../src/components/phone-auth-flow';

export default function LoginPage() {
  return (
    <DemoShell
      title="Вход"
      description="Войдите по телефону, чтобы продолжить бронирование, управление площадкой или работу с заявками."
    >
      <PhoneAuthFlow mode="login" />
      <p className="helper-copy">
        Новый пользователь?{' '}
        <Link href="/auth/register" className="inline-link">
          Зарегистрироваться
        </Link>
      </p>
    </DemoShell>
  );
}
