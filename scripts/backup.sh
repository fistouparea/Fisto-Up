#!/usr/bin/env bash
# MongoDB backup with retention. Schedule it daily (cron or GitHub Actions, see DEPLOY.md).
#
#   MONGO_URI="mongodb+srv://..." ./scripts/backup.sh
#
# Settings (environment):
#   MONGO_URI          database to back up (required; Atlas or local)
#   BACKUP_DIR         where backups go             (default: ./backups)
#   RETENTION_DAYS     delete backups older than     (default: 14)
#   BACKUP_PASSPHRASE  if set, encrypt with gpg (recommended: backups contain names and phone numbers)
#
# Uses mongodump if installed, otherwise the official mongo:8.0 Docker image. Only reads from the database.
# Listing photos at Cloudinary are not in this backup (Cloudinary keeps them; see DEPLOY.md).
set -euo pipefail

: "${MONGO_URI:?Set MONGO_URI to the database to back up}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
mkdir -p "$BACKUP_DIR"
BACKUP_DIR="$(cd "$BACKUP_DIR" && pwd)"
umask 077
name="agriai-$(date -u +%Y-%m-%dT%H-%M-%SZ).archive.gz"

echo "Backing up to $BACKUP_DIR/$name"
# The archive streams through stdout, so the Docker variant needs no shared folder.
if command -v mongodump >/dev/null 2>&1; then
  mongodump --uri="$MONGO_URI" --archive --gzip --quiet >"$BACKUP_DIR/$name"
else
  docker run --rm --network host mongo:8.0 mongodump --uri="$MONGO_URI" --archive --gzip --quiet >"$BACKUP_DIR/$name"
fi

if [ -n "${BACKUP_PASSPHRASE:-}" ]; then
  gpg --batch --yes --pinentry-mode loopback --passphrase-fd 3 --symmetric --cipher-algo AES256 \
    -o "$BACKUP_DIR/$name.gpg" "$BACKUP_DIR/$name" 3<<<"$BACKUP_PASSPHRASE"
  rm "$BACKUP_DIR/$name"
  name="$name.gpg"
fi

echo "Done: $name ($(du -h "$BACKUP_DIR/$name" | cut -f1))"

# Retention: remove old backups, never the one just made.
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'agriai-*.archive.gz*' -mtime +"$RETENTION_DAYS" ! -name "$name" -print -delete
