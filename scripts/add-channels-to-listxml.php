<?php
// Scans all chiptunes directories, detects channels for .fym files,
// and adds channels="N" attribute to list.xml entries.

$chiptunesDir = realpath(__DIR__ . '/../chiptunes');

function detectChannelsForFile($dir, $fymName) {
    // Check for companion .pt3 with [ts] or _ts
    $base = preg_replace('/\.fym$/i', '', $fymName);
    $key = preg_replace('/[^a-z0-9]/', '', strtolower($base));
    $items = scandir($dir);
    $pt3Files = [];
    foreach ($items as $name) {
        if (substr($name, -4) === '.pt3') {
            $k = preg_replace('/[^a-z0-9]/', '', strtolower(substr($name, 0, -4)));
            $pt3Files[$k] = $name;
        }
    }
    if (isset($pt3Files[$key])) {
        $pt3Name = $pt3Files[$key];
        if (stripos($pt3Name, '[ts]') !== false || stripos($pt3Name, '_ts') !== false) return 6;
    }

    // Filename heuristic
    $lower = strtolower($fymName);
    if (preg_match('/\[ts\]|_ts[\.\-]|6ch|turbosound/i', $lower)) return 6;
    if (preg_match('/\[9ch\]|3ay|\b9ch\b/i', $lower)) return 9;

    return 3;
}

function processDir($dir) {
    $listXml = $dir . '/list.xml';
    if (!file_exists($listXml)) {
        echo "  no list.xml in $dir\n";
        return;
    }

    $xml = file_get_contents($listXml);
    $items = scandir($dir);

    // Find all <fym url="..."> entries and add channels if missing
    $count = 0;
    $updated = preg_replace_callback('/<fym\s+(?:url="([^"]*)")?\s*name="([^"]*)"(?:\s+time="([^"]*)")?(?:\s+size="[^"]*")?(?:\s+download="([^"]*)")?(?:\s+channels="[^"]*")?/i',
        function($m) use ($dir, &$count) {
            $url = $m[1] ?? '';
            if ($url === '') return $m[0]; // section/year headers — skip

            if (preg_match('/\bchannels="/', $m[0])) {
                // already has channels
                return $m[0];
            }

            $ch = detectChannelsForFile($dir, $url);
            $count++;
            // Insert channels="N" before the closing >
            // We need to ensure we handle the trailing / properly
            $attr = ' channels="' . $ch . '"';
            return $m[0] . $attr;
        }, $xml);

    if ($count > 0) {
        file_put_contents($listXml, $updated);
        echo "  $dir: $count entries updated\n";
    } else {
        echo "  $dir: no changes\n";
    }
}

function scanDirs($dir) {
    $items = scandir($dir);
    foreach ($items as $name) {
        if ($name === '.' || $name === '..') continue;
        $path = $dir . '/' . $name;
        if (is_dir($path)) {
            processDir($path);
            scanDirs($path);
        }
    }
}

echo "Scanning $chiptunesDir...\n";
scanDirs($chiptunesDir);
echo "Done.\n";
