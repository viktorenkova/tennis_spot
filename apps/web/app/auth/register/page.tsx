import Link from 'next/link';
import { DemoShell } from '../../../src/components/demo-shell';
import { PhoneAuthFlow } from '../../../src/components/phone-auth-flow';
import { Notice } from '../../../src/components/ui';

export default function RegisterPage() {
  return (
    <DemoShell
      title="Присоединиться к RAQET"
      description="Подтвердите телефон, выберите роль и начните свой путь в современном теннисном сообществе."
    >
      <Notice>
        Игроки сразу переходят к профилю, матчам и поиску кортов. Клубы добавляют площадки,
        расписание и проходят проверку перед публикацией.
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
