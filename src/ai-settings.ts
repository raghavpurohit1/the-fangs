export interface AISettingsEnv {
  DB: D1Database;
  AI_MODEL?: string;
  OPENAI_API_KEY?: string;
  AI_SETTINGS_KEY?: string;
}

export type AIKeySource = 'saved' | 'environment' | 'none';
export interface AISettingsMetadata {
  model: string;
  keySource: AIKeySource;
  keyConfigured: boolean;
  storageAvailable: boolean;
  keyError?: string;
}
export interface AIConfig extends AISettingsMetadata { apiKey: string | undefined }
export interface AISettingsUpdate { model: string; apiKey?: string; removeApiKey?: boolean }
export class AISettingsError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = 'AISettingsError'; }
}

const STORAGE_KEY = 'ai-settings-v1';
const DEFAULT_MODEL = 'gpt-6.2-sol';
const additionalData = new TextEncoder().encode('nextstep:ai-settings-v1');
type Ciphertext = { v: 1; iv: string; ciphertext: string };
type StoredSettings = { v: 1; model: string; encryptedApiKey?: Ciphertext };
const fail = (status: number, message: string): never => { throw new AISettingsError(status, message); };

function modelName(value: unknown, status = 400): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value.trim())) {
    return fail(status, 'Model must be a 1–128 character identifier using letters, numbers, dots, dashes, underscores, or colons.');
  }
  return value.trim();
}
function apiKeyValue(value: unknown, status = 400): string {
  if (typeof value !== 'string') return fail(status, 'API key must be text.');
  const key = value.trim();
  if (key.length < 16 || key.length > 4096 || !/^[\x21-\x7e]+$/.test(key)) {
    return fail(status, 'API key must contain 16–4096 non-whitespace ASCII characters.');
  }
  return key;
}
function encryptionBytes(env: AISettingsEnv): Uint8Array | null {
  if (typeof env.AI_SETTINGS_KEY !== 'string' || !/^[a-fA-F0-9]{64}$/.test(env.AI_SETTINGS_KEY)) return null;
  return Uint8Array.from(env.AI_SETTINGS_KEY.match(/.{2}/g)!, value => parseInt(value, 16));
}
const encode = (value: Uint8Array) => btoa(String.fromCharCode(...value));
function decode(value: unknown): Uint8Array {
  if (typeof value !== 'string' || value.length > 6000 || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    return fail(503, 'Saved AI settings are invalid. Ask the administrator to repair the saved configuration.');
  }
  try { return Uint8Array.from(atob(value), character => character.charCodeAt(0)); }
  catch { return fail(503, 'Saved AI settings are invalid. Ask the administrator to repair the saved configuration.'); }
}
function cipher(value: unknown): Ciphertext {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail(503, 'Saved AI key configuration is invalid.');
  const item = value as Record<string, unknown>;
  if (item.v !== 1 || Object.keys(item).some(key => !['v', 'iv', 'ciphertext'].includes(key))) return fail(503, 'Saved AI key configuration is invalid.');
  if (decode(item.iv).byteLength !== 12 || decode(item.ciphertext).byteLength < 32) return fail(503, 'Saved AI key configuration is invalid.');
  return item as Ciphertext;
}
async function stored(env: AISettingsEnv): Promise<{ raw: string | null; value: StoredSettings | null }> {
  const row = await env.DB.prepare('SELECT value FROM meta WHERE key=?').bind(STORAGE_KEY).first<{ value: string }>();
  if (!row) return { raw: null, value: null };
  let item: Record<string, unknown>;
  try {
    if (typeof row.value !== 'string' || row.value.length > 16000) throw new Error();
    const parsed = JSON.parse(row.value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    item = parsed;
  } catch { return fail(503, 'Saved AI settings are invalid. Ask the administrator to repair the saved configuration.'); }
  if (item.v !== 1 || Object.keys(item).some(key => !['v', 'model', 'encryptedApiKey'].includes(key))) return fail(503, 'Saved AI settings are invalid.');
  const value: StoredSettings = { v: 1, model: modelName(item.model, 503) };
  if ('encryptedApiKey' in item) value.encryptedApiKey = cipher(item.encryptedApiKey);
  return { raw: row.value, value };
}
async function encrypt(env: AISettingsEnv, apiKey: string): Promise<Ciphertext> {
  const bytes = encryptionBytes(env);
  if (!bytes) return fail(503, 'Saving an API key requires AI_SETTINGS_KEY: a server secret containing exactly 64 hexadecimal characters. You can still save a model without a key.');
  const key = await crypto.subtle.importKey('raw', bytes as BufferSource, { name: 'AES-GCM' }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const result = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData }, key, new TextEncoder().encode(apiKey));
  return { v: 1, iv: encode(iv), ciphertext: encode(new Uint8Array(result)) };
}
async function decrypt(env: AISettingsEnv, value: Ciphertext): Promise<string> {
  const bytes = encryptionBytes(env);
  if (!bytes) return fail(503, 'The saved API key is unavailable. Restore AI_SETTINGS_KEY or remove the saved key to use the environment fallback.');
  try {
    const key = await crypto.subtle.importKey('raw', bytes as BufferSource, { name: 'AES-GCM' }, false, ['decrypt']);
    const result = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(value.iv) as BufferSource, additionalData }, key, decode(value.ciphertext) as BufferSource);
    return apiKeyValue(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(result), 503);
  } catch {
    return fail(503, 'The saved API key could not be decrypted. Restore AI_SETTINGS_KEY, replace the saved key, or remove it to use the environment fallback.');
  }
}
async function configFor(env: AISettingsEnv, value: StoredSettings | null): Promise<AIConfig> {
  const model = modelName(value?.model ?? env.AI_MODEL ?? DEFAULT_MODEL, 503);
  const storageAvailable = !!encryptionBytes(env);
  if (value?.encryptedApiKey) return { model, apiKey: await decrypt(env, value.encryptedApiKey), keySource: 'saved', keyConfigured: true, storageAvailable };
  const apiKey = env.OPENAI_API_KEY?.trim() ? apiKeyValue(env.OPENAI_API_KEY, 503) : undefined;
  return { model, apiKey, keySource: apiKey ? 'environment' : 'none', keyConfigured: !!apiKey, storageAvailable };
}
function metadata(config: AIConfig): AISettingsMetadata {
  return { model: config.model, keySource: config.keySource, keyConfigured: config.keyConfigured, storageAvailable: config.storageAvailable };
}

/** Internal server use only: never serialize this result to a browser or log it. */
export async function readAIConfig(env: AISettingsEnv): Promise<AIConfig> {
  return configFor(env, (await stored(env)).value);
}
/** Safe for administrator responses; excludes plaintext and encrypted key material. */
export async function getAISettingsMetadata(env: AISettingsEnv): Promise<AISettingsMetadata> {
  let saved: StoredSettings | null = null;
  let storedRead = false;
  try {
    saved = (await stored(env)).value;
    storedRead = true;
    return metadata(await configFor(env, saved));
  } catch (error) {
    if (!(error instanceof AISettingsError)) throw error;
    let model = DEFAULT_MODEL;
    try { model = modelName(saved?.model ?? env.AI_MODEL ?? DEFAULT_MODEL, 503); } catch { /* Retain a safe editable model. */ }
    return {
      model,
      keySource: !storedRead || saved?.encryptedApiKey ? 'saved' : env.OPENAI_API_KEY ? 'environment' : 'none',
      keyConfigured: false,
      storageAvailable: !!encryptionBytes(env),
      keyError: 'AI configuration is unavailable. Replace or remove the saved key, or check the server environment settings.'
    };
  }
}
export async function saveAISettings(env: AISettingsEnv, input: AISettingsUpdate): Promise<AISettingsMetadata> {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !['model', 'apiKey', 'removeApiKey'].includes(key))) return fail(400, 'Only model, apiKey, and removeApiKey can be changed here.');
  const model = modelName(input.model);
  if (input.removeApiKey !== undefined && typeof input.removeApiKey !== 'boolean') return fail(400, 'removeApiKey must be true or false.');
  if (input.apiKey !== undefined && typeof input.apiKey !== 'string') return fail(400, 'API key must be text.');
  const replacement = input.apiKey?.trim() ? apiKeyValue(input.apiKey) : undefined;
  if (replacement && input.removeApiKey) return fail(400, 'Choose either replacing or removing the saved API key.');
  const encryptedApiKey = replacement ? await encrypt(env, replacement) : undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    let previous: { raw: string | null; value: StoredSettings | null };
    try { previous = await stored(env); }
    catch (error) {
      if (!(error instanceof AISettingsError) || (!encryptedApiKey && !input.removeApiKey)) throw error;
      // An administrator can explicitly recover a damaged row without decrypting or exposing it.
      const row = await env.DB.prepare('SELECT value FROM meta WHERE key=?').bind(STORAGE_KEY).first<{ value: string }>();
      previous = { raw: row?.value ?? null, value: null };
    }
    const next: StoredSettings = { v: 1, model };
    if (encryptedApiKey) next.encryptedApiKey = encryptedApiKey;
    else if (!input.removeApiKey && previous.value?.encryptedApiKey) next.encryptedApiKey = previous.value.encryptedApiKey;
    // Validate the effective configuration before persistence; no success followed by a hidden decrypt failure.
    const result = metadata(await configFor(env, next));
    const write = await env.DB.prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE meta.value=?').bind(STORAGE_KEY, JSON.stringify(next), previous.raw).run();
    if (write.meta.changes) return result;
  }
  return fail(409, 'AI settings changed while saving. Refresh and try again.');
}
