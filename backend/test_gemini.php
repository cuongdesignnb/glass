<?php
/**
 * Quick test: Gemini API key + model check
 * Run: php test_gemini.php
 */
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Setting;

// 1. Get API key from DB
$dbKey = Setting::getValue('gemini_api_key');
$envKey = env('GEMINI_API_KEY');

echo "=== Gemini API Key Check ===\n";
echo "DB key:  " . ($dbKey ? substr($dbKey, 0, 20) . '...' : '(empty)') . "\n";
echo "ENV key: " . ($envKey ? substr($envKey, 0, 20) . '...' : '(empty)') . "\n";

$apiKey = $dbKey ?: $envKey;
if (!$apiKey) {
    echo "ERROR: No API key found!\n";
    exit(1);
}

echo "Using:   " . substr($apiKey, 0, 20) . "...\n\n";

// 2. Test with simple text request (no image) to check if key works
echo "=== Test 1: Simple text request (gemini-2.0-flash) ===\n";
$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={$apiKey}";
$payload = [
    'contents' => [['parts' => [['text' => 'Say hello in 5 words']]]],
];

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_TIMEOUT => 30,
]);
$resp = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP {$httpCode}\n";
$data = json_decode($resp, true);
if ($httpCode === 200) {
    echo "OK - Key works! Response: " . ($data['candidates'][0]['content']['parts'][0]['text'] ?? 'no text') . "\n";
} else {
    echo "ERROR: " . ($data['error']['message'] ?? $resp) . "\n";
}

// 3. Test image model
echo "\n=== Test 2: Image model (gemini-2.5-flash-preview-04-17) ===\n";
$models = ['gemini-2.0-flash-exp-image-generation', 'gemini-2.0-flash', 'gemini-2.5-flash-preview-04-17'];
foreach ($models as $model) {
    $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";
    $payload = [
        'contents' => [['parts' => [['text' => 'Generate a simple image of a red circle on white background']]]],
        'generationConfig' => ['responseModalities' => ['TEXT', 'IMAGE']],
    ];
    
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT => 60,
    ]);
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "Model: {$model} => HTTP {$httpCode}";
    $data = json_decode($resp, true);
    if ($httpCode === 200) {
        $hasImage = false;
        foreach (($data['candidates'][0]['content']['parts'] ?? []) as $part) {
            if (isset($part['inlineData'])) { $hasImage = true; break; }
        }
        echo " - " . ($hasImage ? "HAS IMAGE" : "text only") . "\n";
    } else {
        $msg = $data['error']['message'] ?? 'unknown error';
        echo " - " . substr($msg, 0, 120) . "\n";
    }
}

echo "\nDone!\n";
