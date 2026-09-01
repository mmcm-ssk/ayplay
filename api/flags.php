<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');

$dir = is_writable(__DIR__) ? __DIR__ : sys_get_temp_dir();
$file = $dir . '/ayPlayer_counter.json';

$data = ['count' => 0, 'countries' => []];
if (file_exists($file)) $data = json_decode(file_get_contents($file), true) ?: $data;

echo json_encode(['count' => $data['count'] ?? 0, 'countries' => $data['countries'] ?? []]);
