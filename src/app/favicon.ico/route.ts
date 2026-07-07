import { NextResponse } from 'next/server';
import { getPublicSettings } from '@/lib/settings';

export const revalidate = 60; // Cache setting for 60 seconds

export async function GET() {
  try {
    const settings = await getPublicSettings();
    const faviconPath = settings['site_favicon'];

    if (faviconPath) {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const apiMediaUrl = apiBaseUrl.replace('/api', '');
      const MEDIA_BASE = apiMediaUrl ? `${apiMediaUrl}/storage/` : '/storage/';
      
      const url = faviconPath.startsWith('http') 
        ? faviconPath 
        : `${MEDIA_BASE}${faviconPath}`;
        
      return NextResponse.redirect(url, 307);
    }
  } catch (error) {
    console.error('Error fetching dynamic favicon:', error);
  }

  // Fallback to a default icon from the public folder
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return NextResponse.redirect(`${appUrl}/icons/icon-192x192.png`, 307);
}
