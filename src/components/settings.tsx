"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CopyIcon, CheckIcon, ArrowsClockwiseIcon, XIcon } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { FeedbackForm } from "./feedback-form";
import { SettingsSkeleton } from "./skeleton";

type Site = {
  id: number;
  companyId: string;
  name: string;
  origin: string;
  buttonLabel: string;
  position: string;
  publicKey: string;
};
type Configuration = { configured: boolean; appUrl: string } & Partial<Site>;

export function Settings({ companyId, siteId }: { companyId?: string; siteId?: number } = {}) {
  const router = useRouter();
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [draft, setDraft] = useState<Site | null>(null);
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState("");
  const [retry, setRetry] = useState(0);
  const confirmation = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!configuration?.configured) {
      return;
    }
    const id = location.hash.slice(1);
    if (!["installation-code", "website-settings"].includes(id)) {
      return;
    }
    const timer = setTimeout(
      () => document.getElementById(id)?.scrollIntoView({ block: "start" }),
      0,
    );
    return () => clearTimeout(timer);
  }, [configuration?.configured, configuration?.id]);
  useEffect(() => {
    let active = true;
    setError("");
    setConfiguration(null);
    setDraft(null);
    setNotice("");
    setCopied("");
    confirmation.current?.close();
    const request =
      companyId && siteId
        ? api<Site>(`/api/companies/${companyId}/sites/${siteId}`).then((data) => ({
            ...data,
            configured: true,
            appUrl: location.origin,
          }))
        : api<Configuration>("/api/admin/site");
    request
      .then((data) => {
        if (!active) {
          return;
        }
        setConfiguration(data);
        if (data.configured) {
          setDraft(data as Configuration & Site);
        }
      })
      .catch((error) => {
        if (active) {
          setError(error.message);
        }
      });
    return () => {
      active = false;
    };
  }, [retry, companyId, siteId]);

  async function connect(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<Configuration & Site>("/api/admin/site", {
        method: "POST",
        body: JSON.stringify({ address }),
      });
      setConfiguration(result);
      setDraft(result);
      setNotice("Website ditambahkan. Salin kode pemasangan untuk menampilkan tombol laporan.");
      router.refresh();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function change(key: keyof Site, value: string) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
    setNotice("Perubahan belum disimpan.");
  }
  async function save(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || !configuration) {
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api<Site>(`/api/companies/${draft.companyId}/sites/${draft.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: draft.name,
          origin: draft.origin,
          buttonLabel: draft.buttonLabel,
          position: draft.position,
        }),
      });
      setDraft(result);
      setConfiguration({ ...result, configured: true, appUrl: configuration.appUrl });
      setNotice("Pengaturan tersimpan. Muat ulang website untuk melihat perubahan.");
      router.refresh();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function copy(value: string, kind: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(""), 3000);
    } catch {
      setError("Gagal menyalin. Pilih dan salin teks secara manual.");
    }
  }
  async function rotate() {
    if (!configuration?.publicKey) {
      return;
    }
    setRotating(true);
    setError("");
    try {
      const result = await api<Site>(
        `/api/companies/${configuration.companyId}/sites/${configuration.id}/key`,
        {
          method: "POST",
          body: JSON.stringify({ confirm: true, expectedKey: configuration.publicKey }),
        },
      );
      setConfiguration((current) =>
        current ? { ...current, publicKey: result.publicKey } : current,
      );
      setDraft((current) => (current ? { ...current, publicKey: result.publicKey } : current));
      setCopied("");
      setNotice("Kode pemasangan diperbarui. Ganti kode lama pada website Anda.");
      confirmation.current?.close();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setRotating(false);
    }
  }

  if (!configuration) {
    return error ? (
      <section className="empty-state">
        <p className="error" role="alert">
          {error}
        </p>
        <button type="button" className="btn" onClick={() => setRetry(retry + 1)}>
          Coba lagi
        </button>
      </section>
    ) : (
      <SettingsSkeleton />
    );
  }
  if (!configuration.configured || !draft) {
    return (
      <>
        <div className="page-heading">
          <div>
            <h1>Tambahkan website</h1>
            <p className="muted">Di website mana tombol laporan akan ditampilkan?</p>
          </div>
        </div>
        <section className="onboarding-panel">
          <form className="form-stack" onSubmit={connect}>
            <label htmlFor="website-address">Alamat website</label>
            <input
              id="website-address"
              type="url"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              maxLength={2048}
              placeholder="https://website.example"
              disabled={busy}
            />
            <p className="helper">
              Tempel alamat website atau salah satu halamannya. Setelah disimpan, kode pemasangan
              langsung tersedia.
            </p>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn primary" disabled={busy}>
              {busy ? "Menambahkan…" : "Tambahkan website"}
            </button>
          </form>
        </section>
      </>
    );
  }

  const snippet = `<script src="${configuration.appUrl}/widget.js" data-site="${configuration.publicKey}" defer></script>`;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Website</h1>
          <p className="muted">Pasang tombol laporan dengan menyalin kode di bawah.</p>
        </div>
      </div>
      <div className="settings-grid">
        <form onSubmit={save} className="settings-panel">
          <section id="installation-code">
            <h2>Kode pemasangan</h2>
            <p className="helper">
              Salin seluruh kode ini dan tempel sebelum &lt;/body&gt; pada{" "}
              <strong>{configuration.origin}</strong>. Tidak perlu mengisi kode lain.
            </p>
            <pre>
              <code>{snippet}</code>
            </pre>
            <button className="btn primary" type="button" onClick={() => copy(snippet, "snippet")}>
              {copied === "snippet" ? <CheckIcon /> : <CopyIcon />}
              {copied === "snippet" ? "Kode tersalin" : "Salin kode"}
            </button>
          </section>
          <fieldset disabled={busy || rotating} className="settings-fields">
            <section id="website-settings">
              <h2>Website Anda</h2>
              <label>
                <span>Nama website</span>
                <input
                  value={draft.name}
                  required
                  maxLength={100}
                  onChange={(e) => change("name", e.target.value)}
                />
              </label>
              <label>
                <span>Alamat website</span>
                <input
                  value={draft.origin}
                  type="url"
                  required
                  onChange={(e) => change("origin", e.target.value)}
                />
                <span className="helper">
                  Tombol laporan hanya tampil pada alamat ini. Jika memakai www atau subdomain, isi
                  alamat yang tepat.
                </span>
              </label>
            </section>
            <section>
              <h2>Tampilan tombol</h2>
              <label>
                <span>Teks tombol</span>
                <input
                  value={draft.buttonLabel}
                  required
                  maxLength={40}
                  onChange={(e) => change("buttonLabel", e.target.value)}
                />
              </label>
              <fieldset>
                <legend>Posisi tombol</legend>
                <div className="radio-options">
                  {["left", "right"].map((position) => (
                    <label key={position}>
                      <input
                        name="position"
                        type="radio"
                        checked={draft.position === position}
                        onChange={() => change("position", position)}
                      />
                      {position === "left" ? "Kiri bawah" : "Kanan bawah"}
                    </label>
                  ))}
                </div>
              </fieldset>
            </section>
          </fieldset>
          <details className="disclosure settings-advanced">
            <summary>Pengaturan lanjutan</summary>
            <p className="helper">
              Perbarui kode pemasangan jika perlu menghentikan penggunaan kode lama. Laporan yang
              sudah diterima tetap tersimpan.
            </p>
            <button
              className="btn"
              type="button"
              disabled={busy || rotating}
              onClick={() => confirmation.current?.showModal()}
            >
              <ArrowsClockwiseIcon />
              Perbarui kode pemasangan
            </button>
          </details>
          {error && !confirmation.current?.open && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="settings-actions">
            <button type="submit" className="btn primary" disabled={busy || rotating}>
              {busy ? "Menyimpan…" : "Simpan pengaturan"}
            </button>
            <output className="helper" aria-live="polite">
              {notice}
            </output>
          </div>
        </form>
        <aside className="settings-preview">
          <h2>Preview formulir</h2>
          <p className="helper">Tampilan pengunjung. Preview tidak mengirim feedback.</p>
          <FeedbackForm siteKey={configuration.publicKey!} name={draft.name} preview />
        </aside>
      </div>
      <dialog ref={confirmation} className="key-confirm" aria-labelledby="rotate-heading">
        <header>
          <h2 id="rotate-heading">Perbarui kode pemasangan?</h2>
          <button
            className="btn quiet icon-btn"
            type="button"
            disabled={rotating}
            onClick={() => confirmation.current?.close()}
            aria-label="Tutup konfirmasi"
          >
            <XIcon />
          </button>
        </header>
        <p>
          Kode lama tidak bisa dipakai untuk mengirim laporan lagi. Salin kode baru dan ganti kode
          pada website setelah melanjutkan.
        </p>
        <p className="helper">Laporan dan catatan yang sudah tersimpan tetap ada.</p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="key-actions">
          <button
            className="btn"
            type="button"
            disabled={rotating}
            onClick={() => confirmation.current?.close()}
          >
            Batal
          </button>
          <button className="btn primary" type="button" disabled={rotating} onClick={rotate}>
            {rotating ? "Memperbarui…" : "Perbarui sekarang"}
          </button>
        </div>
      </dialog>
    </>
  );
}
