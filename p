#!/bin/bash
git add .
echo "Masukkan pesan commit (kosongkan untuk 'Update'):"
read msg
if [ -z "$msg" ]; then
  msg="Update"
fi
git commit -m "$msg"
git push origin master
