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

Environment values are read from the process environment. .env.example is a reference only; this scaffold deliberately does not add a dotenv dependency.

Local run:

    cd src/backend
    APP_ENV=development APP_DEBUG=true php -S 127.0.0.1:8080 public/router.php

Health endpoint:

    GET http://127.0.0.1:8080/api/health

Implementation order: Auth + user identity first, then Pondok membership/authorization, then Progress sync. For offline-first PWA sync, IndexedDB remains the client queue while PHP/MySQL becomes the server source of truth.

Do not trust context, pondok_id, musyrif type, or role values from the browser without server-side authorization checks.
