<?php

header("Content-Type: application/json");

$MAX_SIZE = 10 * 1024 * 1024;
$UPLOAD_DIR = __DIR__ . "/../uploads/arsip/";

if (!isset($_FILES["file"])) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "File belum dipilih."
    ]);

    exit;
}

$file = $_FILES["file"];

if ($file["error"] !== UPLOAD_ERR_OK) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "Upload file gagal."
    ]);

    exit;
}

if ($file["size"] <= 0) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "File kosong."
    ]);

    exit;
}

if ($file["size"] > $MAX_SIZE) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "Ukuran file maksimal 10 MB."
    ]);

    exit;
}

/*
|--------------------------------------------------------------------------
| Periksa MIME file sebenarnya
|--------------------------------------------------------------------------
*/

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file["tmp_name"]);

if ($mime !== "application/pdf") {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "File harus berupa PDF."
    ]);

    exit;
}

/*
|--------------------------------------------------------------------------
| Periksa ekstensi
|--------------------------------------------------------------------------
*/

$extension = strtolower(
    pathinfo($file["name"], PATHINFO_EXTENSION)
);

if ($extension !== "pdf") {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "Ekstensi file harus .pdf."
    ]);

    exit;
}

/*
|--------------------------------------------------------------------------
| Buat folder jika belum ada
|--------------------------------------------------------------------------
*/

if (!is_dir($UPLOAD_DIR)) {
    mkdir($UPLOAD_DIR, 0755, true);
}

/*
|--------------------------------------------------------------------------
| Nama file aman
|--------------------------------------------------------------------------
*/

$newFileName =
    bin2hex(random_bytes(16)) . ".pdf";

$destination =
    $UPLOAD_DIR . $newFileName;

/*
|--------------------------------------------------------------------------
| Simpan file
|--------------------------------------------------------------------------
*/

if (!move_uploaded_file(
    $file["tmp_name"],
    $destination
)) {
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Gagal menyimpan file."
    ]);

    exit;
}

echo json_encode([
    "success" => true,
    "message" => "File berhasil diupload.",
    "data" => [
        "original_name" => $file["name"],
        "stored_name" => $newFileName,
        "path" => "uploads/arsip/" . $newFileName,
        "size" => $file["size"],
        "mime" => $mime
    ]
]);