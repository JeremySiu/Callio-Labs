# Cloud hosting Langflow

This app calls Langflow via `LANGFLOW_BASE_URL`. To use a cloud-hosted Langflow instance:

1. **Deploy Langflow** to one of these options:
   - **[Railway](https://railway.com/deploy/langflow)** — one-click deploy, PostgreSQL 17, automatic SSL.
   - **[Northflank](https://northflank.com/guides/deploy-langflow-with-northflank)** — managed PostgreSQL, auto-scaling.
   - **Docker on a VPS** — [Containerize a Langflow application](https://docs.langflow.org/develop-application), then run on any server; use [Caddy](https://docs.langflow.org/deployment-caddyfile) or [Nginx + Let's Encrypt](https://docs.langflow.org/deployment-nginx-ssl) for HTTPS.
   - **Kubernetes** — [Langflow Kubernetes deployment](https://docs.langflow.org/deployment-kubernetes-prod) for production.
   - **Quick share (dev only)** — [ngrok](https://docs.langflow.org/deployment-public-server) to expose your local `langflow run`; not for production.

2. **Import your flow** on the deployed Langflow:
   - In the Langflow UI, import `backend/Genome Primer Design Agent FINAL.json`.
   - Note the flow ID (or keep the default `26233de8-e4d6-427a-a2be-938d9990a93d` if you use the same flow).

3. **Configure the frontend** (e.g. in production or `.env.local`):
   ```bash
   LANGFLOW_BASE_URL=https://your-langflow-host.com
   LANGFLOW_FLOW_ID=26233de8-e4d6-427a-a2be-938d9990a93d
   ```
   Use the public URL of your Langflow instance (no trailing slash). If the frontend runs on a different domain, ensure the Langflow deployment allows CORS or is called only from your backend/API route (as in this app, the Next.js API route calls Langflow server-side, so CORS is not an issue).

For full deployment options, see [Langflow deployment overview](https://docs.langflow.org/deployment-overview).
