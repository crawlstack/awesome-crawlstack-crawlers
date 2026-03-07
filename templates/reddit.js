/**
 * Hoofi Crawler Script - Reddit Feed Extractor
 * --------------------------------------------
 * Handles Reddit feeds by piggybacking on the internal JSON API while maintaining
 * normal crawler navigation flow.
 */

// Global Config
const CONFIG = {
    minSleep: 1500,
    maxSleep: 3500,
    batchLimit: 100
};

// const log = console.log;
// const warn = console.warn;
// const error = console.error;

async function router() {
    const currentUrl = new URL(window.location.href);

    // ROUTING: Check if we are on a valid Reddit feed page
    // We allow standard feeds but exclude comment threads to prevent noise
    if (currentUrl.hostname.includes('reddit.com') && !currentUrl.pathname.includes('/comments/')) {
        await extractRedditFeed(currentUrl);
    } else {
        // Fail fast on unexpected URLs so the crawler logs it
        throw new Error(`[Hoofi] Unsupported URL pattern: ${currentUrl.href}`);
    }
}

async function extractRedditFeed(urlObj) {
    log(`[Hoofi] Processing feed: ${urlObj.href}`);

    // 1. Construct the API URL
    // We take the current browser URL (e.g. reddit.com/new?after=abc)
    // and convert it to the API endpoint (reddit.com/new.json?after=abc)
    const apiUrl = new URL(urlObj.href);

    // Handle path modification safely
    if (!apiUrl.pathname.endsWith('.json')) {
        const path = apiUrl.pathname.endsWith('/') ? apiUrl.pathname.slice(0, -1) : apiUrl.pathname;
        apiUrl.pathname = `${path}.json`;
    }

    // Force maximum limit for efficiency
    apiUrl.searchParams.set('limit', CONFIG.batchLimit.toString());

    // 2. Fetch Data (with random sleep)
    await sleep(CONFIG.minSleep, CONFIG.maxSleep);

    const response = await fetch(apiUrl.toString());

    if (!response.ok) {
        throw new Error(`Reddit API request failed: ${response.status}`);
    }

    const json = await response.json();

    // Validate structure
    if (!json || !json.data || !Array.isArray(json.data.children)) {
        warn("[Hoofi] Invalid JSON structure or empty feed.");
        return;
    }

    const posts = json.data.children;
    log(`[Hoofi] Found ${posts.length} posts.`);

    // 3. Transform to Hoofi Items
    const items = posts.map(child => {
        const p = child.data;

        // Image extraction logic
        const images = [];
        if (p.url && /\.(jpg|jpeg|png|gif)$/i.test(p.url)) {
            images.push({ src: p.url });
        } else if (p.thumbnail && p.thumbnail.startsWith('http')) {
            images.push({ src: p.thumbnail });
        }

        return {
            // "t3_..." is Reddit's global ID for posts
            id: p.name,
            dedupe: 'FOREVER', // Store once, never duplicate
            data: {
                id: p.name,
                title: p.title,
                text: p.selftext,

                // Standard Links & Images
                links: [{ href: `https://www.reddit.com${p.permalink}`, title: "View Post" }],
                images: images,

                // Custom Metadata
                subreddit: p.subreddit,
                author: p.author,
                upvotes: p.score,
                comments: p.num_comments,
                createdUtc: p.created_utc,
                is_video: p.is_video,
                domain: p.domain
            }
        };
    });

    // 4. Save to Database
    if (items.length > 0) {
        await publishItems(items);
        log(`[Hoofi] Published ${items.length} items.`);
    }

    // 5. Handle Pagination
    // Reddit provides an 'after' token (e.g. "t3_xyz") to load the next batch.
    if (json.data.after) {
        const nextToken = json.data.after;

        // We construct the next *browser* URL, not the JSON URL.
        // This ensures the crawler "navigates" properly in the UI.
        const nextUrl = new URL(urlObj.href);
        nextUrl.searchParams.set('after', nextToken);

        log(`[Hoofi] Queueing next page: ${nextToken}`);

        await addTasks([{
            href: nextUrl.toString(),
            dedupe: 'RUN', // Ensure we don't loop back to this page in this specific run
            strategy: 'NAVIGATE'
        }]);
    } else {
        log("[Hoofi] End of feed reached.");
    }
}

// Start Execution
await router();