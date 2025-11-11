'use client';
import { useState, useEffect } from 'react';
import Lottie from 'lottie-react';
import loader from '../_components/loader.json';

export default function Loader({ children }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-600/30 backdrop-blur-lg z-50">
        <Lottie
          animationData={loader}
          loop
          autoplay
          style={{
            width: 300,
            height: 300,
            background: 'transparent',
          }}
          rendererSettings={{
            preserveAspectRatio: 'xMidYMid slice',
            clearCanvas: true,
            progressiveLoad: true,
            colorFilter: {
              colors: ['#0077be', '#00ffcc', '#ffffff'],
              type: 'colorize'
            }
          }}
        />

      </div>
    );
  }

  return <>{children}</>;
}
