import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 1x1 transparent GIF baseline base64 to prevent broken image icons on the client side
const FALLBACK_GIF_B64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const MAX_PAYLOAD_SIZE = 15 * 1024 * 1024; // Limit to 15MB to prevent memory exhausting during DoS

/**
 * Validates whether the requested target URL is safe to download (prevent SSRF attacks).
 * Normalizes hostnames through `URL` parsing, preventing local, metadata, or loopback requests.
 */
function isSafeUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname.toLowerCase();

    // Ensure it's strictly HTTP or HTTPS
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    // Block common loopback and local resolving names
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '[::1]' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.localhost')
    ) {
      return false;
    }

    // Block Link-Local and Cloud Provider Metadata servers (AWS / GCP / Azure)
    if (hostname === '169.254.169.254' || hostname.startsWith('169.254.')) {
      return false;
    }

    // Prevent direct routing to standard private network blocks
    // 10.0.0.0/8
    if (hostname.startsWith('10.')) return false;
    // 172.16.0.0 - 172.31.255.255 (class B private networks)
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) return false;
    // 192.168.0.0/16
    if (hostname.startsWith('192.168.')) return false;
    // 127.0.0.0/8 (Additional loopback block protection)
    if (hostname.startsWith('127.')) return false;

    return true;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // 1. Host Validation (SSRF mitigation)
  if (!isSafeUrl(url)) {
    console.warn(`[Proxy Warning] Blocked suspicious URL routing for security (SSRF check failed): "${url}"`);
    return NextResponse.json(
      { error: 'Forbidden URL target. Access is restricted.' },
      { status: 403 }
    );
  }

  try {
    // Mimic standard web browser headers to bypass strict protection rules from targets like Unsplash or meteorology hubs
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000), // Strong 10-second timeout limit
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`Target responded with status code ${response.status}`);
    }

    // 2. Pre-emptively inspect Content-Length to protect system buffers
    const contentLengthHeader = response.headers.get('content-length');
    if (contentLengthHeader) {
      const parsedLength = parseInt(contentLengthHeader, 10);
      if (!isNaN(parsedLength) && parsedLength > MAX_PAYLOAD_SIZE) {
        throw new Error(`Content length exceeds secure proxy bounds (${parsedLength} > ${MAX_PAYLOAD_SIZE})`);
      }
    }

    // Download response payload array
    const buffer = await response.arrayBuffer();

    // Double-check the resulting byte payload size
    if (buffer.byteLength > MAX_PAYLOAD_SIZE) {
      throw new Error(`Buffer size exceeded the limits (${buffer.byteLength} bytes)`);
    }

    const contentType = response.headers.get('Content-Type') || 'image/jpeg';

    // 3. Strict Security Mitigation Headers (CORS / XSS protection)
    const customHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=31536000, immutable', // Optimize delivery speed with full client/network caching
      'X-Content-Type-Options': 'nosniff', // Disallow MIME type sniffing
      // Force sandbox & restrict scripts context so if someone proxies a loaded HTML or SVG page with malware,
      // it is isolated with CSP, execution of dynamic JavaScript inside the response context is blocked on our main origin.
      'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline';",
    };

    return new NextResponse(buffer, {
      headers: customHeaders,
      status: 200,
    });

  } catch (error: any) {
    console.warn(`[Proxy Request Failed] Target: "${url}". Active Fallback pixels sent. Reason:`, error?.message || error);

    // Gracefully recover by transmitting our clean transparent single-pixel backup image so UI stays visually pristine
    const fallbackBuffer = Buffer.from(FALLBACK_GIF_B64, 'base64');

    return new NextResponse(fallbackBuffer, {
      headers: {
        'Content-Type': 'image/gif',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=120', // Short-term validation index for offline/failed assets
        'X-Content-Type-Options': 'nosniff',
      },
      status: 200,
    });
  }
}
