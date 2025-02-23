'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function TestPage() {
  const router = useRouter();

  useEffect(() => {
    const checkHeartCondition = async () => {
      const response = await fetch('http://localhost:3000/api/check_heart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: "Patient is experiencing severe chest pain radiating to left arm, shortness of breath, and cold sweats for the last 30 minutes."
        })
      });
      console.log(response);
    };

    checkHeartCondition();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">API Testing Page</h1>
      
      <div className="space-y-8">
      </div>
    </div>
  );
} 