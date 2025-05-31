import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const backendResponse = await fetch(`${BACKEND_URL}/keep-alive`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    const responseData = await backendResponse.json();
    
    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: responseData.detail || 'Failed to ping backend' },
        { status: backendResponse.status }
      );
    }
    
    return NextResponse.json({
      ...responseData,
      frontend_status: "alive",
      backend_pinged: true
    });
  } catch (error) {
    console.error('Error pinging backend keep-alive:', error);
    return NextResponse.json(
      { 
        error: 'Failed to reach backend',
        frontend_status: "alive",
        backend_pinged: false 
      },
      { status: 503 }
    );
  }
}
