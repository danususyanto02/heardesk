"use client";
import { useEffect, useRef, useState } from "react";
import { CheckCircle, Paperclip, X } from "@phosphor-icons/react";
import { types, typeLabels } from "@/lib/validation";

export function DemoForm({ close }: { close: () => void }) {
  const [type, setType] = useState("ISSUE"), [message, setMessage] = useState(""), [email, setEmail] = useState(""), [file, setFile] = useState<File | null>(null), [image, setImage] = useState(""), [error, setError] = useState(""), [done, setDone] = useState(false);
  const messageInput = useRef<HTMLTextAreaElement>(null), emailDetails = useRef<HTMLDetailsElement>(null), fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!file) { setImage(""); return; }
    const url = URL.createObjectURL(file); setImage(url); return () => URL.revokeObjectURL(url);
  }, [file]);
  function selectFile(next?: File) {
    setError("");
    if (next && (!["image/png", "image/jpeg", "image/webp"].includes(next.type) || next.size > 5 * 1024 * 1024)) {
      setError("Pilih PNG, JPEG, atau WebP maksimal 5 MiB."); setFile(null); if (fileInput.current) fileInput.current.value = ""; return;
    }
    setFile(next ?? null);
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!message.trim()) { setError("Pesan wajib diisi."); messageInput.current?.focus(); return; }
    const input = event.currentTarget.querySelector<HTMLInputElement>("input[type=email]");
    if (email && input && !input.validity.valid) { if (emailDetails.current) emailDetails.current.open = true; setError("Periksa format alamat email."); input.focus(); return; }
    setDone(true);
  }
  return <section className="widget-surface"><header className="widget-header"><div><h2>Kirim feedback</h2><p className="helper">Demo untuk website.example</p></div><button className="btn quiet icon-btn" onClick={close} aria-label="Tutup formulir"><X size={20}/></button></header>
    {done ? <div className="widget-success" role="status"><CheckCircle size={40} aria-hidden/><h2 tabIndex={-1} ref={element => element?.focus()}>Simulasi selesai</h2><p className="muted">Tidak ada pesan, email, atau screenshot yang dikirim ke server.</p><button className="btn" onClick={() => { setDone(false); setError(""); }}>Coba lagi</button><button className="btn primary full" onClick={close}>Tutup demo</button></div> : <form className="widget-body form-stack" noValidate onSubmit={submit}>
      <p className="demo-notice">Demo lokal di browser. Isian ini tidak masuk ke inbox admin.</p>
      <fieldset><legend>Jenis feedback</legend><div className="radio-options">{types.map(value => <label key={value}><input type="radio" name="demo-type" checked={type === value} onChange={() => setType(value)}/>{typeLabels[value]}</label>)}</div></fieldset>
      <label>Pesan <span className="helper">(wajib)</span><textarea ref={messageInput} rows={4} maxLength={5000} value={message} onChange={e => setMessage(e.target.value)} required placeholder="Ceritakan kendala atau masukan Anda."/></label>
      <div><label className="upload-label"><Paperclip size={18} aria-hidden/>Screenshot <span className="helper">(opsional)</span><input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={e => selectFile(e.target.files?.[0])}/></label><p className="helper">PNG, JPEG, atau WebP. Maksimal 5 MiB.</p>{file && <div className="file-preview">{image && <img src={image} alt="Preview screenshot pilihan Anda"/>}<span className="helper">{file.name}</span><button type="button" className="btn quiet" onClick={() => { setFile(null); if (fileInput.current) fileInput.current.value = ""; }}>Hapus screenshot</button></div>}</div>
      <details ref={emailDetails} className="disclosure"><summary>Tambahkan email <span className="helper">(opsional)</span></summary><label>Email<input type="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com"/></label></details>
      <details className="disclosure"><summary>Halaman ikut dikirim</summary><p className="helper">Pada widget nyata, URL halaman dikirim tanpa query atau fragment. Demo ini tidak mengirim URL atau isian apa pun.</p></details>
      {error && <p className="error" role="alert">{error}</p>}<button className="btn primary full" type="submit">Kirim simulasi</button>
    </form>}
  </section>;
}
