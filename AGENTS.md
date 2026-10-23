<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep account settings and the account hub under the managed authenticated layout; account reads and writes use the browser client with existing owner-scoped RLS so personal data remains private.
- Determine account navigation from protected role rows, falling back to stall ownership only for legacy accounts without a role; explicit consumer selection overrides legacy ownership.
- Account type and display name change through a caller-scoped database function limited to the two marketplace roles; database triggers enforce producer writes and seller-only sequential order status updates.
- Order messages and receipt storage are participant-scoped by order; uploaded product images use private storage and signed URLs with catalog/owner read policies because public buckets are blocked.
- Keep chat as an authenticated order-specific page with query invalidation and a cleaned-up realtime subscription so attachments and messages remain isolated between orders.
- Use the shared account navigation and sign-out hook across account pages so sign-out cancels queries and clears private cached data before leaving.
