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
- Determine producer navigation from protected role rows or existing stall ownership to preserve access for legacy sellers; navigation is not an authorization boundary.
- Use the shared account navigation and sign-out hook across account pages so sign-out cancels queries and clears private cached data before leaving.
