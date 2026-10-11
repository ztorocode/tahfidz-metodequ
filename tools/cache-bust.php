<?php

declare(strict_types=1);

// Cache-buster MetodeQu frontend: ganti semua ?v=xxx menjadi ?v=<token baru>
// plus nama CACHE di service-worker.js, agar browser/PWA ambil file terbaru.
//
//   php tools/cache-bust.php            # token acak 8 hex
//   php tools/cache-bust.php abc123    # token manual (mis. short commit hash)

$root = dirname(__DIR__);
$frontendDir = $root . '/src/frontend';

$token = $argv[1] ?? bin2hex(random_bytes(4));
if (!preg_match('/^[A-Za-z0-9][A-Za-z0-9_.-]{0,31}$/', $token)) {
    fwrite(STDERR, "Token tidak valid (maks 32 char alnum/._-).\n");
    exit(2);
}

$files = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($frontendDir, FilesystemIterator::SKIP_DOTS)
);

$changed = 0;
$hitFiles = 0;
foreach ($files as $file) {
    if (!$file->isFile()) {
        continue;
    }
    $ext = strtolower(pathinfo($file->getFilename(), PATHINFO_EXTENSION));
    if (!in_array($ext, ['html', 'js', 'css', 'json', 'webmanifest'], true)) {
        continue;
    }

    $path = $file->getPathname();
    $src = file_get_contents($path);
    if ($src === false) {
        continue;
    }

    $count = 0;
    $dst = preg_replace('/\?v=[A-Za-z0-9_.-]+/', '?v=' . $token, $src, -1, $count);
    $cacheCount = 0;
    $dst = preg_replace(
        "/(const CACHE=')metodequ(-prototype-)?[A-Za-z0-9_.-]+(')/",
        '${1}metodequ-' . $token . '${3}',
        $dst,
        -1,
        $cacheCount
    );

    if (($count + $cacheCount) > 0) {
        file_put_contents($path, $dst);
        $hitFiles++;
        $changed += $count + $cacheCount;
    }
}

echo "CACHE_BUST=OK token={$token} files={$hitFiles} replacements={$changed}\n";
