# pi-feihoa-provider

[Feihoa](https://feihoa.com) as a first-class model provider in [pi](https://github.com/earendil-works/pi-mono). Feihoa is an OpenAI-compatible inference endpoint (default model `Qwen3.8-27B-Uncensored`).

## Setup

1. Get an API key from Feihoa.
2. Set `FEIHOA_API_KEY` in your environment:

   ```powershell
   [Environment]::SetEnvironmentVariable('FEIHOA_API_KEY', 'fh-...', 'User')
   ```

3. Add the package to pi (it stays private; install locally):

   ```powershell
   pi install C:\Users\dperez\Documents\Github\pi-feihoa-provider
   ```

4. Pick the model with `/model` inside pi, listed under **Feihoa**.

## How it works

- The extension factory is async: pi waits for it while it fetches `GET https://api.feihoa.com/v1/models` with your key. Discovered `context_window`, `max_output_tokens`, and `reasoning_efforts` become the model's limits and thinking levels.
- If the key is missing or discovery fails, it falls back to a static entry for `Qwen3.8-27B-Uncensored` (32k context, 8k output) so `/model` still shows something. Run `/reload` once the key is set to retry discovery.
- Uses pi's `openai-completions` API with `max_tokens` (not `max_completion_tokens`), per [feihoa.com/llms.txt](https://feihoa.com/llms.txt). Input is text-only; the server and pi both cap output to remain inside the plan window.
- Retries: Feihoa asks clients to run requests sequentially and honor `Retry-After`. pi does that for its internal retry logic; avoid stacking extra parallel client loops.

## Verify

```powershell
npm run verify   # tsc --noEmit + node --test
```
