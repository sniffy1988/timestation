#!/bin/sh
set -e

if [ -z "$NTP_SERVER" ]; then
  echo "NTP_SERVER environment variable is required" >&2
  exit 1
fi

mkdir -p /var/lib/chrony

cat > /etc/chrony/chrony.conf <<EOF
server ${NTP_SERVER} iburst
makestep 1.0 3
driftfile /var/lib/chrony/drift
EOF

chronyd -f /etc/chrony/chrony.conf

chronyc waitsync 30 0.1 0 0 || {
  echo "chrony failed to sync with ${NTP_SERVER}" >&2
  exit 1
}

chronyc tracking

exec nginx -g 'daemon off;'
