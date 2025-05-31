import { NextRequest, NextResponse } from 'next/server';

// This route now proxies to our Python Vercel Function
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    
    // Call our Python Vercel Function
    const response = await fetch(`${request.nextUrl.origin}/api/get_audio_info.py`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in get_audio_info route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 