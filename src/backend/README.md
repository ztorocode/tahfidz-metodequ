# MetodeQu Backend

Native PHP modular REST backend scaffold. The existing SPA/PWA stays in src/frontend; this backend lives independently in src/backend.

Structure:

    src/backend/
    ├── public/
    │   ├── index.php
    │   └── router.php
    ├── bootstrap.php
    ├── config/
    │   ├── app.php
    │   └── database.php
    ├── routes/
    │   └── api.php
    ├── app/
    │   ├── Core/
    │   │   ├── Database.php
    │   │   ├── Request.php
    │   │   ├── Response.php
    │   │   └── Router.php
    │   └── Modules/
    │       ├── Health/
    │       └── README.md
    └── storage/
        ├── logs/
        └── cache/

Module convention:

    Progress/
    ├── ProgressController.php
    ├── ProgressService.php
    ├── ProgressRepository.php
    ├── ProgressValidator.php
    └── routes.php

Environment configuration is loaded by `App\\Core\\Env` from `src/backend/.env` before application config is evaluated. For this project, values from `.env` intentionally override environment variables inherited from the container/Kubernetes Pod. If `.env` is absent, the backend can still fall back to process environment variables. No dotenv dependency is required.

Local run:

    cd src/backend
    APP_ENV=development APP_DEBUG=true php -S 127.0.0.1:8080 public/router.php

Health endpoint:

    GET http://127.0.0.1:8080/api/health

Database migrations live in `src/backend/database/migrations` and are applied by the root tool:

    php tools/migrate.php --status
    php tools/migrate.php --dry-run
    php tools/migrate.php

The migration runner loads `src/backend/.env`, verifies checksums for already-applied migrations, uses a MySQL advisory lock, and records successful migrations in `schema_migrations`.

Implementation order: Auth + user identity first, then Pondok membership/authorization, then Progress sync. For offline-first PWA sync, IndexedDB remains the client queue while PHP/MySQL becomes the server source of truth.

Do not trust context, pondok_id, musyrif type, or role values from the browser without server-side authorization checks.
