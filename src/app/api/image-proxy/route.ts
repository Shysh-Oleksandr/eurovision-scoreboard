import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { error: 'Missing url parameter' },
      { status: 400 },
    );
  }

  // Only allow HTTPS URLs for security
  if (!url.startsWith('https://')) {
    return NextResponse.json(
      { error: 'Only HTTPS URLs are allowed' },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DouzePoints.app Image Proxy',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status}` },
        { status: response.status },
      );
    }

    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');

    // Only allow image content types
    if (!contentType?.startsWith('image/')) {
      return NextResponse.json(
        { error: 'URL does not point to an image' },
        { status: 400 },
      );
    }

    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Content-Length': contentLength || imageBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy image' },
      { status: 500 },
    );
  }
}
