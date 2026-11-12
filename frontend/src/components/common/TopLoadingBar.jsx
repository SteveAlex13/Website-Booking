import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { loadingBar } from '../../utils/loadingBar';

const SHOW_DELAY_MS = 100; // very fast requests never show the bar (no flicker)
const TRICKLE_MS = 200;
const MAX_TRICKLE = 92; // the bar waits here until the work really finishes

/**
 * Thin progress bar fixed at the top of the page.
 * It runs while API calls are in flight (see services/api.js) and gives a short
 * pulse on every page change. The bar creeps forward, jumps to 100% when the work
 * is done, then fades out.
 */
export default function TopLoadingBar() {
  const { pathname } = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  const visibleRef = useRef(false);
  const showTimer = useRef(null);
  const hideTimer = useRef(null);
  const resetTimer = useRef(null);
  const trickleTimer = useRef(null);

  useEffect(() => {
    const clearAll = () => {
      clearTimeout(showTimer.current);
      clearTimeout(hideTimer.current);
      clearTimeout(resetTimer.current);
      clearInterval(trickleTimer.current);
    };

    const begin = () => {
      clearTimeout(hideTimer.current);
      clearTimeout(resetTimer.current);
      clearInterval(trickleTimer.current);

      showTimer.current = setTimeout(() => {
        visibleRef.current = true;
        setVisible(true);
        setProgress(12);
        trickleTimer.current = setInterval(() => {
          setProgress((p) => Math.min(p + (MAX_TRICKLE - p) * 0.08, MAX_TRICKLE));
        }, TRICKLE_MS);
      }, SHOW_DELAY_MS);
    };

    const finish = () => {
      clearTimeout(showTimer.current);
      clearInterval(trickleTimer.current);
      if (!visibleRef.current) return; // it never became visible

      setProgress(100);
      hideTimer.current = setTimeout(() => {
        visibleRef.current = false;
        setVisible(false);
        resetTimer.current = setTimeout(() => setProgress(0), 250);
      }, 250);
    };

    const unsubscribe = loadingBar.subscribe((busy) => (busy ? begin() : finish()));

    return () => {
      unsubscribe();
      clearAll();
    };
  }, []);

  // Short pulse on every page change.
  useEffect(() => {
    loadingBar.start();
    const timer = setTimeout(loadingBar.done, 350);

    return () => {
      clearTimeout(timer);
      loadingBar.done();
    };
  }, [pathname]);

  return (
    <div
      role="progressbar"
      aria-label="Memuat halaman"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      aria-hidden={!visible}
      className={`fixed top-0 left-0 right-0 z-[100] h-[3px] pointer-events-none transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className="h-full bg-linear-to-r from-amber-500 via-yellow-400 to-amber-600 shadow-[0_0_8px_rgba(217,119,6,0.7)] transition-[width] duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
