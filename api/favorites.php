<?php
/**
 * AY Player - Favorites & settings sync API.
 *
 * Requires an authenticated session (see api/auth.php).
 *
 *   GET api/favorites.php          -> {ok, favs: [file...], settings: {...}}
 *   PUT api/favorites.php (JSON)   -> {ok, favs: [file...], settings: {...}}
 *      body: { "favs": [file...], "settings": {...} }
 *
 * Storage:
 *   api/favorites.json  [nick => {favs: [..], settings: {..}}]
 *
 * Rules:
 *   - Only known settings keys are stored (see ALLOWED_SETTINGS).
 *   - favs: array of strings, max 5000 entries.
 *   - CSRF: same-origin check + session cookie.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');

$dir   = is_writable(__DIR__) ? __DIR__ : sys_get_temp_dir();
$dataFile = $dir . '/favorites.json';

define('MAX_FAVS', 5000);

const ALLOWED_SETTINGS = [
    'filterFormat' => 1, 'chFilter' => 1, 'alphaFilter' => 1, 'folderAlphaFilter' => 1,
    'shuffle' => 1, 'repeat' => 1, 'favoritesOnly' => 1,
    'firEnabled' => 1, 'xfEnabled' => 1, 'roomEnabled' => 1,
    'showFormat' => 1, 'showChannels' => 1, 'isMono' => 1, 'chipMode' => 1, 'isYM' => 1,
    'currentId' => 1, 'playing' => 1, 'clockSelect' => 1, 'intFreqSelect' => 1,
    'waveformMode' => 1, 'waveformScale' => 1, 'scopeFps' => 1, 'scopeEnabled' => 1,
    'currentFile' => 1,
];

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
function require_auth() {
    if (empty($_SESSION['nick'])) json_err('Not authenticated', 401);

    // The account might have been removed server-side; verify it still exists.
    $usersFile = (is_writable(__DIR__) ? __DIR__ : sys_get_temp_dir()) . '/users.json';
    $users = read_json($usersFile, []);
    if (!isset($users[$_SESSION['nick']])) {
        $_SESSION = [];
        json_err('Not authenticated', 401);
    }
}

session_set_cookie_params([
    'httponly' => true,
    'secure'   => !empty($_SERVER['HTTPS']),
    'samesite' => 'Lax',
]);
ini_set('session.use_strict_mode', '1');
session_start();

require_auth();
$nick = $_SESSION['nick'];

$all = read_json($dataFile, []);
if (!isset($all[$nick]) || !is_array($all[$nick])) $all[$nick] = ['favs' => [], 'settings' => []];

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    json_out([
        'ok' => true,
        'favs'    => is_array($all[$nick]['favs']) ? array_values($all[$nick]['favs']) : [],
        'settings'=> is_array($all[$nick]['settings']) ? $all[$nick]['settings'] : [],
    ]);
}

if ($method === 'PUT') {
    // CSRF: same-origin check
    $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : '';
    $hostOnly = preg_replace('/:\d+$/', '', $host); // strip :port
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
    if ($origin !== '') {
        $o = parse_url($origin, PHP_URL_HOST);
        if ($o !== null && $o !== $hostOnly) json_err('Cross-origin request blocked', 403);
    } else {
        $ref = isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '';
        if ($ref !== '') {
            $r = parse_url($ref, PHP_URL_HOST);
            if ($r !== null && $r !== $hostOnly) json_err('Cross-origin request blocked', 403);
        }
    }

    $raw = @file_get_contents('php://input');
    $body = json_decode($raw, true);
    if (!is_array($body)) json_err('Invalid JSON body', 400);

    $entry = $all[$nick];

    // favs
    if (array_key_exists('favs', $body)) {
        $favs = is_array($body['favs']) ? $body['favs'] : [];
        $clean = [];
        foreach ($favs as $f) {
            if (!is_string($f)) continue;
            $f = substr($f, 0, 512);
            $clean[$f] = true;
        }
        if (count($clean) > MAX_FAVS) json_err('Too many favorites (max ' . MAX_FAVS . ')', 400);
        $entry['favs'] = array_keys($clean);
    }

    // settings
    if (array_key_exists('settings', $body)) {
        $src = is_array($body['settings']) ? $body['settings'] : [];
        $s = [];
        foreach (ALLOWED_SETTINGS as $k => $_) {
            if (array_key_exists($k, $src)) $s[$k] = $src[$k];
        }
        $entry['settings'] = $s;
    }

    $all[$nick] = $entry;
    if (!write_json($dataFile, $all)) json_err('Storage write failed', 500);

    json_out([
        'ok' => true,
        'favs'    => array_values($entry['favs']),
        'settings'=> $entry['settings'],
    ]);
}

json_err('Method not allowed', 405);