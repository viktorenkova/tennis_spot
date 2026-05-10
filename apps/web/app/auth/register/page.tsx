import Link from 'next/link';
import { DemoShell } from '../../../src/components/demo-shell';
import { PhoneAuthFlow } from '../../../src/components/phone-auth-flow';
import { Notice } from '../../../src/components/ui';

export default function RegisterPage() {
  return (
    <DemoShell
      title="Регистрация"
      description="Подтвердите телефон, выберите роль и перейдите к заполнению профиля."
    >
      <Notice>
        Игроки могут сразу заполнить профиль и искать корты. Партнёры после регистрации добавляют
        данные организации и отправляют профиль на проверку.
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
