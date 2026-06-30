#!/bin/sh

mkdir -p /etc/nginx/certs

if [ ! -f /etc/nginx/certs/cert.pem ]; then
  tls_san="${TLS_SAN:-DNS:localhost,IP:127.0.0.1}"
  echo "Generating self-signed TLS certificate (SAN: ${tls_san})"
  openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout /etc/nginx/certs/key.pem \
    -out /etc/nginx/certs/cert.pem \
    -subj "/CN=timestation" \
    -addext "subjectAltName=${tls_san}"
fi

if [ "${CHRONY_DISABLE:-false}" != "true" ] && [ -n "${NTP_SERVER:-}" ]; then
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

  if chronyc waitsync 10 0.5 0 0; then
    echo "NTP sync OK:"
    chronyc tracking
  else
    echo "WARNING: chrony could not sync with ${NTP_SERVER} (non-fatal)." >&2
    if [ "${NTP_SYNC_REQUIRED:-false}" = "true" ]; then
      exit 1
    fi
  fi
elif [ -z "${NTP_SERVER:-}" ]; then
  echo "NTP_SERVER not set; skipping chrony."
else
  echo "CHRONY_DISABLE=true; skipping chrony."
fi

exec nginx -g 'daemon off;'
