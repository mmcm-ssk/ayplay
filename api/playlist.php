<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');

$chiptunesDir = realpath(dirname(__DIR__) . '/chiptunes');
$cacheMaxAge = 86400; // 24 hours: scanning ~12k files takes ~1 minute, so cache long
$action = $_GET['action'] ?? '';

// Try writable location for cache
$cacheDir = is_writable(__DIR__) ? __DIR__ : sys_get_temp_dir();
$cacheFile = $cacheDir . '/ayPlayer_playlist' . ($action === 'all' ? '_all' : '') . '.cache.json';

// Serve from cache if fresh enough (time-based, no filesystem scan)
clearstatcache(true, $cacheFile);
if (file_exists($cacheFile) && filesize($cacheFile) > 0) {
    if (time() - filemtime($cacheFile) < $cacheMaxAge) {
        readfile($cacheFile);
        return;
    }
}

function _isPt3Ts($name) {
    return stripos($name, '[ts]') !== false || stripos($name, '_ts') !== false;
}

function _detectPt3TsByContent($fullPath) {
    if (!file_exists($fullPath) || filesize($fullPath) < 22) return 0;
    // Read only the tail of the file: TS tags live in the last ~220 bytes.
    $len = filesize($fullPath);
    $start = max(0, $len - 260);
    $fp = @fopen($fullPath, 'rb');
    if (!$fp) return 0;
    fseek($fp, $start);
    $data = fread($fp, 260);
    fclose($fp);
    $dataLen = strlen($data);

    // Primary: check fixed footer at len - 22
    $tagOffset = $len - 22 - $start;
    $tag = substr($data, $tagOffset + 18, 4);
    if ($tag === '02TS') {
        $s1 = unpack('v', substr($data, $tagOffset + 10, 2))[1];
        $s2 = unpack('v', substr($data, $tagOffset + 16, 2))[1];
        if ($s1 + $s2 + 16 === $len && $s1 > 100 && $s2 > 6) return 2;
    } elseif ($tag === '03TS') {
        $s0 = unpack('v', substr($data, $tagOffset + 4, 2))[1];
        $s1 = unpack('v', substr($data, $tagOffset + 10, 2))[1];
        $s2 = unpack('v', substr($data, $tagOffset + 16, 2))[1];
        if ($s0 + $s1 + $s2 + 22 === $len && $s0 > 0 && $s1 > 0) return 3;
    }

    // Fallback: search for tag in last 220 bytes
    $loopStart = max(0, $dataLen - 220);
    for ($i = $loopStart; $i + 20 <= $dataLen; $i++) {
        $tag = substr($data, $i + 16, 4);
        if ($tag === '02TS') {
            $s1 = unpack('v', substr($data, $i + 10, 2))[1];
            $s2 = unpack('v', substr($data, $i + 16, 2))[1];
            if ($s1 + $s2 + 16 === $len && $s1 > 100 && $s2 > 6) return 2;
        } elseif ($tag === '03TS') {
            $s0 = unpack('v', substr($data, $i + 4, 2))[1];
            $s1 = unpack('v', substr($data, $i + 10, 2))[1];
            $s2 = unpack('v', substr($data, $i + 16, 2))[1];
            if ($s0 + $s1 + $s2 + 22 === $len && $s0 > 0 && $s1 > 0) return 3;
        }
    }
    return 0;
}

function _detectFymTsByContent($fullPath) {
    if (!file_exists($fullPath)) return false;
    $data = file_get_contents($fullPath);
    if (strlen($data) < 9) return false;
    // Stream-decompress only the start: offset+frameCount are in the first 8 bytes,
    // and TS detection only needs to know if data extends past a single-chip frame block.
    if (function_exists('inflate_init') && function_exists('inflate_add')) {
        $ctx = @inflate_init(ZLIB_ENCODING_DEFLATE);
        if ($ctx) {
            $raw = '';
            $pos = 0;
            $len = strlen($data);
            $single = null;
            while ($pos < $len) {
                $chunk = substr($data, $pos, 8192);
                $pos += strlen($chunk);
                $out = @inflate_add($ctx, $chunk, ZLIB_SYNC_FLUSH);
                if ($out === false) break;
                $raw .= $out;
                if ($single === null && strlen($raw) >= 8) {
                    $offset = unpack('V', substr($raw, 0, 4))[1];
                    $frameCount = unpack('V', substr($raw, 4, 4))[1];
                    if (!$frameCount) return false;
                    $single = $offset + $frameCount * 14;
                }
                if ($single !== null && strlen($raw) > $single) return true;
                if (inflate_get_status($ctx) === ZLIB_STREAM_END) break;
            }
            if ($single !== null) return false;
            return _detectFymTsByContentFull($data);
        }
    }
    return _detectFymTsByContentFull($data);
}

function _detectFymTsByContentFull($data) {
    // Try gzip decompression
    $raw = @gzuncompress($data);
    if ($raw === false) return false;
    if (strlen($raw) < 20) return false;
    // FYM/PSG dump format: offset(uint32), frameCount(uint32), loopFrame(uint32),
    // clockRate(uint32), frameRate(uint32), then null-terminated strings
    $offset = unpack('V', substr($raw, 0, 4))[1];
    $frameCount = unpack('V', substr($raw, 4, 4))[1];
    if (!$frameCount) return false;
    // If data extends beyond single-chip frame data, it's TS
    return ($offset + $frameCount * 14) < strlen($raw);
}

function _guessChannelsFromName($file) {
    $lower = strtolower($file);
    if (preg_match('/\[ts\]|[-_]ts[\.\-]|6ch|turbosound/i', $lower)) return 6;
    if (preg_match('/\[9ch\]|3ay|\b9ch\b/i', $lower)) return 9;
    return 3;
}

function _detectVt2Chips($fullPath) {
    if (!file_exists($fullPath) || !is_readable($fullPath)) return 1;
    $content = file_get_contents($fullPath);
    // VT2 is text format; count [MODULE] sections to determine chip count
    $count = preg_match_all('/^\[MODULE\]/mi', $content);
    return max(1, $count);
}

function _detectMtcChips($fullPath) {
    if (!file_exists($fullPath) || !is_readable($fullPath)) return 1;
    $data = file_get_contents($fullPath);
    $len = strlen($data);
    if ($len < 8 || substr($data, 0, 4) !== 'MTC1') return 1;
    $chips = 0;
    $pos = 8;
    while ($pos + 8 <= $len) {
        $tag = substr($data, $pos, 4);
        $clen = unpack('N', substr($data, $pos + 4, 4))[1];
        $end = $pos + 8 + $clen;
        if ($end > $len) break;
        if ($tag === 'TRCK') {
            $sub = $pos + 8;
            while ($sub + 8 <= $end) {
                $st = substr($data, $sub, 4);
                $slen = unpack('N', substr($data, $sub + 4, 4))[1];
                $dataEnd = $sub + 8 + $slen;
                if ($dataEnd > $end) break;
                if ($st === 'DATA' && $slen > 0) {
                    // TFMcom dump = one OPN chip (2 chip slots / 6 FM channels),
                    // everything else (PSG dump, ProTrekkr, Vortex...) = one AY (3)
                    $chips += (substr($data, $sub + 8, 4) === 'TFMc') ? 2 : 1;
                }
                $sub = $dataEnd;
                if ($sub < $end && $data[$sub] === "\x00") $sub++;
            }
        }
        $pos = $end;
        if ($pos < $len && $data[$pos] === "\x00") $pos++;
    }
    return max(1, $chips);
}

function _guessChannelsWithContent($relative, $fullPath) {
    $ext = strtolower(substr($relative, -4));
    if ($ext === '.pt3') {
        $chips = _detectPt3TsByContent($fullPath);
        if ($chips >= 2) return $chips * 3;
    } elseif ($ext === '.fym') {
        if (_detectFymTsByContent($fullPath)) return 6;
    } elseif ($ext === '.vt2') {
        $chips = _detectVt2Chips($fullPath);
        return $chips * 3;
    } elseif ($ext === '.mtc') {
        $chips = _detectMtcChips($fullPath);
        return $chips * 3;
    } elseif ($ext === '.tfc') {
        return 6;
    } elseif ($ext === '.stp') {
        return 3;
    } elseif ($ext === '.pt1') {
        return 3;
    }
    return 3;
}

function _ay_scanDir($dir, $baseDir, $chiptunesDir = null, $parentAuthor = null) {
    $entries = [];
    if (!is_dir($dir)) return $entries;
    $items = scandir($dir);
    $fymFiles = [];
    $pt3Map = [];
    $sectionOverride = $parentAuthor ? basename($dir) : null;
    $isRoot = $chiptunesDir !== null && realpath($dir) === realpath($chiptunesDir);

    foreach ($items as $name) {
        if (substr($name, -4) === '.pt3') {
            $key = preg_replace('/[^a-z0-9]/', '', strtolower(substr($name, 0, -4)));
            $pt3Map[$key] = $name;
        } elseif (substr($name, -4) === '.fym') {
            $fymFiles[$name] = true;
        }
    }

    $author = $parentAuthor ?? basename($dir);
    $handledPt3 = [];
    foreach ($items as $name) {
        if ($name === '.' || $name === '..') continue;
        $fullPath = $dir . '/' . $name;
        if (is_dir($fullPath)) {
            $nextParent = $isRoot ? null : $author;
            $entries = array_merge($entries, _ay_scanDir($fullPath, $baseDir, $chiptunesDir, $nextParent));
        } elseif (substr($name, -4) === '.fym') {
            $relative = substr($fullPath, strlen($baseDir) + 1);
            $fymKey = preg_replace('/[^a-z0-9]/', '', strtolower(substr($name, 0, -4)));
            $entry = [
                'name' => $name,
                'file' => str_replace('\\', '/', $relative),
                'pt3' => isset($pt3Map[$fymKey]),
                'pt3File' => $pt3Map[$fymKey] ?? null
            ];
            if (!isset($entry['author'])) $entry['author'] = $author;
            if (!isset($entry['section'])) $entry['section'] = $sectionOverride ?? null;
            if (!isset($entry['channels']) || $entry['channels'] === null) {
                $entry['channels'] = _guessChannelsWithContent($entry['file'], $fullPath);
            }
            $entries[] = $entry;

            if ($entry['pt3']) {
                $pt3Name = $entry['pt3File'];
                $pt3Relative = preg_replace('/[^\/]+$/', $pt3Name, $entry['file']);
                $pt3Full = $dir . '/' . $pt3Name;
                $pt3Entry = [
                    'name' => $pt3Name,
                    'file' => $pt3Relative,
                    'pt3' => false, 'pt3File' => null,
                    'turbo' => _isPt3Ts($pt3Name),
                    'title' => $entry['title'] ?? null,
                    'time' => $entry['time'] ?? '',
                    'year' => $entry['year'] ?? '',
                    'download' => $entry['download'] ?? '',
                    'section' => $entry['section'] ?? null,
                    'channels' => _guessChannelsWithContent($pt3Relative, $pt3Full),
                    'author' => $author
                ];
                $entries[] = $pt3Entry;
                $handledPt3[] = $pt3Name;
            }
        } elseif (substr($name, -4) === '.vt2') {
            $relative = substr($fullPath, strlen($baseDir) + 1);
            $entry = [
                'name' => $name,
                'file' => str_replace('\\', '/', $relative),
                'pt3' => false
            ];
            if (!isset($entry['author'])) $entry['author'] = $author;
            if (!isset($entry['section'])) $entry['section'] = $sectionOverride ?? null;
            if (!isset($entry['channels']) || $entry['channels'] === null) {
                $entry['channels'] = _guessChannelsWithContent($entry['file'], $fullPath);
            }
            $entries[] = $entry;
        } elseif (substr($name, -4) === '.pt3' && !in_array($name, $handledPt3)) {
            $relative = substr($fullPath, strlen($baseDir) + 1);
            $entry = [
                'name' => $name,
                'file' => str_replace('\\', '/', $relative),
                'pt3' => false
            ];
            if (!isset($entry['author'])) $entry['author'] = $author;
            if (!isset($entry['section'])) $entry['section'] = $sectionOverride ?? null;
            if (!isset($entry['channels']) || $entry['channels'] === null) {
                $entry['channels'] = _guessChannelsWithContent($entry['file'], $fullPath);
            }
            $entries[] = $entry;
        } elseif (substr($name, -4) === '.psg') {
            $relative = substr($fullPath, strlen($baseDir) + 1);
            $entry = [
                'name' => $name,
                'file' => str_replace('\\', '/', $relative),
                'pt3' => false
            ];
            if (!isset($entry['author'])) $entry['author'] = $author;
            if (!isset($entry['section'])) $entry['section'] = $sectionOverride ?? null;
            if (!isset($entry['channels']) || $entry['channels'] === null) {
                $entry['channels'] = _guessChannelsWithContent($entry['file'], $fullPath);
            }
            $entries[] = $entry;
        } elseif (substr($name, -4) === '.stc') {
            $relative = substr($fullPath, strlen($baseDir) + 1);
            $entry = [
                'name' => $name,
                'file' => str_replace('\\', '/', $relative),
                'pt3' => false
            ];
            if (!isset($entry['author'])) $entry['author'] = $author;
            if (!isset($entry['section'])) $entry['section'] = $sectionOverride ?? null;
            if (!isset($entry['channels']) || $entry['channels'] === null) {
                $entry['channels'] = _guessChannelsWithContent($entry['file'], $fullPath);
            }
            $entries[] = $entry;
        } elseif (substr($name, -4) === '.pt2') {
            $relative = substr($fullPath, strlen($baseDir) + 1);
            $entry = [
                'name' => $name,
                'file' => str_replace('\\', '/', $relative),
                'pt3' => false
            ];
            if (!isset($entry['author'])) $entry['author'] = $author;
            if (!isset($entry['section'])) $entry['section'] = $sectionOverride ?? null;
            if (!isset($entry['channels']) || $entry['channels'] === null) {
                $entry['channels'] = 3;
            }
            $entries[] = $entry;
        } elseif (substr($name, -3) === '.ay') {
            $relative = substr($fullPath, strlen($baseDir) + 1);
            $entry = [
                'name' => $name,
                'file' => str_replace('\\', '/', $relative),
                'pt3' => false
            ];
            if (!isset($entry['author'])) $entry['author'] = $author;
            if (!isset($entry['section'])) $entry['section'] = $sectionOverride ?? null;
            if (!isset($entry['channels']) || $entry['channels'] === null) {
                $entry['channels'] = 3;
            }
            $entries[] = $entry;
        } elseif (substr($name, -4) === '.snd') {
            $relative = substr($fullPath, strlen($baseDir) + 1);
            $entry = [
                'name' => $name,
                'file' => str_replace('\\', '/', $relative),
                'pt3' => false
            ];
            if (!isset($entry['author'])) $entry['author'] = $author;
            if (!isset($entry['section'])) $entry['section'] = $sectionOverride ?? null;
            if (!isset($entry['channels']) || $entry['channels'] === null) {
                $entry['channels'] = 3;
            }
            $entries[] = $entry;
        } elseif (substr($name, -4) === '.asc') {
            $relative = substr($fullPath, strlen($baseDir) + 1);
            $entry = [
                'name' => $name,
                'file' => str_replace('\\', '/', $relative),
                'pt3' => false
            ];
            if (!isset($entry['author'])) $entry['author'] = $author;
            if (!isset($entry['section'])) $entry['section'] = $sectionOverride ?? null;
            if (!isset($entry['channels']) || $entry['channels'] === null) {
                $entry['channels'] = 3;
            }
            $entries[] = $entry;
        } elseif (substr($name, -4) === '.mtc') {
            $relative = substr($fullPath, strlen($baseDir) + 1);
            $entry = [
                'name' => $name,
                'file' => str_replace('\\', '/', $relative),
                'pt3' => false
            ];
            if (!isset($entry['author'])) $entry['author'] = $author;
            if (!isset($entry['section'])) $entry['section'] = $sectionOverride ?? null;
            if (!isset($entry['channels']) || $entry['channels'] === null) {
                $entry['channels'] = _guessChannelsWithContent($entry['file'], $fullPath);
            }
            $entries[] = $entry;
        } elseif (substr($name, -4) === '.tfc') {
            $relative = substr($fullPath, strlen($baseDir) + 1);
            $entry = [
                'name' => $name,
                'file' => str_replace('\\', '/', $relative),
                'pt3' => false
            ];
            if (!isset($entry['author'])) $entry['author'] = $author;
            if (!isset($entry['section'])) $entry['section'] = $sectionOverride ?? null;
            if (!isset($entry['channels']) || $entry['channels'] === null) {
                $entry['channels'] = 6;
            }
            $entries[] = $entry;
        } elseif (substr($name, -4) === '.stp') {
            $relative = substr($fullPath, strlen($baseDir) + 1);
            $entry = [
                'name' => $name,
                'file' => str_replace('\\', '/', $relative),
                'pt3' => false
            ];
            if (!isset($entry['author'])) $entry['author'] = $author;
            if (!isset($entry['section'])) $entry['section'] = $sectionOverride ?? null;
            if (!isset($entry['channels']) || $entry['channels'] === null) {
                $entry['channels'] = 3;
            }
            $entries[] = $entry;
        } elseif (substr($name, -4) === '.pt1') {
            $relative = substr($fullPath, strlen($baseDir) + 1);
            $entry = [
                'name' => $name,
                'file' => str_replace('\\', '/', $relative),
                'pt3' => false
            ];
            if (!isset($entry['author'])) $entry['author'] = $author;
            if (!isset($entry['section'])) $entry['section'] = $sectionOverride ?? null;
            if (!isset($entry['channels']) || $entry['channels'] === null) {
                $entry['channels'] = 3;
            }
            $entries[] = $entry;
        }
    }
    return $entries;
}

$playlist = _ay_scanDir($chiptunesDir, realpath(__DIR__ . '/..'), $chiptunesDir);

if ($action === 'all') {
    $result = ['entries' => $playlist];
} else {
    $result = $playlist;
}

$json = json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
file_put_contents($cacheFile, $json);
echo $json;
