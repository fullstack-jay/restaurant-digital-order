'use client';

import { useState, useRef } from 'react';

interface ProductResult {
  id?: string;
  name?: string;
  description?: string;
  price?: number;
  image_url?: string;
  [key: string]: unknown;
}

export default function ProductImageUploader() {
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProductResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
      setError(null);
      setResult(null);
    }
  };

  const handleProcessImage = async () => {
    if (!image || !previewUrl) {
      setError('Please select an image first');
      return;
    }

    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      // Send to our new OpenAI processing API
      const resp = await fetch('/api/openai/process-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: previewUrl,
          imageName: image.name, // Pass the filename for AI context
        }),
      });

      const json = await resp.json() as { product?: ProductResult, data?: ProductResult, error?: string, message?: string };
      console.log('OpenAI server response:', json);

      if (!resp.ok) {
        throw new Error(json?.error || 'Failed to process image with OpenAI');
      }

      setResult(json?.product ?? json?.data ?? json);
    } catch (err) {
      console.error('Processing error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error while processing image with OpenAI';
      setError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Upload Product Image</h2>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageChange}
        accept="image/*"
        className="hidden"
      />

      <div
        onClick={triggerFileInput}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Preview" className="max-h-64 mx-auto rounded-md" />
        ) : (
          <div className="flex flex-col items-center">
            <p className="mt-4 text-lg text-gray-600">Klik untuk upload gambar</p>
          </div>
        )}
      </div>

      {error && <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

      {result && (
        <div className="mt-4 p-3 bg-green-100 text-green-700 rounded">
          <div>Saved product:</div>
          <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      <button
        onClick={handleProcessImage}
        disabled={processing || !image}
        className={`mt-4 w-full py-3 px-4 rounded-md text-white font-medium ${
          processing || !image ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {processing ? 'Memproses...' : 'Deteksi & Simpan'}
      </button>
    </div>
  );
}