'use client';

import { useSessionTimeout } from '@/hooks/useSessionTimeout';

export default function SessionTimeoutWrapper({ children }) {
  // Initialize the session timeout hook
  useSessionTimeout();

  return <>{children}</>;
}
