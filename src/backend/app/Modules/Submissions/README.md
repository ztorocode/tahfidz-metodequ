# Submissions module

Reserved module boundary for MetodeQu backend.

Scope: setoran, review workflow, status transitions, and reviewer authorization.

When implemented, keep controller/HTTP handler, service or use-case logic, repository/data access, validation, and module routes inside this folder. Cross-tenant and object-ownership authorization must be enforced server-side before database access.
