import { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata: Metadata = {
  title: 'Create Account | Secure File Sharing',
  description: 'Create a new Secure File Sharing account',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
