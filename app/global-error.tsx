'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <p>We apologize for the inconvenience. Please try again later.</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}