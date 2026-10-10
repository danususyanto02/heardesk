"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Paperclip } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { typeLabels, statusLabels, statuses } from "@/lib/validation";
import { DetailSkeleton } from "./skeleton";
type Note = { id: string; body: string; createdAt: string };
type Report = {
  id: string;
  type: keyof typeof typeLabels;
  status: keyof typeof statusLabels;
  message: string;
  email: string | null;
  pageUrl: string | null;
  createdAt: string;
  attachment: { id: string; filename: string } | null;
  notes: Note[];
};
export function Detail({ id, back }: Readonly<{ id: string; back: string }>) {
  const [item, setItem] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [noteBusy, setNoteBusy] = useState(false);
  const [statusText, setStatusText] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api<Report>("/api/admin/feedback/" + id)
      .then((value) => {
        if (active) {
          setItem(value);
        }
      })
      .catch((error) => {
        if (active) {
          setError(error.message);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    setDraft(sessionStorage.getItem("note-draft:" + id) ?? "");
    return () => {
      active = false;
    };
  }, [id, retry]);
  function changeDraft(value: string) {
    setDraft(value);
    sessionStorage.setItem("note-draft:" + id, value);
  }
  async function changeStatus(status: Report["status"]) {
    if (!item) {
      return;
    }
    setSaving(true);
    setStatusText("Menyimpan…");
    setError("");
    try {
      await api("/api/admin/feedback/" + id, { method: "PATCH", body: JSON.stringify({ status }) });
      setItem((current) => (current ? { ...current, status } : current));
      setStatusText("Status tersimpan.");
    } catch (error) {
      setStatusText("");
      setError(
        (error as Error).message + " Status belum diubah. Pilih kembali untuk mencoba lagi.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function addNote(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim() || !item) {
      return;
    }
    setNoteBusy(true);
    setError("");
    try {
      const note = await api<Note>(`/api/admin/feedback/${id}/notes`, {
        method: "POST",
        body: JSON.stringify({ body: draft }),
      });
      setItem((current) => (current ? { ...current, notes: [...current.notes, note] } : current));
      changeDraft("");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setNoteBusy(false);
    }
  }
  return (
    <>
      <Link href={back} className="back-link">
        <ArrowLeft size={18} />
        Kembali ke feedback
      </Link>
      {loading && <DetailSkeleton />}
      {!loading && !item && (
        <section className="empty-state">
          <p className="error" role="alert">
            {error}
          </p>
          <button type="button" className="btn" onClick={() => setRetry(retry + 1)}>
            Coba lagi
          </button>
        </section>
      )}
      {!loading && item && (
        <article className="detail-panel">
          <header className="detail-top">
            <div>
              <h1>Detail feedback</h1>
              <p className="muted">
                {typeLabels[item.type]} · {new Date(item.createdAt).toLocaleString("id-ID")}
              </p>
            </div>
            <label>
              <span>Status</span>
              <select
                value={item.status}
                disabled={saving}
                onChange={(e) => changeStatus(e.target.value as Report["status"])}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
            </label>
          </header>
          <output className="status-feedback helper" aria-live="polite">
            {statusText}
          </output>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <p className="report-message">{item.message}</p>
          {item.attachment && (
            <details className="disclosure">
              <summary>
                <Paperclip size={18} />
                Lihat screenshot
              </summary>
              <figure>
                <img
                  className="screenshot"
                  src={`/api/admin/attachments/${item.attachment.id}`}
                  alt="Screenshot yang diunggah pengunjung"
                />
                <figcaption>{item.attachment.filename}</figcaption>
              </figure>
            </details>
          )}
          <details className="disclosure">
            <summary>Info pengiriman</summary>
            <dl>
              <dt>Halaman</dt>
              <dd>
                {item.pageUrl ? (
                  <a href={item.pageUrl} target="_blank" rel="noopener noreferrer">
                    {item.pageUrl}
                  </a>
                ) : (
                  "Tidak disertakan"
                )}
              </dd>
              <dt>Email</dt>
              <dd>{item.email ?? "Tidak disertakan"}</dd>
            </dl>
          </details>
          <section className="notes">
            <h2>Catatan internal</h2>
            {item.notes.length ? (
              item.notes.map((note) => (
                <div className="note" key={note.id}>
                  <p>{note.body}</p>
                  <span className="helper">
                    Admin · {new Date(note.createdAt).toLocaleString("id-ID")}
                  </span>
                </div>
              ))
            ) : (
              <p className="muted">Belum ada catatan.</p>
            )}
            <form onSubmit={addNote} className="form-stack">
              <label>
                <span>Tambah catatan</span>
                <textarea
                  value={draft}
                  onChange={(e) => changeDraft(e.target.value)}
                  required
                  maxLength={5000}
                  rows={3}
                  placeholder="Catat rencana tindak lanjut…"
                />
              </label>
              <button type="submit" className="btn primary" disabled={noteBusy}>
                {noteBusy ? "Menyimpan…" : "Tambah catatan"}
              </button>
            </form>
          </section>
        </article>
      )}
    </>
  );
}
