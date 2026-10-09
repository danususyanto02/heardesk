"use client";
import { useEffect, useRef, useState } from "react";
import { X, Paperclip, CheckCircle } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { cleanPageUrl, types, typeLabels } from "@/lib/validation";
export function FeedbackForm({
  siteKey,
  name,
  parentOrigin,
  position = "right",
  buttonLabel = "Beri masukan",
  preview = false,
}: Readonly<{
  siteKey: string;
  name: string;
  parentOrigin?: string;
  position?: string;
  buttonLabel?: string;
  preview?: boolean;
}>) {
  const [type, setType] = useState("ISSUE");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [image, setImage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const submission = useRef("");
  const input = useRef<HTMLInputElement>(null);
  const emailSection = useRef<HTMLDetailsElement>(null);
  const messageInput = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    submission.current = crypto.randomUUID();
    if (!parentOrigin || window.parent === window) {
      return;
    }
    function receive(event: MessageEvent) {
      if (
        event.origin !== parentOrigin ||
        event.source !== window.parent ||
        event.data?.type !== "ureport:context" ||
        typeof event.data.url !== "string" ||
        event.data.url.length > 2048
      ) {
        return;
      }
      const url = cleanPageUrl(event.data.url);
      if (url && new URL(url).origin === parentOrigin) {
        setPageUrl(url);
      }
    }
    window.addEventListener("message", receive);
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        window.parent.postMessage({ type: "ureport:close" }, parentOrigin!);
      }
    }
    window.addEventListener("keydown", escape);
    window.parent.postMessage(
      { type: "ureport:ready", label: buttonLabel, position },
      parentOrigin,
    );
    return () => {
      window.removeEventListener("message", receive);
      window.removeEventListener("keydown", escape);
    };
  }, [parentOrigin, buttonLabel, position]);
  useEffect(() => {
    if (!file) {
      setImage("");
      return;
    }
    const url = URL.createObjectURL(file);
    setImage(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  function changed() {
    if (!busy) {
      submission.current = crypto.randomUUID();
    }
  }
  function selectFile(value?: File) {
    setError("");
    changed();
    if (!value) {
      setFile(null);
      return;
    }
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(value.type) ||
      value.size > 5 * 1024 * 1024
    ) {
      setError("Pilih PNG, JPEG, atau WebP maksimal 5 MiB.");
      if (input.current) {
        input.current.value = "";
      }
      setFile(null);
      return;
    }
    setFile(value);
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (preview) {
      setError("Ini preview. Tidak ada data yang dikirim.");
      return;
    }
    if (!message.trim()) {
      setError("Pesan wajib diisi.");
      messageInput.current?.focus();
      return;
    }
    const emailInput = event.currentTarget.querySelector<HTMLInputElement>("input[type=email]");
    if (email && emailInput && !emailInput.validity.valid) {
      if (emailSection.current) {
        emailSection.current.open = true;
      }
      emailInput.focus();
      setError("Periksa format alamat email.");
      return;
    }
    setBusy(true);
    try {
      const data = new FormData();
      Object.entries({
        siteKey,
        submissionId: submission.current,
        type,
        message,
        email,
        pageUrl,
      }).forEach(([key, value]) => data.set(key, value));
      if (file) {
        data.set("screenshot", file);
      }
      await api("/api/feedback", { method: "POST", body: data, credentials: "omit" });
      setSuccess(true);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function close() {
    if (parentOrigin && window.parent !== window) {
      window.parent.postMessage({ type: "ureport:close" }, parentOrigin);
    }
  }
  return (
    <section className="widget-surface">
      <header className="widget-header">
        <div>
          <h1>Kirim feedback</h1>
          <p className="helper">Untuk {name}</p>
        </div>
        {parentOrigin && (
          <button
            type="button"
            className="btn quiet icon-btn"
            onClick={close}
            aria-label="Tutup formulir"
          >
            <X size={20} />
          </button>
        )}
      </header>
      {success ? (
        <div className="widget-success" role="status">
          <CheckCircle size={40} weight="regular" />
          <h2>Feedback sudah diterima</h2>
          <p className="muted">
            Terima kasih. Masukan Anda tersimpan untuk ditinjau admin website.
          </p>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setSuccess(false);
              setMessage("");
              setEmail("");
              setFile(null);
              changed();
            }}
          >
            Kirim masukan lain
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="widget-body form-stack">
          <fieldset disabled={busy}>
            <legend>Jenis feedback</legend>
            <div className="radio-options">
              {types.map((value) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="type"
                    value={value}
                    checked={type === value}
                    onChange={() => {
                      setType(value);
                      changed();
                    }}
                  />
                  {typeLabels[value]}
                </label>
              ))}
            </div>
          </fieldset>
          <label>
            Pesan <span className="helper">(wajib)</span>
            <textarea
              ref={messageInput}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                changed();
              }}
              disabled={busy}
              rows={5}
              maxLength={5000}
              required
              placeholder="Ceritakan kendala atau masukan Anda."
            />
          </label>
          <div>
            <label className="upload-label">
              <Paperclip size={18} />
              Screenshot <span className="helper">(opsional)</span>
              <input
                ref={input}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={busy}
                onChange={(e) => selectFile(e.target.files?.[0])}
              />
            </label>
            <p className="helper">PNG, JPEG, atau WebP. Maksimal 5 MiB.</p>
            {file && (
              <div className="file-preview">
                {image && <img src={image} alt="Preview screenshot pilihan Anda" />}
                <span className="helper">{file.name}</span>
                <button
                  className="btn quiet"
                  disabled={busy}
                  type="button"
                  onClick={() => {
                    setFile(null);
                    changed();
                    if (input.current) {
                      input.current.value = "";
                    }
                  }}
                >
                  Hapus screenshot
                </button>
              </div>
            )}
          </div>
          <details ref={emailSection} className="disclosure">
            <summary>
              Tambahkan email <span className="helper">(opsional)</span>
            </summary>
            <label>
              Email
              <input
                type="email"
                value={email}
                disabled={busy}
                maxLength={254}
                onChange={(e) => {
                  setEmail(e.target.value);
                  changed();
                }}
                placeholder="email@example.com"
              />
            </label>
          </details>
          <details className="disclosure">
            <summary>Halaman ikut dikirim</summary>
            <p className="helper break-word">
              {pageUrl || "Tidak ada konteks halaman yang diberikan."}
            </p>
            <p className="helper">Query dan fragment tidak disertakan.</p>
          </details>
          <p className="helper">Feedback hanya dapat dibaca admin website.</p>
          {preview && <p className="helper">Preview formulir, tidak mengirim data.</p>}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn primary full" disabled={busy}>
            {busy ? "Mengirim…" : "Kirim feedback"}
          </button>
        </form>
      )}
    </section>
  );
}
