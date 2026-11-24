<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- Keep all screen data access in API hooks; the single API entry selects the mock or inactive HTTP adapter so screens remain replaceable.
- Render mock-dependent content after hydration because localStorage sessions exist only in the browser; use Query suspense boundaries for initial reads.
- Use TanStack file routes with shared role layouts and URL search parameters for filters; the template's router is fixed.
- Load the spreadsheet library only for import/export so phone users do not download it on initial navigation.
- Target Vercel with Nitro's `vercel` preset only when `VERCEL` is set, preserving Lovable's Cloudflare build elsewhere; Neon credentials must remain server-only.
- Keep server API code in `server/`, never a root `api/` folder: Vercel would build it as a second, conflicting function beside the Nitro output.
