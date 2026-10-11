<?php

declare(strict_types=1);

namespace App\Core;

final class SmtpMailer
{
    /** @var resource|null */
    private $socket = null;

    public function __construct(private readonly array $config)
    {
        if (($this->config['driver'] ?? 'smtp') !== 'smtp') {
            throw new \RuntimeException('Only SMTP mail driver is supported.');
        }

        if (
            ($this->config['host'] ?? '') === ''
            || (int) ($this->config['port'] ?? 0) <= 0
            || ($this->config['username'] ?? '') === ''
            || ($this->config['password'] ?? '') === ''
            || ($this->config['from_address'] ?? '') === ''
        ) {
            throw new \RuntimeException('SMTP configuration is incomplete.');
        }
    }

    public static function fromConfig(): self
    {
        /** @var array<string, mixed> $config */
        $config = require dirname(__DIR__, 2) . '/config/mail.php';

        return new self($config);
    }

    public function authenticateOnly(): void
    {
        try {
            $this->connectAndAuthenticate();
        } finally {
            $this->disconnect();
        }
    }

    public function send(
        string $to,
        string $subject,
        string $htmlBody,
        ?string $textBody = null,
    ): void {
        $to = trim($to);
        $subject = trim($subject);

        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException('Recipient email address is invalid.');
        }

        if ($subject === '' || preg_match('/[\r\n]/', $subject)) {
            throw new \InvalidArgumentException('Email subject is invalid.');
        }

        $fromAddress = (string) $this->config['from_address'];
        $fromName = $this->sanitizeHeader((string) ($this->config['from_name'] ?? 'MetodeQu'));

        if (!filter_var($fromAddress, FILTER_VALIDATE_EMAIL)) {
            throw new \RuntimeException('MAIL_FROM_ADDRESS is invalid.');
        }

        $boundary = 'metodequ_' . bin2hex(random_bytes(12));
        $messageIdHost = substr(strrchr($fromAddress, '@') ?: '@localhost', 1);
        $plain = $textBody ?? trim(
            html_entity_decode(
                strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $htmlBody)),
                ENT_QUOTES | ENT_HTML5,
                'UTF-8',
            ),
        );

        $headers = [
            'Date: ' . date(DATE_RFC2822),
            'From: ' . $this->encodeDisplayName($fromName) . ' <' . $fromAddress . '>',
            'To: <' . $to . '>',
            'Subject: ' . $this->encodeHeader($subject),
            'Message-ID: <' . bin2hex(random_bytes(16)) . '@' . $messageIdHost . '>',
            'MIME-Version: 1.0',
            'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
        ];

        $body = implode("\r\n", [
            '--' . $boundary,
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
            '',
            chunk_split(base64_encode($plain), 76, "\r\n"),
            '--' . $boundary,
            'Content-Type: text/html; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
            '',
            chunk_split(base64_encode($htmlBody), 76, "\r\n"),
            '--' . $boundary . '--',
            '',
        ]);

        try {
            $this->connectAndAuthenticate();
            $this->command('MAIL FROM:<' . $fromAddress . '>', [250]);
            $this->command('RCPT TO:<' . $to . '>', [250, 251]);
            $this->command('DATA', [354]);

            $payload = implode("\r\n", $headers) . "\r\n\r\n" . $body;
            $payload = preg_replace('/(?m)^\./', '..', $payload) ?? $payload;

            $this->write($payload . "\r\n.\r\n");
            $this->expect([250], 'SMTP rejected email data.');
        } finally {
            $this->disconnect();
        }
    }

    private function connectAndAuthenticate(): void
    {
        $host = (string) $this->config['host'];
        $port = (int) $this->config['port'];
        $timeout = max(1, (int) ($this->config['timeout'] ?? 10));

        $errno = 0;
        $error = '';

        $socket = @stream_socket_client(
            'tcp://' . $host . ':' . $port,
            $errno,
            $error,
            $timeout,
            STREAM_CLIENT_CONNECT,
        );

        if (!is_resource($socket)) {
            throw new \RuntimeException('Could not connect to SMTP server.');
        }

        $this->socket = $socket;
        stream_set_timeout($this->socket, $timeout);

        $this->expect([220], 'SMTP server did not send a greeting.');
        $this->command('EHLO metodequ.local', [250]);

        if (($this->config['encryption'] ?? 'tls') === 'tls') {
            $this->command('STARTTLS', [220]);

            $crypto = @stream_socket_enable_crypto(
                $this->socket,
                true,
                STREAM_CRYPTO_METHOD_TLS_CLIENT,
            );

            if ($crypto !== true) {
                throw new \RuntimeException('Could not establish SMTP TLS.');
            }

            $this->command('EHLO metodequ.local', [250]);
        }

        $this->command('AUTH LOGIN', [334]);
        $this->command(base64_encode((string) $this->config['username']), [334], 'SMTP username was rejected.');
        $this->command(base64_encode((string) $this->config['password']), [235], 'SMTP authentication failed.');
    }

    private function command(
        string $command,
        array $expectedCodes,
        string $failureMessage = 'SMTP command failed.',
    ): void {
        $this->write($command . "\r\n");
        $this->expect($expectedCodes, $failureMessage);
    }

    private function expect(array $expectedCodes, string $failureMessage): void
    {
        $response = $this->readResponse();
        $code = (int) substr($response, 0, 3);

        if (!in_array($code, $expectedCodes, true)) {
            throw new \RuntimeException($failureMessage . ' SMTP code: ' . $code);
        }
    }

    private function readResponse(): string
    {
        if (!is_resource($this->socket)) {
            throw new \RuntimeException('SMTP connection is not open.');
        }

        $response = '';

        while (($line = fgets($this->socket, 4096)) !== false) {
            $response .= $line;

            if (strlen($line) >= 4 && $line[3] === ' ') {
                break;
            }
        }

        $meta = stream_get_meta_data($this->socket);
        if (($meta['timed_out'] ?? false) === true) {
            throw new \RuntimeException('SMTP response timed out.');
        }

        if ($response === '') {
            throw new \RuntimeException('SMTP server closed the connection unexpectedly.');
        }

        return $response;
    }

    private function write(string $payload): void
    {
        if (!is_resource($this->socket)) {
            throw new \RuntimeException('SMTP connection is not open.');
        }

        $length = strlen($payload);
        $offset = 0;

        while ($offset < $length) {
            $written = fwrite($this->socket, substr($payload, $offset));

            if ($written === false || $written === 0) {
                throw new \RuntimeException('Could not write to SMTP connection.');
            }

            $offset += $written;
        }
    }

    private function disconnect(): void
    {
        if (!is_resource($this->socket)) {
            $this->socket = null;
            return;
        }

        @fwrite($this->socket, "QUIT\r\n");
        @fclose($this->socket);
        $this->socket = null;
    }

    private function sanitizeHeader(string $value): string
    {
        return trim((string) preg_replace('/[\r\n]+/', ' ', $value));
    }

    private function encodeHeader(string $value): string
    {
        return '=?UTF-8?B?' . base64_encode($value) . '?=';
    }

    private function encodeDisplayName(string $value): string
    {
        return $value === '' ? 'MetodeQu' : $this->encodeHeader($value);
    }
}
