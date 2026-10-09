"use client";
export default function PlatformError({ reset }: Readonly<{ reset: () => void }>) {
  return (
    <section className="empty-state">
      <h1>Platform data could not be loaded</h1>
      <p>Check your connection and try again.</p>
      <button className="btn" onClick={reset}>
        Retry loading
      </button>
    </section>
  );
}
