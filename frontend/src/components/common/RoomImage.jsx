import React, { useState } from 'react';
import { BedDouble } from 'lucide-react';

/**
 * Room photo with a clean placeholder.
 * Shows the placeholder when the room has no photo yet or the photo fails to load,
 * so the page never shows a broken image icon.
 */
export default function RoomImage({ src, alt, className = '' }) {
  // Remember which src failed, so a new src gets a fresh try
  const [failedSrc, setFailedSrc] = useState(null);

  if (!src || failedSrc === src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`${className} flex flex-col items-center justify-center gap-2 bg-linear-to-br from-slate-800 via-amber-950 to-slate-900 text-amber-200/80`}
      >
        <BedDouble className="w-10 h-10" />
        <span className="text-[11px] font-semibold tracking-wide px-3 text-center line-clamp-1">{alt}</span>
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} onError={() => setFailedSrc(src)} />;
}
