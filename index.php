<?php
/**
 * AY Player - Server-Side Rendering of SEO / OpenGraph tags.
 *
 * Reads index.html as the template and injects dynamic <meta>, <link>, <title>
 * and JSON-LD tags depending on the ?track= query parameter, so that social
 * network crawlers (Telegram, VK, Discord, Twitter/X, WhatsApp) and search
 * engines receive fully-rendered metadata without executing client-side JS.
 *
 *   /                       -> default homepage metadata
 *   /?track=chiptunes%2FAuthor%2FTrackName.pt3  -> track metadata
 *   /?track=42              -> track metadata by playlist index
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
define('SITE_ORIGIN', 'https://ayplay.ru');
define('SITE_IMAGE', SITE_ORIGIN . '/ayplay_1260x340px.webp');
define('APP_TITLE', 'AY Player — ZX Spectrum AY Music Player');

$root = __DIR__;

// ---------------------------------------------------------------------------
// Playlist lookup
// ---------------------------------------------------------------------------

/**
 * Build a flat list of [{file, name, author, title, section, time}] from the
 * JSON cache produced by api/playlist.php. Fallback: parse api/playlist_DATA.js.
 */
function ay_load_playlist($root) {
    $candidates = [
        $root . '/api/ayPlayer_playlist_all.cache.json',
        $root . '/api/ayPlayer_playlist.cache.json',
    ];
    foreach ($candidates as $file) {
        if (is_file($file) && is_readable($file)) {
            $json = @file_get_contents($file);
            $data = json_decode($json, true);
            if (is_array($data)) {
                $entries = isset($data['entries']) && is_array($data['entries']) ? $data['entries'] : $data;
                return array_values($entries);
            }
        }
    }

    // Fallback: parse api/playlist_DATA.js  ->  var AYPLAYLIST_DATA = [ ... ];
    $jsFile = $root . '/api/playlist_DATA.js';
    if (is_file($jsFile) && is_readable($jsFile)) {
        $js = @file_get_contents($jsFile);
        if (preg_match('/=\s*(\[.*?\])\s*;?\s*$/s', $js, $m)) {
            $data = json_decode($m[1], true);
            if (is_array($data)) return array_values($data);
        }
    }
    return [];
}

/**
 * Normalise a file path: decode percent-encoding and unify slashes.
 */
function ay_norm_path($s) {
    $s = rawurldecode($s);
    return str_replace('\\', '/', $s);
}

/**
 * Resolve ?track= into a playlist entry. Returns array or null.
 * Accepts either a numeric index or a file path (with or without leading 'chiptunes/').
 */
function ay_resolve_track($track, $bandwidthList) {
    if ($track === '' || $track === null) return null;
    $track = ay_norm_path($track);

    // Numeric index
    if (preg_match('/^\d+$/', $track)) {
        $idx = (int)$track;
        if (isset($bandwidthList[$idx])) return [$idx, $bandwidthList[$idx]];
        return null;
    }

    // Trim a leading "chiptunes/" prefix so both forms match.
    $bare = preg_replace('~^chiptunes/~', '', $track);
    foreach ($bandwidthList as $i => $entry) {
        $f = ay_norm_path(isset($entry['file']) ? $entry['file'] : '');
        $fBare = preg_replace('~^chiptunes/~', '', $f);
        if ($f === $track || $fBare === $bare || $f === $bare || $fBare === $track) {
            return [$i, $entry];
        }
    }
    return null;
}

/**
 * Build a display title from an entry, falling back to the file name.
 */
function ay_track_title($entry) {
    if (!empty($entry['title'])) return $entry['title'];
    $name = isset($entry['name']) ? $entry['name'] : '';
    if ($name !== '') {
        return preg_replace('/\.(fym|pt3|vt2|psg|fym|stc|ay|snd|asc|pt1|stp|pt2|mtc|tfc)$/i', '', $name);
    }
    $file = isset($entry['file']) ? $entry['file'] : '';
    $base = basename($file);
    return preg_replace('/\.(fym|pt3|vt2|psg|fym|stc|ay|snd|asc|pt1|stp|pt2|mtc|tfc)$/i', '', $base);
}

/**
 * Escape a value for use inside an HTML attribute.
 */
function ay_h($s) {
    return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
}

function ay_json_ld($value) {
    return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

// ---------------------------------------------------------------------------
// Build the SEO block
// ---------------------------------------------------------------------------

$trackParam = isset($_GET['track']) ? (string)$_GET['track'] : '';
$playlist = ay_load_playlist($root);
$trackUrl = SITE_ORIGIN . '/';
$isTrack = false;
$meta = [
    'canonical' => SITE_ORIGIN . '/',
    'og_url'    => SITE_ORIGIN . '/',
    'og_type'   => 'website',
    'title'     => 'AY Player — ZX Spectrum AY Music Player (PT3, VT2, PSG, FYM, STC, MTC)',
    'html_title'=> 'AY Player — ZX Spectrum AY Music Player (PT3, VT2, PSG, FYM, STC, MTC)',
    'description' => 'Online player for ZX Spectrum AY music files (PT3, VT2, PSG, FYM, STC, MTC) with playlist, waveform visualization and favorites.',
    'image'     => SITE_IMAGE,
];
$jsonLd = [];

if ($trackParam !== '' && !empty($playlist)) {
    $resolved = ay_resolve_track($trackParam, $playlist);
    if ($resolved) {
        list($idx, $entry) = $resolved;
        $urlFile = isset($entry['file']) ? $entry['file'] : '';
        $trackUrl = SITE_ORIGIN . '/?track=' . rawurlencode($urlFile);
        $author   = trim(isset($entry['author']) ? (string)$entry['author'] : '');
        $title    = trim(ay_track_title($entry));
        $isTrack  = true;

        $meta['canonical']  = $trackUrl;
        $meta['og_url']     = $trackUrl;
        $meta['og_type']    = 'music.song';
        $titleStr = ($author !== '' && strpos($title, $author) !== 0) ? $author . ' — ' . $title : $title;
        $meta['title']      = $titleStr;
        $meta['html_title'] = $titleStr . ' | AY Player';
        $meta['description'] = 'Слушать ' . $title . ($author !== '' ? ' от ' . $author : '') .
            ' онлайн на AY Player. Chiptune музыка ZX Spectrum (AY/YM/OPN).';
        $meta['image']      = SITE_IMAGE;

        // Per-track JSON-LD (MusicRecording + WebApplication)
        $jsonLd[] = [
            '@context' => 'https://schema.org',
            '@type'    => 'MusicRecording',
            'name'     => $title,
            'byArtist' => ['@type' => 'MusicGroup', 'name' => $author !== '' ? $author : 'Unknown'],
            'url'      => $trackUrl,
            'inAlbum'  => ['@type' => 'Album', 'name' => 'AY Player chiptune collection'],
            'encoding' => ['@type' => 'MediaObject', 'contentUrl' => SITE_ORIGIN . '/' . $urlFile],
        ];
        $jsonLd[] = [
            '@context' => 'https://schema.org',
            '@type'    => 'WebPage',
            'name'     => $meta['title'],
            'url'      => $trackUrl,
            'isPartOf' => ['@type' => 'WebSite', 'name' => 'AY Player', 'url' => SITE_ORIGIN . '/'],
        ];
    }
}

// Fallback: no track or not found -> default homepage JSON-LD (already in index.html)
if (!$isTrack) {
    $jsonLd = []; // keep the static default schema from index.html
}

// ---------------------------------------------------------------------------
// Assemble the injected block
// ---------------------------------------------------------------------------
$seoBlock  = '<title>' . ay_h($meta['html_title']) . '</title>' . "\n";
$seoBlock .= '    <meta name="description" content="' . ay_h($meta['description']) . '">' . "\n";
$seoBlock .= '    <link rel="canonical" href="' . ay_h($meta['canonical']) . '">' . "\n";
$seoBlock .= '    <meta property="og:type" content="' . ay_h($meta['og_type']) . '">' . "\n";
$seoBlock .= '    <meta property="og:url" content="' . ay_h($meta['og_url']) . '">' . "\n";
$seoBlock .= '    <meta property="og:title" content="' . ay_h($meta['title']) . '">' . "\n";
$seoBlock .= '    <meta property="og:description" content="' . ay_h($meta['description']) . '">' . "\n";
$seoBlock .= '    <meta property="og:image" content="' . ay_h($meta['image']) . '">' . "\n";
$seoBlock .= '    <meta name="twitter:title" content="' . ay_h($meta['title']) . '">' . "\n";
$seoBlock .= '    <meta name="twitter:description" content="' . ay_h($meta['description']) . '">' . "\n";
$seoBlock .= '    <meta name="twitter:image" content="' . ay_h($meta['image']) . '">' . "\n";

if (!empty($jsonLd)) {
    $seoBlock .= '    <script type="application/ld+json">' . "\n" .
                 ay_json_ld($jsonLd[0]) . "\n" .
                 '    </script>' . "\n";
    if (isset($jsonLd[1])) {
        $seoBlock .= '    <script type="application/ld+json">' . "\n" .
                     ay_json_ld($jsonLd[1]) . "\n" .
                     '    </script>' . "\n";
    }
}

// ---------------------------------------------------------------------------
// Load template and inject
// ---------------------------------------------------------------------------
$html = @file_get_contents($root . '/index.html');
if ($html === false) {
    http_response_code(500);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!-- AY Player: index.html template missing -->';
    exit;
}

// Replace the SEO marker if present, otherwise inject after <head>.
if (strpos($html, '@@SEO@@') !== false) {
    $html = str_replace('<!-- @@SEO@@ -->', $seoBlock, $html);
} else {
    $html = preg_replace('/(<head[^>]*>)/i', '$1' . "\n    " . $seoBlock, $html, 1);
}

header('Content-Type: text/html; charset=utf-8');
// Short-lived cache so crawlers re-fetch, but regular visitors aren't slowed down.
header('Cache-Control: public, max-age=300');
echo $html;
