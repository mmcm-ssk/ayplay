<?php
/**
 * AY Player - Account authentication API.
 *
 * Actions (all via POST unless noted):
 *   ?action=register  {nick, password}                    -> create account
 *   ?action=login     {nick, password, remember?}         -> open session
 *   ?action=logout                                          -> destroy session
 *   ?action=me        (GET)                               -> profile by session/remember cookie
 *   ?action=session   {nick, password}                    -> validate credentials without session (for UI re-auth)
 *
 * Storage:
 *   api/users.json      [nick => {hash, created, remember: {token: ts, ...}}]
 *   api/auth_fail.json  [ip => {fails, first}]
 *
 * Security:
 *   - password_hash()/password_verify() (PASSWORD_BCRYPT)
 *   - PHP session cookie, SameSite=Lax
 *   - "remember me" via random per-user token in cookie ayp_remember
 *   - brute-force limit: 5 failed logins / 15 min per IP
 *   - CSRF: require same-origin (validated by SameSite cookie + Origin/referer check for state-changes)
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');

$dir   = is_writable(__DIR__) ? __DIR__ : sys_get_temp_dir();
$usersFile = $dir . '/users.json';
$failFile  = $dir . '/auth_fail.json';

define('NICK_PATTERN', '/^[a-zA-Z0-9_-]{3,32}$/');
define('PASS_MIN', 6);
define('RATE_MAX', 5);
define('RATE_WINDOW', 900); // 15 min
define('REMEMBER_NAME', 'ayp_remember');
define('REMEMBER_TTL', 60 * 60 * 24 * 30); // 30 days

function json_out($data) { echo json_encode($data); exit; }
function json_err($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg]);
    exit;
}
function read_json($file, $default) {
    if (!is_file($file)) return $default;
    $d = @json_decode(@file_get_contents($file), true);
    return is_array($d) ? $d : $default;
}
function write_json($file, $data) {
    $tmp = $file . '.tmp';
    if (file_put_contents($tmp, json_encode($data), LOCK_EX) === false) return false;
    return rename($tmp, $file);
}
function client_id() {
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) return $_SERVER['HTTP_CLIENT_IP'];
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $c = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        return trim($c[0]);
    }
    return isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
}
function now() { return time(); }

/** Validate Origin/referer for state-changing requests (CSRF defense). */
function check_same_origin() {
    $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : '';
    $hostOnly = preg_replace('/:\d+$/', '', $host); // strip :port
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
    if ($origin !== '') {
        $o = parse_url($origin, PHP_URL_HOST);
        if ($o !== null && $o !== $hostOnly) json_err('Cross-origin request blocked', 403);
        return;
    }
    $ref = isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '';
    if ($ref !== '') {
        $r = parse_url($ref, PHP_URL_HOST);
        if ($r !== null && $r !== $hostOnly) json_err('Cross-origin request blocked', 403);
    }
}

function require_post() {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        json_err('POST required', 405);
    }
}

session_set_cookie_params([
    'httponly' => true,
    'secure'   => !empty($_SERVER['HTTPS']),
    'samesite' => 'Lax',
]);

ini_set('session.use_strict_mode', '1');
session_start();

$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {

case 'register':
    require_post();
    check_same_origin();
    $nick = isset($_POST['nick']) ? trim($_POST['nick']) : '';
    $pass = isset($_POST['password']) ? (string)$_POST['password'] : '';

    if (!preg_match(NICK_PATTERN, $nick)) json_err('Nick: 3-32 chars, latin letters, digits, _ or -');
    if (strlen($pass) < PASS_MIN) json_err('Password must be at least ' . PASS_MIN . ' characters');

    $users = read_json($usersFile, []);
    if (isset($users[$nick])) json_err('Nick already taken', 409);

    $users[$nick] = [
        'hash'    => password_hash($pass, PASSWORD_BCRYPT),
        'created' => now(),
        'remember'=> [],
    ];
    if (!write_json($usersFile, $users)) json_err('Storage write failed', 500);

    session_regenerate_id(true);
    $_SESSION['nick'] = $nick;
    json_out(['ok' => true, 'action' => 'register', 'nick' => $nick]);

case 'login':
    require_post();
    check_same_origin();

    // Brute-force limit by client id
    $fails = read_json($failFile, []);
    $id = client_id();
    if (isset($fails[$id])) {
        $f = $fails[$id];
        if (($f['first'] + RATE_WINDOW) > now() && $f['fails'] >= RATE_MAX) {
            json_err('Слишком много попыток. Попробуйте позже.', 429);
        }
    }

    $nick = isset($_POST['nick']) ? trim($_POST['nick']) : '';
    $pass = isset($_POST['password']) ? (string)$_POST['password'] : '';
    $remember = !empty($_POST['remember']);

    $users = read_json($usersFile, []);
    $ok = isset($users[$nick]) && password_verify($pass, $users[$nick]['hash']);

    if (!$ok) {
        // Record failure
        if (!isset($fails[$id])) $fails[$id] = ['fails' => 0, 'first' => now()];
        else if (($fails[$id]['first'] + RATE_WINDOW) < now()) $fails[$id] = ['fails' => 0, 'first' => now()];
        $fails[$id]['fails']++;
        write_json($failFile, $fails);
        json_err('Invalid nick or password', 401);
    }

    // Success: reset failures
    if (isset($fails[$id])) {
        unset($fails[$id]);
        write_json($failFile, $fails);
    }

    session_regenerate_id(true);
    $_SESSION['nick'] = $nick;

    if ($remember) {
        $token = bin2hex(random_bytes(32));
        if (!isset($users[$nick]['remember'])) $users[$nick]['remember'] = [];
        $users[$nick]['remember'][$token] = now();
        write_json($usersFile, $users);
        setcookie(REMEMBER_NAME, $token, [
            'expires'  => now() + REMEMBER_TTL,
            'path'     => '/',
            'httponly' => true,
            'secure'   => !empty($_SERVER['HTTPS']),
            'samesite' => 'Lax',
        ]);
    }

    json_out(['ok' => true, 'action' => 'login', 'nick' => $nick]);

case 'logout':
    if (isset($_COOKIE[REMEMBER_NAME])) {
        $token = $_COOKIE[REMEMBER_NAME];
        $users = read_json($usersFile, []);
        $nick = isset($_SESSION['nick']) ? $_SESSION['nick'] : null;
        if ($nick && isset($users[$nick]['remember'][$token])) {
            unset($users[$nick]['remember'][$token]);
            if (empty($users[$nick]['remember'])) unset($users[$nick]['remember']);
            write_json($usersFile, $users);
        }
        setcookie(REMEMBER_NAME, '', ['expires' => now() - 3600, 'path' => '/']);
    }
    $_SESSION = [];
    if (session_status() === PHP_SESSION_ACTIVE) session_destroy();
    setcookie(session_name(), '', ['expires' => now() - 3600, 'path' => '/']);
    json_out(['ok' => true, 'action' => 'logout']);

case 'me':
    // Restore session from remember token if no active PHP session.
    if (empty($_SESSION['nick']) && !empty($_COOKIE[REMEMBER_NAME])) {
        $token = $_COOKIE[REMEMBER_NAME];
        $users = read_json($usersFile, []);
        foreach ($users as $nick => $u) {
            if (isset($u['remember'][$token])) {
                if (($u['remember'][$token] + REMEMBER_TTL) >= now()) {
                    session_regenerate_id(true);
                    $_SESSION['nick'] = $nick;
                } else {
                    unset($u['remember'][$token]);
                    write_json($usersFile, $users);
                }
                break;
            }
        }
    }

    if (empty($_SESSION['nick'])) json_out(['ok' => false, 'authed' => false]);

    $nick = $_SESSION['nick'];
    $users = read_json($usersFile, []);
    if (!isset($users[$nick])) {
        // Account deleted/server reset -> treat as not authed
        $_SESSION = [];
        json_out(['ok' => false, 'authed' => false]);
    }
    json_out(['ok' => true, 'authed' => true, 'nick' => $nick]);

default:
    json_err('Unknown action', 404);
}