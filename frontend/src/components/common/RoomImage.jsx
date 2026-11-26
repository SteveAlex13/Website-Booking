import React, { useState } from 'react';
import { BedDouble } from 'lucide-react';

/**
 * Resolves local storage relative paths or external URLs to full URLs.
 */
export function resolveImageUrl(src) {
  if (!src) return null;
  if (
    src.startsWith('http://') ||
    src.startsWith('https://') ||
    src.startsWith('blob:') ||
    src.startsWith('data:')
  ) {
    return src;
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
  const backendBase = apiBase.replace(/\/api\/v1\/?$/, '');
  const cleanPath = src.startsWith('/') ? src : `/${src}`;
  return `${backendBase}${cleanPath.startsWith('/storage') ? cleanPath : `/storage${cleanPath}`}`;
}

/**
 * Room photo with a clean placeholder.
 * Shows the placeholder when the room has no photo yet or the photo fails to load,
 * so the page never shows a broken image icon.
 */
export default function RoomImage({ src, alt, className = '', loading = 'lazy' }) {
  // Remember which src failed, so a new src gets a fresh try
  const [failedSrc, setFailedSrc] = useState(null);

  const resolved = resolveImageUrl(src);

  if (!resolved || failedSrc === resolved) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`${className} flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-800 via-amber-950 to-slate-900 text-amber-200/80`}
      >
        <BedDouble className="w-10 h-10" />
        <span className="text-[11px] font-semibold tracking-wide px-3 text-center line-clamp-1">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      onError={() => setFailedSrc(resolved)}
    />
  );
}
