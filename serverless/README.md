# The BT Dojo — AI question generator (Cloudflare Worker)

The Dojo's **“type a topic → Generate”** button calls this small Worker, which
holds your Anthropic API key and asks **Claude Haiku** for a question set. The
static SpinDecks site never sees the key. Until you deploy this and paste its
URL into `js/support.js`, the Generate button just says it isn't switched on
yet — everything else in the Dojo works without it.

**Cost:** Haiku is about **$1 / $5 per million input/output tokens**. One set is
~a few hundred input + ~1,000 output tokens ≈ **well under a penny per set**.
You pay for whatever gets generated, so the rate-limit rule below matters.

## 1. Get an Anthropic API key

1. Sign in at <https://console.anthropic.com>.
2. Add a little credit (Billing) — even $5 lasts a very long time at Haiku prices.
3. Create an API key (starts `sk-ant-…`). Copy it.

## 2. Deploy the Worker

Easiest is the Cloudflare dashboard (no tooling):

1. Create a free account at <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → **Create Worker**.
2. Give it a name, e.g. `bt-dojo-generate`. Click **Deploy**, then **Edit code**.
3. Delete the sample and paste the entire contents of `dojo-generate.worker.js`. **Deploy**.
4. **Settings → Variables and Secrets:**
   - Add a **Secret** named `ANTHROPIC_API_KEY` = your `sk-ant-…` key.
   - *(optional)* Add a **Secret** `DOJO_TOKEN` = any random string, to lightly gate the endpoint. If you set it, put the same value in `dojoGenerateToken` in `js/support.js`.
   - *(optional)* Add a **Variable** `ALLOWED_ORIGINS` = `https://spindecks.app,https://www.spindecks.app` to override the built-in allow-list.
5. Copy the Worker URL — it looks like `https://bt-dojo-generate.<your-subdomain>.workers.dev`.

Prefer the CLI? With [wrangler](https://developers.cloudflare.com/workers/wrangler/):

```bash
wrangler deploy serverless/dojo-generate.worker.js --name bt-dojo-generate
wrangler secret put ANTHROPIC_API_KEY      # paste the key when prompted
# optional: wrangler secret put DOJO_TOKEN
```

## 3. Switch it on in the site

In `js/support.js` set:

```js
dojoGenerateEndpoint: "https://bt-dojo-generate.<your-subdomain>.workers.dev",
dojoGenerateToken: "",   // only if you set DOJO_TOKEN on the Worker
```

Then bump the cache token and regenerate:

```bash
# from the repo root — replace OLD/NEW with the current + next token
grep -rl 'v=OLD' js sw.js build/content.mjs | xargs sed -i 's/v=OLD/v=NEW/g'
node build/generate.mjs
```

Commit and push. The Generate button now produces sets live.

## 4. Protect against abuse (recommended)

The endpoint costs you money, so cap it. In the Cloudflare dashboard:
**Workers & Pages → your Worker → Settings → (Security) Rate limiting** — add a
rule such as **10 requests per minute per IP**. That, plus the Worker's origin
check and the small `max_tokens`, keeps a stray bot from running up a bill. For
a stricter gate, set `DOJO_TOKEN` (step 2).

## 5. Test it

```bash
curl -s -X POST "https://bt-dojo-generate.<you>.workers.dev" \
  -H "Content-Type: application/json" \
  -H "Origin: https://spindecks.app" \
  -d '{"topic":"Year 7 rounding to the nearest 10","count":8}' | head
```

You should get back `{"name":"…","questions":[{"q":"…","a":"…","distractors":[…]}]}`.
The Dojo turns that straight into a playable set.
