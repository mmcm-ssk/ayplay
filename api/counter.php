<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');

$dir = is_writable(__DIR__) ? __DIR__ : sys_get_temp_dir();
$file = $dir . '/ayPlayer_counter.json';

$data = ['count' => 0, 'ips' => [], 'countries' => []];
if (file_exists($file)) $data = json_decode(file_get_contents($file), true) ?: $data;

$expire = time() - 86400;
foreach ($data['ips'] as $ip => $info) {
    if (is_numeric($info)) $info = ['ts' => $info, 'country' => 'XX'];
    if ($info['ts'] < $expire) {
        $cc = $info['country'] ?? 'XX';
        if (isset($data['countries'][$cc])) $data['countries'][$cc]--;
        if ($data['countries'][$cc] <= 0) unset($data['countries'][$cc]);
        unset($data['ips'][$ip]);
    }
}

$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
if (!isset($data['ips'][$ip])) {
    $country = 'XX';
    $resp = @file_get_contents('http://ip-api.com/json/' . $ip . '?fields=countryCode');
    if ($resp) {
        $geo = json_decode($resp, true);
        if ($geo && isset($geo['countryCode']) && $geo['countryCode'] !== '') {
            $country = $geo['countryCode'];
        }
    }
    $data['count']++;
    if (!isset($data['countries'][$country])) $data['countries'][$country] = 0;
    $data['countries'][$country]++;
    $data['ips'][$ip] = ['ts' => time(), 'country' => $country];
}

file_put_contents($file, json_encode($data));
echo json_encode(['count' => $data['count'], 'countries' => $data['countries']]);
