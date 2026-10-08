# Backend modules

Business capabilities live inside this directory. Each active module should own its controller/HTTP handler, service or use-case logic, repository/data access, validation, and module routes.

Planned MetodeQu modules:
- Auth: login, session/token identity, logout, refresh.
- Users: platform user identity and profile.
- Pondoks: pondok tenant, membership, admin pondok boundaries.
- Musyrifs: platform/pondok musyrif assignments.
- Progress: personal and pondok progress plus sync/version handling.
- Submissions: setoran and review workflow.

Keep direct SQL out of controllers. Shared HTTP/database primitives belong in app/Core. Server-side authorization must verify user ownership and tenant membership; never trust role, context, or pondok_id sent by the browser.
