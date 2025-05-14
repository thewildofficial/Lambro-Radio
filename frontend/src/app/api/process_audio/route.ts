import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    
    const backendResponse = await fetch(`${BACKEND_URL}/process_audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!backendResponse.ok) {
      // Try to parse error response
      let errorDetail = 'Failed to process audio';
      try {
        const errorData = await backendResponse.json();
        errorDetail = errorData.detail || errorDetail;
      } catch (e) {
        console.error('Error parsing error response:', e);
      }
      
      return NextResponse.json(
        { error: errorDetail },
        { status: backendResponse.status }
      );
    }
    
    // For streaming responses, we need to forward the response body
    const responseBody = await backendResponse.arrayBuffer();
    
    // Create a new response with the same status and headers
    return new NextResponse(responseBody, {
      status: backendResponse.status,
      headers: {
        'Content-Type': backendResponse.headers.get('Content-Type') || 'audio/wav',
      },
    });
  } catch (error) {
    console.error('Error proxying process_audio request:', error);
    return NextResponse.json(
      { error: 'Internal server error while processing audio' },
      { status: 500 }
    );
  }
}

// Increase the body size limit for audio processing
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}; 