git add .
$msg = Read-Host "Masukkan pesan commit (kosongkan untuk 'Update')"
if ([string]::IsNullOrWhiteSpace($msg)) {
    $msg = "Update"
}
git commit -m $msg
git push origin master
