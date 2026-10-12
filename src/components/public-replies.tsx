"use client";
import { useRef, useState } from "react";
import { api } from "@/lib/api";

type Reply = { id: string; body: string; createdAt: string };
export function PublicReplies({
  id,
  initial,
  enabled,
  canReply,
}: Readonly<{ id: string; initial: Reply[]; enabled: boolean; canReply: boolean }>) {
  const [replies, setReplies] = useState(initial);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(crypto.randomUUID());
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const reply = await api<Reply>(`/api/admin/feedback/${id}/replies`, {
        method: "POST",
        body: JSON.stringify({ body, requestId: requestId.current }),
      });
      setReplies((current) =>
        current.some((item) => item.id === reply.id) ? current : [...current, reply],
      );
      setBody("");
      requestId.current = crypto.randomUUID();
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="notes" aria-label="Balasan untuk pelapor">
      <h2>Balasan untuk pelapor</h2>
      <p className="helper">
        Balasan di sini terlihat oleh siapa pun yang memiliki link atau kode pelacakan laporan.
        Catatan internal tetap khusus tim.
      </p>
      {replies.length ? (
        replies.map((reply) => (
          <div className="note" key={reply.id}>
            <p>{reply.body}</p>
            <span className="helper">
              Tim website · {new Date(reply.createdAt).toLocaleString("id-ID")}
            </span>
          </div>
        ))
      ) : (
        <p className="muted">Belum ada balasan publik.</p>
      )}
      {enabled && canReply ? (
        <form onSubmit={submit} className="form-stack">
          <label>
            Balasan publik
            <textarea
              value={body}
              disabled={busy}
              maxLength={5000}
              rows={4}
              required
              onChange={(event) => {
                setBody(event.target.value);
                requestId.current = crypto.randomUUID();
              }}
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? "Mengirim…" : "Kirim balasan ke pelapor"}
          </button>
        </form>
      ) : (
        <p className="helper">
          {enabled
            ? "Role Anda hanya dapat membaca balasan tim."
            : "Laporan ini belum memiliki akses pelacakan pengunjung."}
        </p>
      )}
    </section>
  );
}
