'use client';

import { useEffect, useState } from 'react';

interface KeepAliveStatus {
  isActive: boolean;
  lastPing?: string;
  error?: string;
}

export default function KeepAlive() {
  const [status, setStatus] = useState<KeepAliveStatus>({ isActive: false });

  useEffect(() => {
    const pingBackend = async () => {
      try {
        const response = await fetch('/api/keep-alive');
        const data = await response.json();
        
        if (response.ok) {
          setStatus({
            isActive: true,
            lastPing: new Date().toLocaleTimeString(),
            error: undefined
          });
        } else {
          setStatus({
            isActive: false,
            error: data.error || 'Backend ping failed'
          });
        }
      } catch (error) {
        setStatus({
          isActive: false,
          error: 'Failed to ping backend'
        });
      }
    };

    // Ping immediately on mount
    pingBackend();

    // Then ping every 10 minutes to keep the server alive
    const interval = setInterval(pingBackend, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, []);

  // Only show status in development or if there's an error
  if (process.env.NODE_ENV === 'production' && status.isActive) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-lg text-xs">
      <div className="flex items-center gap-2">
        <div 
          className={`w-2 h-2 rounded-full ${
            status.isActive ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span>
          Backend: {status.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
      {status.lastPing && (
        <div className="text-gray-600 dark:text-gray-400">
          Last ping: {status.lastPing}
        </div>
      )}
      {status.error && (
        <div className="text-red-600 dark:text-red-400">
          {status.error}
        </div>
      )}
    </div>
  );
}
