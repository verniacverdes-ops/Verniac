<?php

$host = "localhost";
$user = "root";
$password = "";
$database = "daftar-pertelaan-arsip-2026";

$conn = new mysqli(
    $host,
    $user,
    $password,
    $database
);

if ($conn->connect_error) {
    http_response_code(500);
    die("Koneksi database gagal: " . $conn->connect_error);
}

$conn->set_charset("utf8mb4");