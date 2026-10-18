# LSTA Tax Comparison

Compare tax provisions in a credit or loan agreement against the annotated LSTA reference. This browser app includes 29 reference comparisons, additional tax findings, verified source highlights and an annotated HTML download.

## Publish on GitHub Pages

1. In Settings → Secrets and variables → Actions, add a repository secret named OPENROUTER_API_KEY.
2. In Settings → Pages, choose GitHub Actions as the source.
3. In Actions, run Publish LSTA Tax Comparison. If the initial run failed before the secret was configured, rerun it.

The build defaults to openai/gpt-4.1. An Actions variable named OPENROUTER_MODEL can select another OpenRouter model.

The build writes the API key into the deployed browser configuration. It is not committed in source, but visitors can retrieve it from the published site. This architecture was explicitly chosen for a budget-limited app key.

## Development

Use Node 24 and pnpm 11.25.0. Install with pnpm install, copy public/openrouter-config.example.json to public/openrouter-config.json and enter the app key locally. Do not commit that file. Copy the PDF worker from node_modules/pdfjs-dist/build/pdf.worker.min.mjs into public/pdf.worker.min.mjs. Run pnpm run build:pages to create pages-dist.

The GitHub workflow installs dependencies, runs validation and TypeScript checks, copies the PDF worker, builds static files and publishes them to GitHub Pages.

## Review limits

The model and guide context are historical reference materials. Source-quote verification proves that text exists, not that an AI interpretation is legally correct. Live comparisons need substantive evaluation before professional reliance. Scanned PDFs need OCR before upload. The annotated download reproduces extracted text and highlights rather than original PDF/Word layout. User documents stay in browser memory apart from extracted text sent to OpenRouter when comparison is requested.

The included model must only be distributed with the necessary rights. GitHub Pages publishes the reference viewer and its original Word download.
