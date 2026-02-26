import { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Sign In | Secure File Sharing',
  description: 'Sign in to your Secure File Sharing account',
};

export default function LoginPage() {
  return <LoginForm />;
}
