'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useToken() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setToken(localStorage.getItem('admin_token'));
    setReady(true);
  }, []);

  return { token, ready };
}
