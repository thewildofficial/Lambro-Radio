import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    
    const backendResponse = await fetch(`${BACKEND_URL}/get_audio_info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    const responseData = await backendResponse.json();
    
    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: responseData.detail || 'Failed to fetch audio info from backend' },
        { status: backendResponse.status }
      );
    }
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error proxying get_audio_info request:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching audio info' },
      { status: 500 }
    );
  }
} 