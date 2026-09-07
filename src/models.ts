import type { ProviderModelConfig } from "@earendil-works/pi-coding-agent";

export const PROVIDER_ID = "feihoa";
export const BASE_URL = "https://api.feihoa.com/v1";
export const API_KEY_ENV = "FEIHOA_API_KEY";

export interface FeihoaModelInfo {
  id: string;
  name?: string;
  context_window?: number;
  max_output_tokens?: number;
  reasoning_efforts?: string[];
  capabilities?: string[];
}

export interface FeihoaModelsResponse {
  data?: FeihoaModelInfo[];
}

const OFF_ALIASES = ["off", "none", "disabled", "disable"];
const PI_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"] as const;

/**
 * Map pi thinking levels to the effort values the endpoint advertises.
 * Levels the endpoint does not list are hidden, and "off" maps to the
 * server's explicit off-value (e.g. "none") when one is advertised.
 */
export function buildThinkingLevelMap(
  efforts: string[],
): Partial<Record<(typeof PI_LEVELS)[number], string | null>> | undefined {
  if (!efforts.length) return undefined;
  const map: Partial<Record<(typeof PI_LEVELS)[number], string | null>> = {};
  for (const level of PI_LEVELS) {
    if (level === "off") {
      const offValue = OFF_ALIASES.find((alias) => efforts.includes(alias));
      map[level] = offValue ?? "off";
    } else {
      map[level] = efforts.includes(level) ? level : null;
    }
  }
  return map;
}

function safeLimit(value: number | undefined, fallback: number): number {
  if (
    value !== undefined
    && Number.isSafeInteger(value)
    && value > 0
    && value <= 2_147_483_647
  ) {
    return value;
  }
  return fallback;
}

export function toModelConfig(model: FeihoaModelInfo): ProviderModelConfig {
  if (!model.id) throw new Error("Feihoa returned a model with an empty id");
  const efforts = model.reasoning_efforts ?? [];
  return {
    id: model.id,
    name: model.name || model.id,
    reasoning: efforts.length > 0,
    thinkingLevelMap: buildThinkingLevelMap(efforts),
    input: ["text"], // feihoa.com/llms.txt: text only, image input not supported
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, // Feihoa reports no prices
    contextWindow: safeLimit(model.context_window, 32_768),
    maxTokens: safeLimit(model.max_output_tokens, 8_192),
    compat: {
      maxTokensField: "max_tokens", // Feihoa speaks classic Chat Completions, not max_completion_tokens
    },
  };
}

/** Fallback catalog used when discovery was skipped or failed. */
export const FALLBACK_MODELS: FeihoaModelInfo[] = [{ id: "Qwen3.8-27B-Uncensored" }];

export function fallbackModelConfigs(): ProviderModelConfig[] {
  return FALLBACK_MODELS.map(toModelConfig);
}

export function parseModelInfos(payload: unknown): FeihoaModelInfo[] {
  const data = (payload as FeihoaModelsResponse | null)?.data;
  if (!Array.isArray(data)) throw new Error("Unexpected /v1/models payload: missing data array");
  return data;
}

/** Fetch the model catalog. Throws on non-2xx; callers fall back to FALLBACK_MODELS. */
export async function fetchModels(apiKey: string, signal?: AbortSignal): Promise<FeihoaModelInfo[]> {
  const response = await fetch(`${BASE_URL}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal,
  });
  if (!response.ok) throw new Error(`GET /v1/models failed with HTTP ${response.status}`);
  const models = parseModelInfos(await response.json());
  if (!models.length) throw new Error("GET /v1/models returned an empty catalog");
  const seen = new Set<string>();
  for (const model of models) {
    if (!model.id || seen.has(model.id)) throw new Error("Feihoa returned an invalid or duplicate model ID");
    seen.add(model.id);
  }
  return models;
}
