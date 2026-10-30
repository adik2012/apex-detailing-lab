<?php
declare(strict_types=1);

ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

$PRICING = [
    'classes' => [
        'class1' => ['label' => 'Седан / Купе / Хэтчбек', 'examples' => 'BMW 3/5, Mercedes C/E, Audi A4/A6, Porsche 911', 'factor' => 1.0],
        'class2' => ['label' => 'Кроссовер / Бизнес-седан', 'examples' => 'BMW X3/X5, Porsche Cayenne, Mercedes GLE/S-Class, Geely Monjaro', 'factor' => 1.2],
        'class3' => ['label' => 'Внедорожник / Минивэн / Люкс', 'examples' => 'BMW X7, Mercedes G-Class / V-Class, Range Rover, LiXiang L9, Cadillac Escalade', 'factor' => 1.5],
    ],
    'services' => [
        'srv-1' => [
            'name' => 'Восстановительная детейлинг-полировка ЛКП',
            'price' => ['class1' => 24000, 'class2' => 29000, 'class3' => 36000],
            'hours' => ['class1' => 10, 'class2' => 12, 'class3' => 15],
            'warranty' => 'Протокол замеров ЛКП по 12 точкам каждой панели',
        ],
        'srv-2' => [
            'name' => 'Нанокерамика 9H в 2 слоя + гидрофобный топ-слой',
            'price' => ['class1' => 38000, 'class2' => 45000, 'class3' => 55000],
            'hours' => ['class1' => 12, 'class2' => 14, 'class3' => 18],
            'warranty' => '24 месяца по договору + осмотр каждые 12 мес',
        ],
        'srv-3' => [
            'name' => 'Бронирование «Зоны риска» PPF 200 мкм',
            'price' => ['class1' => 95000, 'class2' => 115000, 'class3' => 140000],
            'hours' => ['class1' => 24, 'class2' => 28, 'class3' => 32],
            'warranty' => '5 лет от пожелтения, отслоений и трещин',
        ],
        'srv-4' => [
            'name' => 'Детейлинг-химчистка салона с консервацией кожи',
            'price' => ['class1' => 18000, 'class2' => 22000, 'class3' => 28000],
            'hours' => ['class1' => 8, 'class2' => 10, 'class3' => 14],
            'warranty' => '14 дней на повторное выведение пятен — бесплатно',
        ],
        'srv-5' => [
            'name' => 'Комплекс «Антидождь» на все стекла + полировка фар',
            'price' => ['class1' => 7500, 'class2' => 9000, 'class3' => 11000],
            'hours' => ['class1' => 3, 'class2' => 4, 'class3' => 5],
            'warranty' => '12 месяцев на гидрофобный эффект стекол',
        ],
        'srv-6' => [
            'name' => 'Детейлинг моторного отсека диэлектрическим гелем',
            'price' => ['class1' => 6000, 'class2' => 7500, 'class3' => 9000],
            'hours' => ['class1' => 3, 'class2' => 3, 'class3' => 4],
            'warranty' => 'Чек-лист изоляции электрики из 14 пунктов',
        ],
    ],
    'packages' => [
        'pkg-1' => [
            'name' => 'Керамическое зеркало',
            'services' => ['srv-1', 'srv-2', 'srv-5'],
            'price' => ['class1' => 57900, 'class2' => 69500, 'class3' => 84500],
        ],
        'pkg-2' => [
            'name' => 'Броня трассы PPF',
            'services' => ['srv-3', 'srv-5'],
            'price' => ['class1' => 86500, 'class2' => 104500, 'class3' => 127000],
        ],
        'pkg-3' => [
            'name' => 'Полная перезагрузка',
            'services' => ['srv-1', 'srv-2', 'srv-4', 'srv-6'],
            'price' => ['class1' => 70500, 'class2' => 84500, 'class3' => 104500],
        ],
    ],
    'rules' => [
        'comboDiscount' => 0.15,
        'comboMinServices' => 2,
        'promo' => ['code' => 'APEX10', 'discount' => 0.10],
        'giftThreshold' => 35000,
        'gift' => ['name' => 'Озонация салона + антибактериальная обработка кондиционера', 'listPrice' => 4500],
        'workdayHours' => 10,
    ],
];

function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function failRequest(int $status, string $code, string $message): void
{
    respond($status, ['ok' => false, 'error' => ['code' => $code, 'message' => $message]]);
}

function cleanString(mixed $value): string
{
    if (!is_string($value)) {
        return '';
    }

    $value = trim(strip_tags($value));
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function characterLength(string $value): int
{
    $matches = [];
    return preg_match_all('/./us', $value, $matches) === false ? PHP_INT_MAX : count($matches[0]);
}

function csvSafe(?string $value): string
{
    $value = str_replace(["\r", "\n", "\t"], ' ', (string) $value);
    if ($value !== '' && in_array($value[0], ['=', '+', '-', '@'], true)) {
        $value = "'" . $value;
    }
    return $value;
}

function recalc(string $class, array $serviceIds, ?string $packageId, ?string $promo): array
{
    $pricing = $GLOBALS['PRICING'];
    $rules = $pricing['rules'];
    $extras = $serviceIds;
    $base = 0;

    if ($packageId !== null) {
        $package = $pricing['packages'][$packageId];
        $base = $package['price'][$class];
        $extras = array_values(array_diff($serviceIds, $package['services']));
        foreach ($extras as $serviceId) {
            $base += $pricing['services'][$serviceId]['price'][$class];
        }
    } else {
        foreach ($serviceIds as $serviceId) {
            $base += $pricing['services'][$serviceId]['price'][$class];
        }
    }

    $comboBase = 0;
    $comboCount = count($packageId === null ? $serviceIds : $extras);
    if ($packageId === null) {
        $comboBase = $base;
    } else {
        foreach ($extras as $serviceId) {
            $comboBase += $pricing['services'][$serviceId]['price'][$class];
        }
    }
    $combo = $comboCount >= $rules['comboMinServices']
        ? (int) round($comboBase * $rules['comboDiscount'])
        : 0;
    $amount = $base - $combo;
    $promoDiscount = $promo === $rules['promo']['code']
        ? (int) round($amount * $rules['promo']['discount'])
        : 0;
    $final = $amount - $promoDiscount;

    $durationHours = 0;
    $serviceSummary = [];
    foreach ($serviceIds as $serviceId) {
        $service = $pricing['services'][$serviceId];
        $serviceSummary[] = [
            'id' => $serviceId,
            'name' => $service['name'],
            'price' => $service['price'][$class],
        ];
        $durationHours += $service['hours'][$class];
    }

    return [
        'services' => $serviceSummary,
        'baseTotal' => $base,
        'comboDiscount' => $combo,
        'promoDiscount' => $promoDiscount,
        'gift' => [
            'name' => $rules['gift']['name'],
            'listPrice' => $rules['gift']['listPrice'],
            'price' => 0,
            'active' => $final >= $rules['giftThreshold'],
        ],
        'finalTotal' => $final,
        'durationHours' => $durationHours,
        'pickupEstimate' => $durationHours > $rules['workdayHours']
            ? (string) (int) ceil($durationHours / $rules['workdayHours']) . ' рабочих дней, выдача после 18:00'
            : 'В день заезда после завершения работ',
    ];
}

function checkRateLimit(string $directory): void
{
    $filePath = $directory . DIRECTORY_SEPARATOR . '.ratelimit';
    $file = @fopen($filePath, 'c+');
    if ($file === false) {
        throw new RuntimeException('Не удалось открыть хранилище ограничения частоты запросов.');
    }
    if (!flock($file, LOCK_EX)) {
        fclose($file);
        throw new RuntimeException('Не удалось заблокировать хранилище ограничения частоты запросов.');
    }

    $contents = stream_get_contents($file);
    $entries = json_decode($contents === false ? '' : $contents, true);
    if (!is_array($entries)) {
        $entries = [];
    }
    $now = time();
    $clientIp = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $key = hash('sha256', $clientIp);
    $timestamps = array_values(array_filter(
        $entries[$key] ?? [],
        static fn ($timestamp): bool => is_int($timestamp) && $timestamp > $now - 3600
    ));

    if (count($timestamps) >= 5) {
        flock($file, LOCK_UN);
        fclose($file);
        failRequest(429, 'rate_limited', 'Слишком много заявок. Попробуйте позже или позвоните: +7 (900) 000-00-00');
    }

    $timestamps[] = $now;
    $entries[$key] = $timestamps;
    foreach ($entries as $entryKey => $entryTimes) {
        if (!is_array($entryTimes) || count($entryTimes) === 0) {
            unset($entries[$entryKey]);
        }
    }
    rewind($file);
    if (!ftruncate($file, 0) || fwrite($file, (string) json_encode($entries)) === false) {
        flock($file, LOCK_UN);
        fclose($file);
        throw new RuntimeException('Не удалось обновить хранилище ограничения частоты запросов.');
    }
    fflush($file);
    flock($file, LOCK_UN);
    fclose($file);
    @chmod($filePath, 0600);
}

function saveOrder(string $directory, array $row): void
{
    $filePath = $directory . DIRECTORY_SEPARATOR . 'orders.csv';
    $file = @fopen($filePath, 'c+b');
    if ($file === false) {
        throw new RuntimeException('Не удалось открыть журнал заявок.');
    }
    if (!flock($file, LOCK_EX)) {
        fclose($file);
        throw new RuntimeException('Не удалось заблокировать журнал заявок.');
    }

    if (fstat($file)['size'] === 0) {
        if (fwrite($file, "\xEF\xBB\xBF") === false) {
            flock($file, LOCK_UN);
            fclose($file);
            throw new RuntimeException('Не удалось записать кодировку журнала заявок.');
        }
        $header = [
            'order_id', 'datetime', 'name', 'phone', 'car_class', 'car_model', 'services',
            'package', 'promo', 'master', 'date', 'slot', 'confirm_method', 'base_total',
            'combo_discount', 'promo_discount', 'gift', 'final_total', 'duration_hours',
        ];
        fputcsv($file, array_map('csvSafe', $header), ';', '"', '\\');
    }

    fseek($file, 0, SEEK_END);
    $safeRow = array_map(
        static fn ($value): string => csvSafe(is_scalar($value) ? (string) $value : json_encode($value, JSON_UNESCAPED_UNICODE)),
        $row
    );
    if (fputcsv($file, $safeRow, ';', '"', '\\') === false || !fflush($file)) {
        flock($file, LOCK_UN);
        fclose($file);
        throw new RuntimeException('Не удалось сохранить заявку в журнал.');
    }

    flock($file, LOCK_UN);
    fclose($file);
    @chmod($filePath, 0600);
}

try {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        header('Allow: POST');
        failRequest(405, 'validation', 'Метод запроса не поддерживается.');
    }

    $contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($contentLength > 8192) {
        failRequest(413, 'validation', 'Размер заявки превышает допустимый лимит.');
    }
    $body = file_get_contents('php://input');
    if ($body === false || strlen($body) > 8192) {
        failRequest(400, 'validation', 'Не удалось прочитать данные заявки.');
    }
    $input = json_decode($body, true);
    if (!is_array($input) || json_last_error() !== JSON_ERROR_NONE) {
        failRequest(400, 'validation', 'Проверьте данные заявки и повторите отправку.');
    }
    $website = $input['website'] ?? '';
    if (!is_string($website) && $website !== null) {
        failRequest(422, 'validation', 'Проверьте данные заявки и повторите отправку.');
    }
    if (cleanString($website) !== '') {
        respond(200, ['ok' => true]);
    }
    if (($input['action'] ?? null) !== 'create_order') {
        failRequest(422, 'validation', 'Неизвестный тип заявки.');
    }

    $class = is_string($input['carClass'] ?? null) ? $input['carClass'] : '';
    if (!array_key_exists($class, $PRICING['classes'])) {
        failRequest(422, 'unknown_class', 'Выберите класс автомобиля из списка.');
    }

    $serviceIds = $input['services'] ?? null;
    if (!is_array($serviceIds) || count($serviceIds) === 0 || count($serviceIds) > count($PRICING['services'])) {
        failRequest(422, 'validation', 'Добавьте услуги в комплекс перед отправкой заявки.');
    }
    foreach ($serviceIds as $serviceId) {
        if (!is_string($serviceId) || !array_key_exists($serviceId, $PRICING['services'])) {
            failRequest(422, 'unknown_service', 'В составе комплекса найдена неизвестная услуга.');
        }
    }
    $serviceIds = array_values(array_unique($serviceIds));

    $packageId = $input['package'] ?? null;
    if ($packageId !== null && (!is_string($packageId) || !array_key_exists($packageId, $PRICING['packages']))) {
        failRequest(422, 'validation', 'Выбран неизвестный пакет услуг.');
    }
    if ($packageId !== null && array_diff($PRICING['packages'][$packageId]['services'], $serviceIds) !== []) {
        failRequest(422, 'validation', 'Состав услуг не соответствует выбранному пакету.');
    }

    $promoValue = $input['promo'] ?? null;
    if ($promoValue !== null && !is_string($promoValue)) {
        failRequest(422, 'bad_promo', 'Промокод не найден. Проверьте написание.');
    }
    $promo = $promoValue === null || $promoValue === '' ? null : strtoupper(trim($promoValue));
    if ($promo !== null && $promo !== $PRICING['rules']['promo']['code']) {
        failRequest(422, 'bad_promo', 'Промокод не найден. Проверьте написание.');
    }

    $master = is_string($input['master'] ?? null) ? $input['master'] : '';
    $validMasters = ['master-any', 'master-1', 'master-2', 'master-3', 'master-4'];
    if (!in_array($master, $validMasters, true)) {
        failRequest(422, 'validation', 'Выберите мастера или оставьте любого свободного.');
    }

    $date = is_string($input['date'] ?? null) ? $input['date'] : '';
    $parsedDate = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
    $dateErrors = DateTimeImmutable::getLastErrors();
    if ($parsedDate === false || ($dateErrors !== false && ($dateErrors['warning_count'] > 0 || $dateErrors['error_count'] > 0)) || $parsedDate->format('Y-m-d') !== $date) {
        failRequest(422, 'validation', 'Выберите корректную дату заезда.');
    }
    $today = new DateTimeImmutable('today');
    if ($parsedDate <= $today || $parsedDate > $today->modify('+14 days')) {
        failRequest(422, 'validation', 'Дата должна быть в пределах ближайших 14 дней.');
    }

    $slot = is_string($input['slot'] ?? null) ? $input['slot'] : '';
    if (!in_array($slot, ['10:00', '12:00', '14:00', '16:00', '18:00'], true)) {
        failRequest(422, 'validation', 'Выберите время заезда из доступных слотов.');
    }
    $carModel = cleanString($input['carModel'] ?? '');
    if ($carModel === '' || characterLength($carModel) > 60) {
        failRequest(422, 'validation', 'Укажите марку и модель автомобиля (до 60 символов).');
    }
    $name = cleanString($input['name'] ?? '');
    $nameLength = characterLength($name);
    if ($nameLength < 2 || $nameLength > 40 || preg_match('/^[\p{L}\s-]+$/u', $name) !== 1) {
        failRequest(422, 'validation', 'Имя должно содержать от 2 до 40 букв.');
    }

    $phoneValue = $input['phone'] ?? null;
    $phone = is_string($phoneValue) ? trim($phoneValue) : '';
    if (preg_match('/^\+7\d{10}$/', $phone) !== 1) {
        failRequest(422, 'validation', 'Введите полный номер в формате +7 (___) ___-__-__.');
    }
    $confirmMethod = is_string($input['confirmMethod'] ?? null) ? $input['confirmMethod'] : '';
    if (!in_array($confirmMethod, ['onsite', 'sbp', 'messenger'], true)) {
        failRequest(422, 'validation', 'Выберите способ подтверждения записи.');
    }
    if (($input['consent'] ?? null) !== true) {
        failRequest(422, 'no_consent', 'Необходимо согласие на обработку персональных данных.');
    }

    $summary = recalc($class, $serviceIds, $packageId, $promo);
    $directory = __DIR__ . DIRECTORY_SEPARATOR . 'data';
    if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
        throw new RuntimeException('Не удалось создать каталог журнала заявок.');
    }
    checkRateLimit($directory);

    $orderId = 'APEX-' . date('Y') . '-' . str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);
    $masterLabel = $master === 'master-any' ? 'Любой свободный мастер' : $master;
    $loggedPhone = substr($phone, 0, 2) . '***' . substr($phone, -3);
    saveOrder($directory, [
        $orderId,
        date('c'),
        $name,
        $loggedPhone,
        $class,
        $carModel,
        implode(', ', $serviceIds),
        $packageId ?? '',
        $promo ?? '',
        $masterLabel,
        $date,
        $slot,
        $confirmMethod,
        $summary['baseTotal'],
        $summary['comboDiscount'],
        $summary['promoDiscount'],
        $summary['gift']['active'] ? $summary['gift']['name'] : '',
        $summary['finalTotal'],
        $summary['durationHours'],
    ]);

    respond(200, [
        'ok' => true,
        'orderId' => $orderId,
        'summary' => array_merge(['carClass' => $class, 'package' => $packageId], $summary),
    ]);
} catch (Throwable $error) {
    error_log('APEX order processing failed: ' . $error->getMessage());
    failRequest(500, 'server', 'Не удалось сохранить заявку. Позвоните нам: +7 (900) 000-00-00.');
}
