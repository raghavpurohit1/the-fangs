import test from 'node:test';
import assert from 'node:assert/strict';
import { AISettingsError, getAISettingsMetadata, readAIConfig, saveAISettings, type AISettingsEnv } from '../src/ai-settings.ts';

const KEY_ONE = '31'.repeat(32);
const KEY_TWO = 'ab'.repeat(32);
const API_ONE = 'sk-synthetic-local-test-key-one';
const API_TWO = 'sk-synthetic-local-test-key-two';
function fixture(extra: Partial<AISettingsEnv> = {}) {
  const rows = new Map<string, string>();
  const DB = { prepare(sql: string) { return { bind(...values: unknown[]) { return {
    async first() { const value = rows.get(values[0] as string); return value === undefined ? null : { value }; },
    async run() {
      assert.ok(sql.startsWith('INSERT INTO meta'));
      const [key, value, expected] = values as [string, string, string | null];
      if (rows.has(key) && rows.get(key) !== expected) return { meta: { changes: 0 } };
      rows.set(key, value); return { meta: { changes: 1 } };
    }
  }; } }; } } as unknown as D1Database;
  return { env: { DB, ...extra } as AISettingsEnv, rows };
}
async function rejectsStatus(action: Promise<unknown>, status: number) {
  await assert.rejects(action, (error: unknown) => error instanceof AISettingsError && error.status === status);
}

test('AI configuration defaults and environment source expose only safe metadata', async () => {
  const { env, rows } = fixture();
  assert.deepEqual(await getAISettingsMetadata(env), { model: 'gpt-6.2-sol', keySource: 'none', keyConfigured: false, storageAvailable: false });
  env.OPENAI_API_KEY = API_ONE; env.AI_MODEL = 'example-model';
  assert.deepEqual(await getAISettingsMetadata(env), { model: 'example-model', keySource: 'environment', keyConfigured: true, storageAvailable: false });
  assert.equal((await readAIConfig(env)).apiKey, API_ONE);
  assert.equal(rows.size, 0);
});

test('saved key is authenticated ciphertext, overrides environment, and never appears in metadata', async () => {
  const { env, rows } = fixture({ AI_SETTINGS_KEY: KEY_ONE, OPENAI_API_KEY: API_TWO });
  const result = await saveAISettings(env, { model: 'example-model', apiKey: API_ONE });
  const raw = rows.get('ai-settings-v1')!;
  assert.ok(!raw.includes(API_ONE)); assert.ok(!raw.includes(API_TWO));
  assert.ok(!JSON.stringify(result).includes('sk-'));
  assert.deepEqual(Object.keys(result).sort(), ['keyConfigured', 'keySource', 'model', 'storageAvailable']);
  assert.equal(result.keySource, 'saved');
  assert.equal((await readAIConfig(env)).apiKey, API_ONE);
  const firstCipher = JSON.parse(raw).encryptedApiKey;
  await saveAISettings(env, { model: 'example-model', apiKey: API_ONE });
  assert.notEqual(JSON.parse(rows.get('ai-settings-v1')!).encryptedApiKey.iv, firstCipher.iv);
});

test('blank or omitted key preserves saved ciphertext while changing model', async () => {
  const { env, rows } = fixture({ AI_SETTINGS_KEY: KEY_ONE });
  await saveAISettings(env, { model: 'example-one', apiKey: API_ONE });
  const before = JSON.parse(rows.get('ai-settings-v1')!).encryptedApiKey;
  await saveAISettings(env, { model: 'example-two', apiKey: '  \n ' });
  await saveAISettings(env, { model: 'example-three' });
  assert.deepEqual(JSON.parse(rows.get('ai-settings-v1')!).encryptedApiKey, before);
  assert.equal((await readAIConfig(env)).apiKey, API_ONE);
  assert.equal((await readAIConfig(env)).model, 'example-three');
});

test('remove clears only saved key and honestly returns environment fallback or none', async () => {
  const { env, rows } = fixture({ AI_SETTINGS_KEY: KEY_ONE, OPENAI_API_KEY: API_TWO });
  await saveAISettings(env, { model: 'example-model', apiKey: API_ONE });
  delete env.AI_SETTINGS_KEY;
  const result = await saveAISettings(env, { model: 'example-model', removeApiKey: true });
  assert.equal(result.keySource, 'environment'); assert.equal((await readAIConfig(env)).apiKey, API_TWO);
  assert.equal(JSON.parse(rows.get('ai-settings-v1')!).encryptedApiKey, undefined);
  delete env.OPENAI_API_KEY;
  assert.equal((await saveAISettings(env, { model: 'example-model', removeApiKey: true })).keySource, 'none');
});

test('missing or invalid encryption secret permits model-only save and rejects key save', async () => {
  for (const AI_SETTINGS_KEY of [undefined, 'short', 'z'.repeat(64)]) {
    const { env } = fixture({ AI_SETTINGS_KEY });
    assert.equal((await saveAISettings(env, { model: 'example-model' })).storageAvailable, false);
    await rejectsStatus(saveAISettings(env, { model: 'example-model', apiKey: API_ONE }), 503);
  }
});

test('key rotation fails closed until the saved credential is replaced or removed', async () => {
  const { env } = fixture({ AI_SETTINGS_KEY: KEY_ONE, OPENAI_API_KEY: API_TWO });
  await saveAISettings(env, { model: 'example-model', apiKey: API_ONE });
  env.AI_SETTINGS_KEY = KEY_TWO;
  await rejectsStatus(readAIConfig(env), 503);
  const unavailable = await getAISettingsMetadata(env);
  assert.equal(unavailable.keyConfigured, false);
  assert.equal(unavailable.keySource, 'saved');
  assert.ok(unavailable.keyError);
  assert.ok(!JSON.stringify(unavailable).includes(API_ONE));
  await saveAISettings(env, { model: 'example-model', apiKey: API_TWO });
  assert.equal((await readAIConfig(env)).apiKey, API_TWO);
  delete env.AI_SETTINGS_KEY;
  await rejectsStatus(readAIConfig(env), 503);
  assert.equal((await getAISettingsMetadata(env)).keyConfigured, false);
  assert.equal((await saveAISettings(env, { model: 'example-model', removeApiKey: true })).keySource, 'environment');
});

test('tampering and malformed stored data fail closed without reflecting secret content', async () => {
  const { env, rows } = fixture({ AI_SETTINGS_KEY: KEY_ONE, OPENAI_API_KEY: API_TWO });
  await saveAISettings(env, { model: 'example-model', apiKey: API_ONE });
  const original = rows.get('ai-settings-v1')!;
  const changed = JSON.parse(original);
  changed.encryptedApiKey.ciphertext = (changed.encryptedApiKey.ciphertext[0] === 'A' ? 'B' : 'A') + changed.encryptedApiKey.ciphertext.slice(1);
  for (const raw of [JSON.stringify(changed), '{broken', JSON.stringify({ v: 1, model: 'example-model', apiKey: API_ONE })]) {
    rows.set('ai-settings-v1', raw);
    await assert.rejects(readAIConfig(env), (error: unknown) => error instanceof AISettingsError && error.status === 503 && !error.message.includes(API_ONE) && !error.message.includes(API_TWO));
    const publicSettings = await getAISettingsMetadata(env);
    assert.equal(publicSettings.keyConfigured, false);
    assert.ok(publicSettings.keyError);
    assert.ok(!JSON.stringify(publicSettings).includes(API_ONE));
  }
  await saveAISettings(env, { model: 'example-recovered', removeApiKey: true });
  assert.equal((await readAIConfig(env)).apiKey, API_TWO);
  rows.set('ai-settings-v1', '{broken');
  await saveAISettings(env, { model: 'example-replaced', apiKey: API_ONE });
  assert.equal((await readAIConfig(env)).apiKey, API_ONE);
});

test('invalid models, keys, and conflicting actions are rejected before persistence', async () => {
  const { env, rows } = fixture({ AI_SETTINGS_KEY: KEY_ONE });
  for (const model of ['', 'model with spaces', 'https://example.org', 'a'.repeat(129)]) await rejectsStatus(saveAISettings(env, { model }), 400);
  for (const apiKey of ['short', 'x'.repeat(4097), 'sk-secret\nwith-newline', 'sk-secret-☃-unicode']) await rejectsStatus(saveAISettings(env, { model: 'example-model', apiKey }), 400);
  await rejectsStatus(saveAISettings(env, { model: 'example-model', apiKey: API_ONE, removeApiKey: true }), 400);
  await rejectsStatus(saveAISettings(env, { model: 'example-model', removeApiKey: 'yes' } as never), 400);
  assert.equal(rows.size, 0);
  env.AI_MODEL = 'invalid model'; await rejectsStatus(readAIConfig(env), 503);
});

test('concurrent model-only update does not erase a concurrently saved key', async () => {
  const { env } = fixture({ AI_SETTINGS_KEY: KEY_ONE });
  await Promise.all([saveAISettings(env, { model: 'example-one', apiKey: API_ONE }), saveAISettings(env, { model: 'example-two' })]);
  assert.equal((await readAIConfig(env)).apiKey, API_ONE);
});
