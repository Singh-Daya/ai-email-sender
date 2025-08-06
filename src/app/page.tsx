'use client';

import { useState } from 'react';

type GenResponse = { subject: string; body: string; error?: string };
type SendResponse = { messageId?: string; success?: boolean; error?: string };

export default function Home() {
  const [recipients, setRecipients] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [loadingGen, setLoadingGen] = useState<boolean>(false);
  const [loadingSend, setLoadingSend] = useState<boolean>(false);
  const [status, setStatus] = useState<string | null>(null);

  // Helper to parse JSON safely without throwing “Unexpected end of JSON input”
  async function safeJson<T>(res: Response): Promise<{ ok: boolean; data: T | null; text: string }> {
    const text = await res.text();
    if (!text) return { ok: res.ok, data: null, text: '' };
    try {
      return { ok: res.ok, data: JSON.parse(text) as T, text };
    } catch {
      return { ok: res.ok, data: null, text };
    }
  }

  function errorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    try {
      return JSON.stringify(err);
    } catch {
      return 'Unknown error';
    }
  }

  async function handleGenerate() {
    setStatus(null);
    setLoadingGen(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const { ok, data, text } = await safeJson<GenResponse>(res);

      if (!ok) {
        const serverMsg =
          (data && 'error' in data && typeof data.error === 'string' ? data.error : null) ||
          (text ? `Server returned non-JSON: ${text.slice(0, 180)}…` : 'Generate failed');
        throw new Error(serverMsg);
      }

      const subjectVal = data?.subject ?? '';
      const bodyVal = data?.body ?? '';
      setSubject(subjectVal);
      setBody(bodyVal);
      setStatus('Draft generated. You can edit before sending.');
    } catch (e: unknown) {
      setStatus(`Error: ${errorMessage(e)}`);
    } finally {
      setLoadingGen(false);
    }
  }

  async function handleSend() {
    setLoadingSend(true);
    setStatus(null);
    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients, subject, body }),
      });

      const { ok, data, text } = await safeJson<SendResponse>(res);

      if (!ok) {
        const serverMsg =
          (data && 'error' in data && typeof data.error === 'string' ? data.error : null) ||
          (text ? `Server returned non-JSON: ${text.slice(0, 180)}…` : 'Send failed');
        throw new Error(serverMsg);
      }

      const id = data?.messageId ?? 'unknown';
      setStatus(`Sent! messageId=${id}`);
    } catch (e: unknown) {
      setStatus(`Error: ${errorMessage(e)}`);
    } finally {
      setLoadingSend(false);
    }
  }

  return (
    <main style={{ maxWidth: 840, margin: '40px auto', padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>AI-Generated Email Sender</h1>

      <section style={{ marginTop: 24 }}>
        <label>Recipients (comma/newline separated)</label>
        <textarea
          value={recipients}
          onChange={(e) => setRecipients(e.target.value)}
          placeholder="alice@example.com, bob@example.com"
          rows={3}
          style={{ width: '100%', padding: 12, marginTop: 8 }}
        />
      </section>

      <section style={{ marginTop: 16 }}>
        <label>Prompt (what the email should say)</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Invite the team to a product demo on Friday at 3 PM IST. Keep it concise, friendly, and include an RSVP request."
          rows={4}
          style={{ width: '100%', padding: 12, marginTop: 8 }}
        />
        <button
          onClick={handleGenerate}
          disabled={loadingGen || !prompt.trim()}
          style={{ marginTop: 12, padding: '10px 16px' }}
        >
          {loadingGen ? 'Generating…' : 'Generate Email'}
        </button>
      </section>

      <section style={{ marginTop: 24 }}>
        <label>Subject</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject line"
          style={{ width: '100%', padding: 12, marginTop: 8 }}
        />
        <label style={{ marginTop: 12, display: 'block' }}>Email Body (editable)</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Generated email will appear here. Edit freely."
          rows={14}
          style={{ width: '100%', padding: 12, marginTop: 8, whiteSpace: 'pre-wrap' }}
        />
        <button
          onClick={handleSend}
          disabled={loadingSend || !recipients.trim() || !subject.trim() || !body.trim()}
          style={{ marginTop: 12, padding: '10px 16px' }}
        >
          {loadingSend ? 'Sending…' : 'Send Email'}
        </button>
      </section>

      {status && <p style={{ marginTop: 16 }}>{status}</p>}

      <p style={{ marginTop: 24, color: '#666', fontSize: 12 }}>
        Tip: add “Subject: …” at the top of your prompt if you want a custom subject.
      </p>
    </main>
  );
}
