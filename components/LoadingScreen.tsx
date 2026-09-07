'use client';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-solid border-neutral-900 border-r-transparent"></div>
        <p className="mt-4 text-neutral-600 dark:text-neutral-400 text-sm font-medium">
          Loading...
        </p>
      </div>
    </div>
  );
}
