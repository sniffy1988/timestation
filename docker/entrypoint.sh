#!/bin/sh

if [ -z "$NTP_SERVER" ]; then
  echo "NTP_SERVER environment variable is required" >&2
  exit 1
fi

mkdir -p /var/lib/chrony /var/run/chrony

if [ -f /var/run/chrony/chronyd.pid ]; then
  kill "$(cat /var/run/chrony/chronyd.pid)" 2>/dev/null || true
  rm -f /var/run/chrony/chronyd.pid
fi

cat > /etc/chrony/chrony.conf <<EOF
server ${NTP_SERVER} iburst
makestep 1.0 3
driftfile /var/lib/chrony/drift
EOF

chronyd -f /etc/chrony/chrony.conf

if chronyc waitsync 30 0.1 0 0; then
  echo "NTP sync OK:"
  chronyc tracking
else
  echo "WARNING: chrony could not sync with ${NTP_SERVER}." >&2
  echo "Check Mikrotik NTP server is enabled and UDP/123 is allowed from Docker." >&2
  chronyc sources -v || true
  if [ "${NTP_SYNC_REQUIRED:-false}" = "true" ]; then
    exit 1
  fi
  echo "Starting nginx anyway (set NTP_SYNC_REQUIRED=true to fail on sync timeout)."
fi

exec nginx -g 'daemon off;'
