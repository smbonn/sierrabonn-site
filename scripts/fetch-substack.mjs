// Pulls Sierra's Substack RSS feed and writes data/substack-posts.json in the
// shape js/substack-feed.js expects. Uses only Node's built-in fetch (Node 18+)
// so there is nothing to install and nothing to keep updated.
//
// Fetches via the rss2json.com public API rather than hitting Substack's feed
// URL directly: Substack sits behind Cloudflare Bot Management, which blocks
// GitHub Actions' datacenter IP ranges outright. rss2json fetches the feed
// server-side on infrastructure Substack doesn't block, and returns it as
// clean JSON — which also means no hand-rolled XML/regex parsing here.
//
// Run manually with:  node scripts/fetch-substack.mjs
// Runs automatically via .github/workflows/update-substack.yml

import { writeFile } from "node:fs/promises";

const FEED_URL = "https://sierramariebonn.substack.com/feed";
const RSS2JSON_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(FEED_URL)}`;
const OUTPUT_PATH = new URL("../data/substack-posts.json", import.meta.url);
const MAX_ITEMS = 12;

function excerptFrom(text, wordLimit = 40) {
  const words = text.trim().split(/\s+/);
  if (words.length <= wordLimit) return text.trim();
  return words.slice(0, wordLimit).join(" ") + "…";
}

// rss2json occasionally returns a transient 502/503. One retry after a short
// pause clears that without waiting a full day for the next scheduled run.
async function fetchWithRetry(url, attempts = 2) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url);
    if (res.ok) return res;
    lastErr = new Error(`Failed to fetch Substack feed via rss2json: ${res.status} ${res.statusText}`);
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 3000));
  }
  throw lastErr;
}

async function main() {
  const res = await fetchWithRetry(RSS2JSON_URL);
  const data = await res.json();
  if (data.status !== "ok") {
    throw new Error(`rss2json returned an error: ${data.message || JSON.stringify(data)}`);
  }

  const posts = (data.items || []).slice(0, MAX_ITEMS).map((item) => ({
    title: (item.title || "").trim(),
    link: (item.link || "").trim(),
    // rss2json normalizes pubDate to "YYYY-MM-DD HH:MM:SS" in UTC.
    pubDate: item.pubDate ? new Date(item.pubDate.replace(" ", "T") + "Z").toISOString() : "",
    category: item.categories && item.categories.length ? item.categories[0] : "",
    excerpt: excerptFrom(item.description || "")
  }));

  if (posts.length === 0) {
    console.warn("No items parsed from feed — leaving existing JSON file untouched.");
    return;
  }

  await writeFile(OUTPUT_PATH, JSON.stringify(posts, null, 2) + "\n", "utf-8");
  console.log(`Wrote ${posts.length} posts to data/substack-posts.json`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
