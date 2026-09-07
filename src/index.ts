import type { ExtensionAPI, ProviderModelConfig } from "@earendil-works/pi-coding-agent";
import {
  API_KEY_ENV,
  BASE_URL,
  PROVIDER_ID,
  fallbackModelConfigs,
  fetchModels,
  toModelConfig,
} from "./models.ts";

async function resolveModels(): Promise<ProviderModelConfig[]> {
  const apiKey = process.env[API_KEY_ENV]?.trim();
  if (!apiKey) return fallbackModelConfigs();
  try {
    const models = await fetchModels(apiKey, AbortSignal.timeout(10_000));
    return models.map(toModelConfig);
  } catch {
    // Discovery is best-effort. /v1/models needs the same key inference uses;
    // without it we still expose the default model so /model stays usable.
    return fallbackModelConfigs();
  }
}

// Async factory: pi waits for it, so the discovered catalog is available at
// startup and to `pi --list-models`. Missing key or network falls back to the
// static default; /reload retries discovery once the key is set.
export default async function feihoaProvider(pi: ExtensionAPI) {
  pi.registerProvider(PROVIDER_ID, {
    name: "Feihoa",
    baseUrl: BASE_URL,
    apiKey: `$${API_KEY_ENV}`,
    api: "openai-completions",
    models: await resolveModels(),
  });
}
