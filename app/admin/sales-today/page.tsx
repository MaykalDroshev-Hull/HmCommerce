'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
} from 'lucide-react';
import { getAdminSession } from '@/lib/auth';

interface SalesTodayData {
  metrics: {
    totalSales: number;
    totalOrders: number;
    totalItems: number;
    averageOrderValue: number;
    targetAmount: number;
  };
}

export default function SalesTodayPage() {
  const router = useRouter();
  const [data, setData] = useState<SalesTodayData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [displayMode, setDisplayMode] = useState<'both' | 'orders' | 'revenue'>('both');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const [currentDateStr, setCurrentDateStr] = useState('');
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check auth
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await getAdminSession();
        if (!session) {
          router.push('/admin/login');
          return;
        }
      } catch (err) {
        router.push('/admin/login');
      }
    };
    checkAuth();
  }, [router]);

  // Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeFmt = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      const dateFmt = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      setCurrentTime(timeFmt.format(now));
      setCurrentDateStr(dateFmt.format(now));
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch sales today data (silently polls every 10 seconds)
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/sales/today');
      const result = await res.json();
      if (result.success && result.data) {
        setData(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch sales today:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Auto-hide controls after 2.5 seconds of inactivity for clean TikTok recording
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 2500);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', showControls);
    window.addEventListener('touchstart', showControls);
    showControls();
    return () => {
      window.removeEventListener('mousemove', showControls);
      window.removeEventListener('touchstart', showControls);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [showControls]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const totalOrders = data?.metrics?.totalOrders ?? 0;
  const totalSales = data?.metrics?.totalSales ?? 0;

  return (
    <div
      className={`relative w-screen h-screen min-h-screen overflow-hidden flex flex-col justify-between select-none transition-colors duration-500 ${
        isDarkMode ? 'bg-black text-white' : 'bg-white text-neutral-900'
      }`}
    >
      {/* Floating Top Left: Back to Admin (Fades out when filming) */}
      <div
        className={`absolute top-5 left-6 z-30 transition-opacity duration-500 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <Link
          href="/admin/sales"
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            isDarkMode
              ? 'bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
              : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-300'
          }`}
        >
          <ArrowLeft size={14} />
          <span>Admin</span>
        </Link>
      </div>

      {/* Floating Top Right: Controls (Fades out when filming) */}
      <div
        className={`absolute top-5 right-6 z-30 flex items-center gap-2 transition-opacity duration-500 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Display Mode Toggle */}
        <div
          className={`flex items-center rounded-lg p-1 border text-xs ${
            isDarkMode
              ? 'bg-neutral-900/80 border-neutral-800'
              : 'bg-neutral-100 border-neutral-200'
          }`}
        >
          <button
            onClick={() => setDisplayMode('orders')}
            className={`px-2.5 py-1 rounded transition-all ${
              displayMode === 'orders'
                ? isDarkMode
                  ? 'bg-white text-black font-bold'
                  : 'bg-black text-white font-bold'
                : 'opacity-60 hover:opacity-100'
            }`}
          >
            Orders
          </button>
          <button
            onClick={() => setDisplayMode('both')}
            className={`px-2.5 py-1 rounded transition-all ${
              displayMode === 'both'
                ? isDarkMode
                  ? 'bg-white text-black font-bold'
                  : 'bg-black text-white font-bold'
                : 'opacity-60 hover:opacity-100'
            }`}
          >
            Both
          </button>
          <button
            onClick={() => setDisplayMode('revenue')}
            className={`px-2.5 py-1 rounded transition-all ${
              displayMode === 'revenue'
                ? isDarkMode
                  ? 'bg-white text-black font-bold'
                  : 'bg-black text-white font-bold'
                : 'opacity-60 hover:opacity-100'
            }`}
          >
            Revenue
          </button>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`p-2 rounded-lg border transition-colors ${
            isDarkMode
              ? 'bg-neutral-900/80 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
              : 'bg-neutral-100 text-neutral-700 border-neutral-300 hover:bg-neutral-200'
          }`}
          title="Toggle Light / Dark theme"
        >
          {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className={`p-2 rounded-lg border transition-colors ${
            isDarkMode
              ? 'bg-neutral-900/80 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
              : 'bg-neutral-100 text-neutral-700 border-neutral-300 hover:bg-neutral-200'
          }`}
          title="Toggle True Fullscreen"
        >
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      </div>

      {/* Main Center Stage with Brand Logo at Top */}
      <main
        onClick={() => {
          // Clicking anywhere on the screen cycles display modes
          setDisplayMode((prev) => (prev === 'both' ? 'orders' : prev === 'orders' ? 'revenue' : 'both'));
          showControls();
        }}
        className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8 cursor-pointer z-10"
      >
        {/* Brand Logo Permanently Visible on Top */}
        <div className="mb-4 sm:mb-8 flex items-center justify-center">
          <Image
            src={isDarkMode ? '/White-logo.png' : '/Black Logo.png'}
            alt="Brand Logo"
            width={280}
            height={90}
            priority
            className="h-14 sm:h-20 md:h-24 lg:h-28 w-auto object-contain drop-shadow-md transition-all duration-300"
          />
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-2 mb-3 sm:mb-5">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span
            className={`text-xs sm:text-sm font-semibold tracking-widest uppercase ${
              isDarkMode ? 'text-neutral-400' : 'text-neutral-500'
            }`}
          >
            Live Orders
          </span>
        </div>

        {/* Primary Giant Figure */}
        {displayMode === 'revenue' ? (
          <>
            <h1
              className="text-xs sm:text-sm font-bold uppercase tracking-[0.25em] mb-2 sm:mb-4 text-neutral-400"
            >
              Sales Today
            </h1>
            <div className="font-mono font-black tracking-tighter text-7xl sm:text-9xl md:text-[11rem] lg:text-[14rem] leading-none drop-shadow-sm">
              £{totalSales.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div
              className={`mt-4 sm:mt-6 text-sm sm:text-xl font-medium tracking-wide ${
                isDarkMode ? 'text-neutral-400' : 'text-neutral-500'
              }`}
            >
              {totalOrders} {totalOrders === 1 ? 'order' : 'orders'} placed today
            </div>
          </>
        ) : (
          <>
            <h1
              className="text-xs sm:text-sm font-bold uppercase tracking-[0.25em] mb-2 sm:mb-3 text-neutral-400"
            >
              Orders Today
            </h1>

            {/* Giant Numbers */}
            <div className="font-mono font-black tracking-tighter text-8xl sm:text-[12rem] md:text-[16rem] lg:text-[20rem] leading-none drop-shadow-sm">
              {totalOrders}
            </div>

            {/* Optional Revenue Tag */}
            {displayMode === 'both' && (
              <div
                className={`mt-4 sm:mt-6 text-lg sm:text-2xl md:text-3xl font-mono font-semibold tracking-tight ${
                  isDarkMode ? 'text-neutral-300' : 'text-neutral-700'
                }`}
              >
                £{totalSales.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} revenue
              </div>
            )}
          </>
        )}
      </main>

      {/* Subtle Bottom Bar */}
      <footer className="w-full px-8 py-5 flex items-center justify-between text-xs font-mono opacity-40 z-20">
        <div>
          <span>{currentDateStr}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>{currentTime}</span>
          <span>BST</span>
        </div>
      </footer>
    </div>
  );
}
