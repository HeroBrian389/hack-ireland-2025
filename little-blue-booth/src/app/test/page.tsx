'use client';
import { useRouter } from 'next/navigation';

export default async function TestPage() {
  const router = useRouter();

  const response = await fetch('http://localhost:3000/api/check_heart', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: "Patient is experiencing severe chest pain radiating to left arm, shortness of breath, and cold sweats for the last 30 minutes."
    })
  });
  
  const result = await response.json();
  if (result == true){
    //redirect to "http://localhost:3000/emergency_number"
    router.push('http://localhost:3000/emergency_number');
  }
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">API Testing Page</h1>
      
      <div className="space-y-8">
      </div>
    </div>
  );
} 