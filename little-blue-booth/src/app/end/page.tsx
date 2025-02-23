'use client';

import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';

export default function EndPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const summary = searchParams.get('summary')?.replace(/-/g, '');

  const formattedSummary = summary?.split('**').map((text, index) => (
    <p key={index} className="mb-4">
      {text.trim()}
    </p>
  ));

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <h1 className="mb-8 text-3xl font-bold text-white">
          Consultation Summary
        </h1>

        {/* Summary Content */}
        <div className="mb-8 rounded-lg bg-gray-900 p-6 text-gray-200">
          {summary ? (
            <div className="prose prose-invert">
              {formattedSummary}
            </div>
          ) : (
            <p className="text-gray-400">No summary available</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => router.push('/')}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            New Consultation
          </button>
          <button
            onClick={() => router.push('/emergency_number')}
            className="rounded-lg bg-red-600 px-6 py-3 text-white hover:bg-red-700"
          >
            Emergency Services
          </button>
        </div>
      </div>
    </div>
  );
} 