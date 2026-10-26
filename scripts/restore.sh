#!/usr/bin/env bash
# Restores a backup made by backup.sh.
#
#   MONGO_URI="mongodb+srv://..." ./scripts/restore.sh backups/agriai-<date>.archive.gz[.gpg] [--drop]
#
# Without --drop: documents that already exist are kept, only missing ones are added (safe).
# With --drop:    every collection in the backup REPLACES the current one. Asks for confirmation.
# Encrypted backups (.gpg) need BACKUP_PASSPHRASE. Tip: first restore into a new, empty Atlas database to check.
set -euo pipefail

: "${MONGO_URI:?Set MONGO_URI to the database to restore into}"
file="${1:?Usage: restore.sh <backup file> [--drop]}"
mode="${2:-}"
[ -f "$file" ] || { echo "No such file: $file"; exit 1; }

dir="$(cd "$(dirname "$file")" && pwd)"
archive="$(basename "$file")"
decrypted=""
cleanup() { if [ -n "$decrypted" ]; then rm -f "$decrypted"; fi; }
trap cleanup EXIT
if [[ "$archive" == *.gpg ]]; then
  : "${BACKUP_PASSPHRASE:?This backup is encrypted: set BACKUP_PASSPHRASE}"
  umask 077
  gpg --batch --yes --pinentry-mode loopback --passphrase-fd 3 -o "$dir/${archive%.gpg}" -d "$dir/$archive" 3<<<"$BACKUP_PASSPHRASE"
  archive="${archive%.gpg}"
  decrypted="$dir/$archive"
fi

host=$(sed -E 's#^mongodb(\+srv)?://([^@/]*@)?([^/?]+).*#\3#' <<<"$MONGO_URI")
drop=()
if [ "$mode" = "--drop" ]; then
  read -r -p "This REPLACES the collections on $host with the backup. Type RESTORE to continue: " answer
  [ "$answer" = "RESTORE" ] || { echo "Cancelled."; exit 1; }
  drop=(--drop)
fi

echo "Restoring $archive into $host"
if command -v mongorestore >/dev/null 2>&1; then
  mongorestore --uri="$MONGO_URI" --archive --gzip "${drop[@]}" <"$dir/$archive"
else
  docker run --rm -i --network host mongo:8.0 mongorestore --uri="$MONGO_URI" --archive --gzip "${drop[@]}" <"$dir/$archive"
fi
echo "Restore finished."
