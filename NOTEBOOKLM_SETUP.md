# NotebookLM Integration Setup

This project is now fully integrated with **Google NotebookLM** using the official NotebookLM MCP CLI.

## What You Can Do Now

Simply paste a URL into the app and watch it:

1. ✅ **Crawl the website** using Crawl4AI (extracts all content)
2. ✅ **Create a NotebookLM notebook** automatically
3. ✅ **Add the URL as a source** to NotebookLM
4. ✅ **Generate audio/podcast** from the content
5. ✅ **Create slides, Q&A, and study guides** (all NotebookLM features available)

Example:
```
Paste: https://www.eecs70.org
Result: Full EECS 70 course materials in NotebookLM with audio, slides, study guides
```

## Architecture

```
Your App
    ↓
[URL] → [Form Input]
    ↓
Crawl4AI (extract content, PDFs, links)
    ↓
NotebookLM CLI (nlm commands)
    ↓
Create Notebook → Add Sources → Generate Audio
    ↓
NotebookLM (https://notebooklm.google.com)
```

## Prerequisites

### 1. Google Account with NotebookLM Access

1. Go to [https://notebooklm.google.com](https://notebooklm.google.com)
2. Sign in with your Google account
3. Verify you can create notebooks manually
4. (Optional) Upgrade to NotebookLM Pro for more features

### 2. Authenticate the CLI Locally

```bash
# This launches your browser to log in
nlm login

# Verify it worked
nlm notebook list
```

The login creates persistent cookies in `~/.notebooklm-mcp-cli/` that the app will use.

## How It Works

### Manual CLI Usage (For Testing)

```bash
# Create a notebook
nlm notebook create "EECS 70 Notes"

# List your notebooks
nlm notebook list

# Add a URL as source
nlm source add <notebook-id> --url "https://eecs70.org"

# Generate audio
nlm audio create <notebook-id> --confirm

# Download artifacts
nlm download all <notebook-id> -d ./exports
```

### Automatic Integration (Via Your App)

1. User pastes URL: `https://eecs70.org`
2. System calls: `Crawl4AI` → crawls the site
3. System calls: `nlm notebook create` → creates NotebookLM notebook
4. System calls: `nlm source add` → adds URL as source
5. System calls: `nlm audio create` → generates podcast
6. User sees notebook in their NotebookLM account

## Implementation Details

### Files Involved

- **`/app/api/sync/start/route.ts`** - Main sync API that orchestrates the workflow
- **`/scripts/notebooklm_sync.py`** - Python utility for NotebookLM CLI integration (optional)
- **`/lib/pipeline.ts`** - Pipeline state management

### What Happens on Sync

When you click "Sync" with a URL:

1. **Crawl4AI** extracts markdown, PDFs, and links from the site
2. **NotebookLM CLI** creates a new notebook in your account
3. **NotebookLM CLI** adds the URL as a source (NotebookLM will crawl it too)
4. **NotebookLM CLI** generates an audio podcast
5. The app shows progress as each step completes
6. Notebook appears in your NotebookLM account

### Configuration

The sync respects these options from the UI:

- **Notebook Name** - Custom name for the notebook (auto-detected from URL if blank)
- **Crawl Depth** - How many levels deep to follow links (1-5)
- **Extract PDFs** - Whether to extract PDFs
- **Extract Sub-links** - Whether to extract sub-page links
- **Page Text** - Whether to scrape page markdown

### Credentials

The app needs your NotebookLM authentication:

1. Run `nlm login` locally (one time)
2. The CLI stores cookies in `~/.notebooklm-mcp-cli/`
3. When you deploy to production, you'll need to handle authentication there

## Usage Examples

### Example 1: EECS 70 Course Website

```
URL: https://www.eecs70.org/
Result:
  ✓ Crawls notes, slides, homeworks, discussions
  ✓ Creates "eecs70.org" notebook in NotebookLM
  ✓ Adds all content as sources
  ✓ Generates study guide and podcast
```

### Example 2: Wikipedia Deep Dive

```
URL: https://en.wikipedia.org/wiki/Machine_Learning
Result:
  ✓ Extracts main article + linked pages (depth setting)
  ✓ Creates "Machine Learning" notebook
  ✓ NotebookLM generates Q&A and study guide
  ✓ Audio podcast available
```

### Example 3: Documentation Website

```
URL: https://docs.anthropic.com/
Result:
  ✓ Crawls entire documentation
  ✓ Extracts all API docs as sources
  ✓ Creates comprehensive notebook
  ✓ Use for learning or reference
```

## Deployment Considerations

### Local Development

Everything works out-of-the-box:
```bash
npm install --legacy-peer-deps
npm run dev
```

The NotebookLM CLI uses local authentication cookies.

### Production (Vercel/Cloud)

To deploy to production:

1. **Option A (Recommended):** Use environment variables for NotebookLM auth
   ```bash
   # Export cookies as env var
   nlm login --export-cookies > cookies.json
   # Add to Vercel env: NOTEBOOKLM_COOKIES=<contents of cookies.json>
   ```

2. **Option B:** Use NotebookLM MCP Server
   - Deploy MCP server separately
   - Connect from your Next.js app via HTTP
   - More complex but fully automated

3. **Option C:** Manual authentication on server
   - Create a scheduled job to refresh auth
   - Or require user to authenticate once per session

## Troubleshooting

### "nlm command not found"

```bash
# Reinstall NotebookLM CLI
uv tool install notebooklm-mcp-cli --force

# Verify
which nlm
nlm --version
```

### "Not authenticated" error

```bash
# Re-authenticate
nlm login

# Check status
nlm login --check
```

### Sync hangs or times out

The Crawl4AI API sometimes takes time. You can:
- Increase the timeout in the API route
- Use a smaller crawl depth
- Try a simpler URL first to test

### Notebook not appearing in NotebookLM

1. Check you're logged into the right Google account
2. Manually verify: `nlm notebook list`
3. Check the sync logs in the app UI
4. Try creating a notebook manually with `nlm notebook create "Test"`

## Next Steps

1. **Test locally:**
   ```bash
   npm run dev
   # Paste a URL and watch it sync
   ```

2. **Customize:**
   - Edit UI colors/styling in `globals.css`
   - Adjust crawl depth options
   - Add more NotebookLM features (download artifacts, share, etc.)

3. **Deploy:**
   - Follow production auth setup above
   - Deploy to Vercel with env vars

4. **Extend:**
   - Add batch sync (multiple URLs at once)
   - Schedule recurring syncs
   - Export notebooks to PDF/markdown
   - Create custom study guides

## API Reference

### NotebookLM CLI Commands Used

```bash
# List all notebooks
nlm notebook list

# Create notebook
nlm notebook create <name>

# Add URL source
nlm source add <notebook-id> --url <url>

# Sync Drive sources
nlm source sync <notebook-id>

# Create audio
nlm audio create <notebook-id> --confirm

# Create slides
nlm slides create <notebook-id> --confirm

# Create study guide
nlm study-guide create <notebook-id> --confirm

# Download all artifacts
nlm download all <notebook-id> -d <directory>
```

### Your App API Endpoints

```bash
# Start a sync
POST /api/sync/start
{
  "url": "https://example.com",
  "config": {
    "notebookName": "My Project",
    "crawlDepth": 2,
    "extractPdfs": true,
    "extractSubLinks": true,
    "scrapeMarkdown": true
  }
}

# Check sync status
GET /api/sync/status?syncId=abc123
```

## Support

For issues with:
- **NotebookLM CLI:** See [GitHub repo](https://github.com/jacob-bd/notebooklm-mcp-cli)
- **Crawl4AI:** See [Crawl4AI docs](https://crawl4ai.com)
- **Your App:** Check the logs in the UI

## License

This integration uses:
- **NotebookLM MCP CLI:** MIT License
- **Crawl4AI:** Apache 2.0
- Your app: Your chosen license
