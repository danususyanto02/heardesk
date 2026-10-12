"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { typeLabels, statusLabels } from "@/lib/validation";

type TrackedReport = {
  website: string;
  message: string;
  type: keyof typeof typeLabels;
  status: keyof typeof statusLabels;
  createdAt: string;
  updatedAt: string;
  replies: { id: string; body: string; createdAt: string }[];
};

export function FeedbackTracking() {
  const [code, setCode] = useState("");
  const [report, setReport] = useState<TrackedReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sequence = useRef(0);

  async function load(value: string) {
    const current = ++sequence.current;
    setReport(null);
    setError("");
    const normalized = value.trim().toLowerCase();
    if (!/^[a-f0-9]{48}$/.test(normalized)) {
      setError("Masukkan kode pelacakan lengkap yang Anda terima setelah mengirim feedback.");
      setBusy(false);
      return;
    }
    setBusy(true);
    try {
      const result = await api<TrackedReport>("/api/feedback/track", {
        method: "POST",
        credentials: "omit",
        cache: "no-store",
        body: JSON.stringify({ code: normalized }),
      });
      if (current === sequence.current) {
        setReport(result);
      }
    } catch (problem) {
      if (current === sequence.current) {
        setError((problem as Error).message);
      }
    } finally {
      if (current === sequence.current) {
        setBusy(false);
      }
    }
  }

  useEffect(() => {
    function readFragment() {
      const value = new URLSearchParams(window.location.hash.slice(1)).get("code") ?? "";
      sequence.current++;
      setCode(value);
      setReport(null);
      setError("");
      setBusy(false);
      if (value) {
        void load(value);
      }
    }
    readFragment();
    window.addEventListener("hashchange", readFragment);
    return () => {
      sequence.current++;
      window.removeEventListener("hashchange", readFragment);
    };
  }, []);

  return (
    <>
      <h1>Lacak feedback Anda</h1>
      <p className="muted">
        Lihat status dan balasan tim tanpa login. Gunakan link atau kode yang Anda simpan setelah
        mengirim feedback.
      </p>
      <form
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault();
          void load(code);
        }}
      >
        <label>
          Kode pelacakan
          <input
            value={code}
            onChange={(event) => {
              sequence.current++;
              setCode(event.target.value);
              setReport(null);
              setBusy(false);
            }}
            autoComplete="off"
            spellCheck={false}
            maxLength={48}
            required
          />
        </label>
        <button className="btn primary" disabled={busy} type="submit">
          {busy ? "Mencari feedback…" : "Lihat perkembangan"}
        </button>
      </form>
      <p className="helper">
        Kode ini membuka akses ke laporan Anda. Jangan bagikan ke orang lain. Tanpa link atau kode,
        akses belum dapat dipulihkan melalui email.
      </p>
      {busy && <output aria-live="polite">Memuat status dan balasan tim…</output>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {report && (
        <article className="tracking-report" aria-label="Hasil pelacakan">
          <header>
            <div>
              <h2>Feedback untuk {report.website}</h2>
              <p className="helper">
                {typeLabels[report.type]} · {new Date(report.createdAt).toLocaleString("id-ID")}
              </p>
            </div>
            <span className={`status-pill ${report.status.toLowerCase()}`}>
              {statusLabels[report.status]}
            </span>
          </header>
          <p className="report-message">{report.message}</p>
          <section className="notes">
            <h2>Balasan tim website</h2>
            {report.replies.length ? (
              report.replies.map((reply) => (
                <div className="note" key={reply.id}>
                  <p>{reply.body}</p>
                  <span className="helper">
                    Tim website · {new Date(reply.createdAt).toLocaleString("id-ID")}
                  </span>
                </div>
              ))
            ) : (
              <p className="muted">Belum ada pembaruan dari tim.</p>
            )}
          </section>
          <button className="btn" type="button" onClick={() => void load(code)}>
            Perbarui status
          </button>
        </article>
      )}
    </>
  );
}
