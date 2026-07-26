<?php

declare(strict_types=1);

use Illuminate\Contracts\Console\Kernel;

if ($argc !== 4) {
    fwrite(STDERR, "Usage: write-mysql-client-config.php <app-root> <client-file> <database-file>\n");
    exit(64);
}

[$script, $appRoot, $clientFile, $databaseFile] = $argv;
$backendRoot = rtrim($appRoot, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.'backend';

require $backendRoot.DIRECTORY_SEPARATOR.'vendor'.DIRECTORY_SEPARATOR.'autoload.php';
$app = require $backendRoot.DIRECTORY_SEPARATOR.'bootstrap'.DIRECTORY_SEPARATOR.'app.php';
$app->make(Kernel::class)->bootstrap();

$connectionName = (string) config('database.default');
$connection = (array) config("database.connections.{$connectionName}", []);

if (($connection['driver'] ?? null) !== 'mysql') {
    fwrite(STDERR, "Configured database driver is not mysql.\n");
    exit(65);
}

$host = (string) ($connection['host'] ?? '127.0.0.1');
$port = (string) ($connection['port'] ?? '3306');
$database = (string) ($connection['database'] ?? '');
$username = (string) ($connection['username'] ?? '');
$password = (string) ($connection['password'] ?? '');
$socket = (string) ($connection['unix_socket'] ?? '');

if ($database === '' || $username === '' || !preg_match('/^[A-Za-z0-9_$-]+$/', $database)) {
    fwrite(STDERR, "Database configuration is incomplete or has an unsupported database name.\n");
    exit(66);
}

$escape = static fn (string $value): string => str_replace(
    ["\\", "\n", "\r", '"'],
    ["\\\\", "\\n", "\\r", '\\"'],
    $value
);

$lines = [
    '[client]',
    'user="'.$escape($username).'"',
    'password="'.$escape($password).'"',
    'default-character-set=utf8mb4',
];

if ($socket !== '') {
    $lines[] = 'socket="'.$escape($socket).'"';
} else {
    $lines[] = 'host="'.$escape($host).'"';
    $lines[] = 'port="'.$escape($port).'"';
    $lines[] = 'protocol=tcp';
}

foreach ([$clientFile, $databaseFile] as $path) {
    if (!is_file($path)) {
        fwrite(STDERR, "Secure destination file was not pre-created.\n");
        exit(67);
    }
    chmod($path, 0600);
}

if (file_put_contents($clientFile, implode(PHP_EOL, $lines).PHP_EOL, LOCK_EX) === false) {
    fwrite(STDERR, "Unable to write MySQL client configuration.\n");
    exit(68);
}

if (file_put_contents($databaseFile, $database.PHP_EOL, LOCK_EX) === false) {
    fwrite(STDERR, "Unable to write database metadata.\n");
    exit(69);
}

chmod($clientFile, 0600);
chmod($databaseFile, 0600);
fwrite(STDOUT, "MYSQL_CLIENT_CONFIG=READY\n");
