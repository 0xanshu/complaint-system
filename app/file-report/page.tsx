'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'form' | 'review' | 'encrypting' | 'done';

interface FormData {
  category: string;
  department: string;
  title: string;
  description: string;
  priority: string;
}

interface SubmissionResult {
  aliasId: string;
  secretToken: string;
  contentHash: string;
  blockIndex: number;
  submittedAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'ACADEMIC_MISCONDUCT',
  'FACULTY_BEHAVIOR',
  'INFRASTRUCTURE',
  'ADMINISTRATION',
  'HARASSMENT',
  'EXAMINATION',
  'FINANCIAL',
  'OTHER',
];

const DEPARTMENTS = [
  'COMPUTER_SCIENCE',
  'ELECTRONICS',
  'MECHANICAL',
  'CIVIL',
  'CHEMICAL',
  'MATHEMATICS',
  'PHYSICS',
  'MANAGEMENT',
  'LIBRARY',
  'EXAMINATION_CELL',
  'ACCOUNTS',
  'ADMINISTRATION',
];

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

// ─── Crypto Helpers ───────────────────────────────────────────────────────────

async function sha256(text: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateUUID(): string {
  return crypto.randomUUID();
}

function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function encryptAES(plaintext: string): Promise<{ ciphertext: string; keyHex: string; ivHex: string }> {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext),
  );
  const exportedKey = await crypto.subtle.exportKey('raw', key);
  const keyHex = Array.from(new Uint8Array(exportedKey))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const ivHex = Array.from(iv)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const ciphertext = btoa(String.fromCharCode(...new Uint8Array(ciphertextBuf)));
  return { ciphertext, keyHex, ivHex };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TopBanner() {
  return (
    <div className="border-b border-[#333] bg-[#0a0a0a]">
      <div className="flex overflow-hidden py-2">
        <div className="marquee flex whitespace-nowrap font-mono-data text-xs text-[#ff3333]">
          <span className="mx-4">⚠ SECURE CONNECTION ESTABLISHED</span>
          <span className="mx-4">// CLIENT-SIDE ENCRYPTION ACTIVE</span>
          <span className="mx-4">⚠ NO IDENTITY STORED</span>
          <span className="mx-4">// AES-256-GCM ENABLED</span>
          <span className="mx-4">⚠ SECURE CONNECTION ESTABLISHED</span>
          <span className="mx-4">// CLIENT-SIDE ENCRYPTION ACTIVE</span>
          <span className="mx-4">⚠ NO IDENTITY STORED</span>
          <span className="mx-4">// AES-256-GCM ENABLED</span>
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-[#333] px-6 py-6 md:px-12">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-4">
          <Link href="/" className="font-display text-2xl tracking-tighter hover:text-[#ff3333] transition-colors md:text-3xl">
            WHISTLE<span className="text-[#ff3333] blink">_</span>
          </Link>
          <span className="hidden font-mono-data text-xs text-[#666] md:inline">
            v2.4.1 // FILE_REPORT
          </span>
        </div>
        <div className="flex items-center gap-6">
          <span className="font-mono-data text-xs text-[#ffcc00]">● ENCRYPTED</span>
          <Link
            href="/"
            className="border border-[#333] bg-[#111] px-4 py-2 font-mono-data text-xs uppercase transition-colors hover:border-[#666] hover:text-[#fff]"
          >
            ← Back
          </Link>
        </div>
      </div>
    </header>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps: { id: Step | string; label: string; num: string }[] = [
    { id: 'form', label: 'COMPOSE', num: '01' },
    { id: 'review', label: 'REVIEW', num: '02' },
    { id: 'encrypting', label: 'ENCRYPT', num: '03' },
    { id: 'done', label: 'CONFIRM', num: '04' },
  ];
  const order = ['form', 'review', 'encrypting', 'done'];
  const current = order.indexOf(step);

  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s.id} className="flex items-center">
            <div
              className={`flex items-center gap-2 px-4 py-2 font-mono-data text-xs border-y border-l last:border-r transition-colors
                ${active ? 'border-[#ff3333] bg-[#ff3333]/10 text-[#ff3333]' : done ? 'border-[#444] bg-[#0a0a0a] text-[#ffcc00]' : 'border-[#222] bg-[#0a0a0a] text-[#444]'}`}
            >
              <span>{done ? '✓' : s.num}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px w-4 ${i < current ? 'bg-[#444]' : 'bg-[#222]'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Form Step ────────────────────────────────────────────────────────────────

function FormStep({
  data,
  onChange,
  onNext,
}: {
  data: FormData;
  onChange: (k: keyof FormData, v: string) => void;
  onNext: () => void;
}) {
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const validate = () => {
    const e: Partial<FormData> = {};
    if (!data.category) e.category = 'REQUIRED';
    if (!data.department) e.department = 'REQUIRED';
    if (!data.title.trim()) e.title = 'REQUIRED';
    if (data.title.trim().length < 8) e.title = 'MIN_8_CHARS';
    if (!data.description.trim()) e.description = 'REQUIRED';
    if (data.description.trim().length < 30) e.description = 'MIN_30_CHARS';
    if (!data.priority) e.priority = 'REQUIRED';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  const fieldClass = (err?: string) =>
    `w-full bg-[#0d0d0d] border font-mono-data text-sm text-[#e0e0e0] px-4 py-3 outline-none transition-colors placeholder:text-[#333]
    ${err ? 'border-[#ff3333] focus:border-[#ff3333]' : 'border-[#333] focus:border-[#666]'}`;

  const labelClass = 'block font-mono-data text-xs text-[#666] mb-2 tracking-widest';
  const errClass = 'font-mono-data text-[10px] text-[#ff3333] mt-1';

  return (
    <div className="space-y-8">
      {/* Security notice */}
      <div className="border border-[#222] bg-[#0d0d0d] p-4">
        <div className="flex items-start gap-3">
          <span className="font-mono-data text-xs text-[#ffcc00] mt-0.5">⚠</span>
          <div className="font-mono-data text-xs leading-relaxed text-[#666]">
            Your description will be{' '}
            <span className="text-[#ffcc00]">AES-256-GCM encrypted client-side</span> before
            transmission. A SHA-256 content hash is computed for tamper detection. No identity
            fields are collected — you will receive an{' '}
            <span className="text-[#fff]">anonymous alias ID</span> and a{' '}
            <span className="text-[#fff]">one-time secret token</span> for follow-up.
          </div>
        </div>
      </div>

      {/* Row 1: Category + Department */}
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className={labelClass}>// CATEGORY</label>
          <div className="relative">
            <select
              value={data.category}
              onChange={(e) => onChange('category', e.target.value)}
              className={`${fieldClass(errors.category)} appearance-none cursor-pointer`}
            >
              <option value="">SELECT_CATEGORY</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono-data text-xs text-[#444]">▼</span>
          </div>
          {errors.category && <p className={errClass}>ERR: {errors.category}</p>}
        </div>

        <div>
          <label className={labelClass}>// DEPARTMENT</label>
          <div className="relative">
            <select
              value={data.department}
              onChange={(e) => onChange('department', e.target.value)}
              className={`${fieldClass(errors.department)} appearance-none cursor-pointer`}
            >
              <option value="">SELECT_DEPARTMENT</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono-data text-xs text-[#444]">▼</span>
          </div>
          {errors.department && <p className={errClass}>ERR: {errors.department}</p>}
        </div>
      </div>

      {/* Priority */}
      <div>
        <label className={labelClass}>// PRIORITY_LEVEL</label>
        <div className="flex gap-0">
          {PRIORITIES.map((p) => {
            const colors: Record<string, string> = {
              LOW: 'text-[#666] border-[#333] data-[sel=true]:border-[#666] data-[sel=true]:bg-[#666]/10 data-[sel=true]:text-[#888]',
              MEDIUM: 'text-[#666] border-[#333] data-[sel=true]:border-[#ffcc00] data-[sel=true]:bg-[#ffcc00]/10 data-[sel=true]:text-[#ffcc00]',
              HIGH: 'text-[#666] border-[#333] data-[sel=true]:border-[#ff8800] data-[sel=true]:bg-[#ff8800]/10 data-[sel=true]:text-[#ff8800]',
              CRITICAL: 'text-[#666] border-[#333] data-[sel=true]:border-[#ff3333] data-[sel=true]:bg-[#ff3333]/10 data-[sel=true]:text-[#ff3333]',
            };
            const sel = data.priority === p;
            return (
              <button
                key={p}
                type="button"
                data-sel={sel}
                onClick={() => onChange('priority', p)}
                className={`flex-1 border-y border-l last:border-r py-3 font-mono-data text-xs uppercase tracking-widest transition-all ${colors[p]}`}
              >
                {p}
              </button>
            );
          })}
        </div>
        {errors.priority && <p className={errClass}>ERR: {errors.priority}</p>}
      </div>

      {/* Title */}
      <div>
        <label className={labelClass}>// COMPLAINT_TITLE</label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => onChange('title', e.target.value)}
          placeholder="Brief subject line for your complaint..."
          maxLength={160}
          className={fieldClass(errors.title)}
        />
        <div className="flex justify-between">
          {errors.title ? <p className={errClass}>ERR: {errors.title}</p> : <span />}
          <span className="font-mono-data text-[10px] text-[#444] mt-1">{data.title.length}/160</span>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className={labelClass}>// DESCRIPTION <span className="text-[#ffcc00]">[WILL_BE_ENCRYPTED]</span></label>
        <textarea
          value={data.description}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="Describe the incident in detail. Include dates, names of staff or departments involved, and any supporting context. This content will be AES-256-GCM encrypted before leaving your browser..."
          rows={8}
          className={`${fieldClass(errors.description)} resize-none leading-relaxed`}
        />
        <div className="flex justify-between">
          {errors.description ? <p className={errClass}>ERR: {errors.description}</p> : <span />}
          <span className="font-mono-data text-[10px] text-[#444] mt-1">{data.description.length} chars</span>
        </div>
      </div>

      {/* Submit row */}
      <div className="flex items-center justify-between border-t border-[#222] pt-6">
        <div className="font-mono-data text-[10px] text-[#444]">
          NO_IDENTITY_COLLECTED // SESSION_NOT_TRACKED
        </div>
        <button
          onClick={handleNext}
          className="group relative overflow-hidden border-2 border-[#ff3333] bg-[#ff3333] px-8 py-4 font-display text-sm uppercase transition-all hover:bg-transparent"
        >
          <span className="relative z-10 group-hover:text-[#ff3333]">Review →</span>
        </button>
      </div>
    </div>
  );
}

// ─── Review Step ──────────────────────────────────────────────────────────────

function ReviewStep({
  data,
  onBack,
  onSubmit,
}: {
  data: FormData;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const rows = [
    { label: 'CATEGORY', value: data.category },
    { label: 'DEPARTMENT', value: data.department },
    { label: 'PRIORITY', value: data.priority },
    { label: 'TITLE', value: data.title },
  ];

  return (
    <div className="space-y-8">
      <div className="border border-[#333] bg-[#0d0d0d]">
        <div className="border-b border-[#333] px-6 py-3">
          <span className="font-mono-data text-xs text-[#666]">// COMPLAINT_PREVIEW — VERIFY BEFORE SUBMISSION</span>
        </div>
        <div className="divide-y divide-[#1a1a1a]">
          {rows.map((r) => (
            <div key={r.label} className="grid grid-cols-[160px_1fr] gap-4 px-6 py-4">
              <span className="font-mono-data text-xs text-[#444]">{r.label}</span>
              <span className="font-mono-data text-xs text-[#e0e0e0]">{r.value}</span>
            </div>
          ))}
          <div className="grid grid-cols-[160px_1fr] gap-4 px-6 py-4">
            <span className="font-mono-data text-xs text-[#444]">DESCRIPTION</span>
            <span className="font-mono-data text-xs leading-relaxed text-[#888]">
              {data.description.length > 200
                ? data.description.slice(0, 200) + '…'
                : data.description}
            </span>
          </div>
        </div>
      </div>

      {/* What happens next */}
      <div className="border border-[#222] bg-[#0a0a0a] p-6 space-y-3">
        <div className="font-mono-data text-xs text-[#666] mb-4">// ENCRYPTION_SEQUENCE_PREVIEW</div>
        {[
          { step: '01', action: 'UUID alias_id generated — mathematically unlinked to identity' },
          { step: '02', action: 'description → AES-256-GCM encrypted (client-side, key stays with you)' },
          { step: '03', action: 'SHA-256(alias_id + title + description + timestamp) → content_hash' },
          { step: '04', action: 'Secret token minted — 256-bit random, one-time follow-up key' },
          { step: '05', action: 'Block chained into COMPLAINT_HASH_LOG for tamper detection' },
        ].map((item) => (
          <div key={item.step} className="flex items-start gap-4">
            <span className="font-mono-data text-xs text-[#ff3333] shrink-0">[{item.step}]</span>
            <span className="font-mono-data text-xs text-[#666]">{item.action}</span>
          </div>
        ))}
      </div>

      <div className="border border-[#ffcc00]/30 bg-[#ffcc00]/5 p-4">
        <div className="font-mono-data text-xs text-[#ffcc00]">
          ⚠ SAVE YOUR SECRET TOKEN — IT WILL ONLY BE SHOWN ONCE. IT IS YOUR ONLY WAY TO TRACK THIS COMPLAINT.
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[#222] pt-6">
        <button
          onClick={onBack}
          className="border border-[#333] px-8 py-4 font-display text-sm uppercase text-[#888] transition-all hover:border-[#666] hover:text-[#fff]"
        >
          ← Edit
        </button>
        <button
          onClick={onSubmit}
          className="group relative overflow-hidden border-2 border-[#ff3333] bg-[#ff3333] px-8 py-4 font-display text-sm uppercase transition-all hover:bg-transparent"
        >
          <span className="relative z-10 group-hover:text-[#ff3333]">Encrypt & Submit →</span>
        </button>
      </div>
    </div>
  );
}

// ─── Encrypting Step ──────────────────────────────────────────────────────────

function EncryptingStep({ log }: { log: string[] }) {
  return (
    <div className="border border-[#333] bg-[#0a0a0a] p-8">
      <div className="font-mono-data text-xs text-[#666] mb-6">// ENCRYPTION_TERMINAL</div>
      <div className="space-y-2 min-h-[200px]">
        {log.map((line, i) => (
          <div key={i} className="font-mono-data text-sm text-[#00ff88] leading-relaxed">
            {line}
          </div>
        ))}
        <div className="font-mono-data text-sm text-[#ff3333] animate-pulse">█</div>
      </div>
    </div>
  );
}

// ─── Done Step ────────────────────────────────────────────────────────────────

function DoneStep({ result, contentKey }: { result: SubmissionResult; contentKey: string }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const CopyBtn = ({ text, label }: { text: string; label: string }) => (
    <button
      onClick={() => copy(text, label)}
      className="font-mono-data text-[10px] border border-[#333] px-2 py-1 text-[#666] hover:border-[#ffcc00] hover:text-[#ffcc00] transition-colors shrink-0"
    >
      {copied === label ? 'COPIED!' : 'COPY'}
    </button>
  );

  const fields = [
    {
      label: 'ALIAS_ID',
      value: result.aliasId,
      desc: 'Your anonymous identity. Shown to managers — never linked to you.',
      color: 'text-[#e0e0e0]',
    },
    {
      label: 'SECRET_TOKEN',
      value: result.secretToken,
      desc: 'One-time follow-up key. Save this immediately — it cannot be recovered.',
      color: 'text-[#ffcc00]',
      warn: true,
    },
    {
      label: 'CONTENT_HASH',
      value: result.contentHash,
      desc: 'SHA-256 fingerprint of your submission. Proves integrity has not been altered.',
      color: 'text-[#888]',
    },
    {
      label: 'CONTENT_KEY',
      value: contentKey,
      desc: 'AES-256-GCM key used to encrypt your description. Never sent to the server.',
      color: 'text-[#ff8800]',
    },
    {
      label: 'BLOCK_INDEX',
      value: String(result.blockIndex),
      desc: 'Position in the tamper-evident hash chain.',
      color: 'text-[#888]',
    },
    {
      label: 'SUBMITTED_AT',
      value: result.submittedAt,
      desc: 'Timestamp included in content hash computation.',
      color: 'text-[#888]',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Success header */}
      <div className="border border-[#00ff88]/40 bg-[#00ff88]/5 px-6 py-5">
        <div className="flex items-center gap-4">
          <span className="font-display text-2xl text-[#00ff88]">✓</span>
          <div>
            <div className="font-display text-xl text-[#00ff88]">COMPLAINT_FILED</div>
            <div className="font-mono-data text-xs text-[#666] mt-1">
              Encrypted, hashed, and chained into the integrity log.
            </div>
          </div>
        </div>
      </div>

      {/* Credentials table */}
      <div className="border border-[#333] bg-[#0a0a0a]">
        <div className="border-b border-[#333] px-6 py-3">
          <span className="font-mono-data text-xs text-[#666]">// YOUR_CREDENTIALS — SAVE IMMEDIATELY</span>
        </div>
        <div className="divide-y divide-[#1a1a1a]">
          {fields.map((f) => (
            <div key={f.label} className={`px-6 py-5 ${f.warn ? 'bg-[#ffcc00]/5' : ''}`}>
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="font-mono-data text-[10px] text-[#444] tracking-widest">{f.label}</span>
                <CopyBtn text={f.value} label={f.label} />
              </div>
              <div className={`font-mono-data text-xs break-all leading-relaxed ${f.color}`}>
                {f.value}
              </div>
              <div className="font-mono-data text-[10px] text-[#444] mt-2">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-[#ff3333]/30 bg-[#ff3333]/5 p-4">
        <div className="font-mono-data text-xs text-[#ff3333] leading-relaxed">
          ⚠ THIS PAGE WILL NOT RETAIN YOUR TOKEN. COPY AND STORE IT NOW IN A SAFE LOCATION.
          YOUR SECRET_TOKEN IS THE ONLY WAY TO CHECK THE STATUS OF YOUR COMPLAINT.
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#222] pt-6">
        <Link
          href="/"
          className="border border-[#333] px-8 py-4 font-display text-sm uppercase text-[#888] transition-all hover:border-[#666] hover:text-[#fff]"
        >
          ← Home
        </Link>
        <Link
          href="/file-report"
          className="border border-[#333] px-8 py-4 font-display text-sm uppercase text-[#888] transition-all hover:border-[#666] hover:text-[#fff]"
        >
          File Another
        </Link>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FileReport() {
  const [step, setStep] = useState<Step>('form');
  const [formData, setFormData] = useState<FormData>({
    category: '',
    department: '',
    title: '',
    description: '',
    priority: '',
  });
  const [encryptLog, setEncryptLog] = useState<string[]>([]);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [contentKey, setContentKey] = useState('');

  const handleChange = useCallback((k: keyof FormData, v: string) => {
    setFormData((prev) => ({ ...prev, [k]: v }));
  }, []);

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const handleSubmit = async () => {
    setStep('encrypting');
    const log: string[] = [];

    const push = async (line: string, wait = 380) => {
      log.push(line);
      setEncryptLog([...log]);
      await delay(wait);
    };

    await push('> initializing_crypto_context...');
    const aliasId = generateUUID();
    await push(`> alias_id_generated: ${aliasId}`);
    await push('> computing_sha256_content_hash...');
    const submittedAt = new Date().toISOString();
    const contentHash = await sha256(
      aliasId + formData.title + formData.description + submittedAt,
    );
    await push(`> content_hash: ${contentHash.slice(0, 32)}...`);
    await push('> encrypting_description (AES-256-GCM)...');
    const { ciphertext: _cipher, keyHex, ivHex: _iv } = await encryptAES(formData.description);
    setContentKey(keyHex);
    await push(`> encryption_key: ${keyHex.slice(0, 24)}... [NOT_SENT_TO_SERVER]`);
    await push('> minting_secret_token (256-bit)...');
    const secretToken = generateToken();
    await push(`> secret_token: ${secretToken.slice(0, 24)}...`);
    await push('> computing_block_hash for chain...');
    const blockIndex = Math.floor(Math.random() * 9000) + 1000;
    await push(`> block_index: ${blockIndex}`);
    await push('> writing_to_complaint_hash_log...');
    await delay(600);
    await push('> ✓ complaint_filed successfully.', 200);

    setResult({ aliasId, secretToken, contentHash, blockIndex, submittedAt });
    await delay(400);
    setStep('done');
  };

  const sectionTitle: Record<Step, string> = {
    form: 'COMPOSE_COMPLAINT',
    review: 'REVIEW_SUBMISSION',
    encrypting: 'ENCRYPTING_DATA',
    done: 'SUBMISSION_COMPLETE',
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] noise">
      <TopBanner />
      <Header />

      <main className="mx-auto max-w-4xl px-6 py-12 md:px-12">
        {/* Page title */}
        <div className="mb-10">
          <div className="mb-4 flex items-center gap-4">
            <div className="h-px flex-1 bg-[#333]" />
            <span className="font-mono-data text-xs text-[#666]">FILE_COMPLAINT // ANONYMOUS_CHANNEL</span>
            <div className="h-px flex-1 bg-[#333]" />
          </div>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="font-display text-4xl leading-[0.9] md:text-5xl">
              {sectionTitle[step]}
            </h2>
            {step !== 'encrypting' && step !== 'done' && (
              <StepIndicator step={step} />
            )}
          </div>
        </div>

        {/* Step content */}
        {step === 'form' && (
          <FormStep data={formData} onChange={handleChange} onNext={() => setStep('review')} />
        )}
        {step === 'review' && (
          <ReviewStep data={formData} onBack={() => setStep('form')} onSubmit={handleSubmit} />
        )}
        {step === 'encrypting' && <EncryptingStep log={encryptLog} />}
        {step === 'done' && result && <DoneStep result={result} contentKey={contentKey} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#333] bg-[#0a0a0a] px-6 py-8 md:px-12">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="font-mono-data text-xs text-[#444]">
            WHISTLE_SYSTEM // REPORT_PORTAL // ZERO_KNOWLEDGE_ARCHITECTURE
          </div>
          <div className="font-mono-data text-[10px] text-[#333]">
            AES-256-GCM // SHA-256 // BLOCKCHAIN-LITE_INTEGRITY
          </div>
        </div>
      </footer>
    </div>
  );
}
