import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import PaymentFailedClient from '@/components/PaymentFailedClient';

export default function PaymentFailed() {
  return (
    <div className="container mx-auto py-8 px-4 text-center">
      <Suspense fallback={
        <div className="max-w-2xl mx-auto">
          <div className="text-5xl mb-6 text-gray-500">⏳</div>
          <h1 className="text-3xl font-bold mb-4 text-gray-600">Loading...</h1>
          <p className="text-gray-500">Please wait while we process your request.</p>
        </div>
      }>
        <PaymentFailedClient />
      </Suspense>
    </div>
  );
}
