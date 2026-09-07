import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildThinkingLevelMap,
  fallbackModelConfigs,
  parseModelInfos,
  toModelConfig,
} from "../src/models.ts";

describe("buildThinkingLevelMap", () => {
  it("returns undefined for no efforts", () => {
    assert.equal(buildThinkingLevelMap([]), undefined);
  });

  it("maps matching levels and hides the rest", () => {
    const map = buildThinkingLevelMap(["low", "high"]);
    assert.ok(map);
    assert.equal(map.low, "low");
    assert.equal(map.high, "high");
    assert.equal(map.medium, null);
    assert.equal(map.xhigh, null);
    assert.equal(map.off, "off");
  });

  it("maps off to an alias like none when advertised", () => {
    const map = buildThinkingLevelMap(["none", "medium", "high"]);
    assert.ok(map);
    assert.equal(map.off, "none");
    assert.equal(map.medium, "medium");
  });
});

describe("toModelConfig", () => {
  it("uses server limits and reasoning flag", () => {
    const config = toModelConfig({
      id: "Qwen3.8-27B-Uncensored",
      context_window: 131_072,
      max_output_tokens: 16_384,
      reasoning_efforts: ["low", "high"],
    });
    assert.equal(config.reasoning, true);
    assert.equal(config.contextWindow, 131_072);
    assert.equal(config.maxTokens, 16_384);
    assert.deepEqual(config.input, ["text"]);
    assert.deepEqual(config.cost, { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
    assert.deepEqual(config.compat, { maxTokensField: "max_tokens" });
  });

  it("marks non-reasoning models and falls back to default limits", () => {
    const config = toModelConfig({ id: "plain" });
    assert.equal(config.reasoning, false);
    assert.equal(config.thinkingLevelMap, undefined);
    assert.equal(config.contextWindow, 32_768);
    assert.equal(config.maxTokens, 8_192);
  });

  it("rejects empty ids", () => {
    assert.throws(() => toModelConfig({ id: "" }), /empty id/);
  });

  it("uses default model name as name fallback", () => {
    assert.equal(toModelConfig({ id: "m" }).name, "m");
  });
});

describe("fallbackModelConfigs", () => {
  it("exposes the documented default model", () => {
    const configs = fallbackModelConfigs();
    assert.equal(configs.length, 1);
    assert.equal(configs[0].id, "Qwen3.8-27B-Uncensored");
  });
});

describe("parseModelInfos", () => {
  it("returns the data array", () => {
    assert.deepEqual(parseModelInfos({ data: [{ id: "a" }] }), [{ id: "a" }]);
  });

  it("rejects payloads without a data array", () => {
    assert.throws(() => parseModelInfos({}), /missing data array/);
  });
});
