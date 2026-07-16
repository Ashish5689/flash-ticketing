#!/bin/bash
set -euo pipefail

: "${AWS_REGION:?AWS_REGION is required}"
: "${BACKEND_CONFIG_SECRET_ARN:?BACKEND_CONFIG_SECRET_ARN is required}"
: "${FIREBASE_CREDENTIAL_SECRET_ARN:?FIREBASE_CREDENTIAL_SECRET_ARN is required}"
: "${REPOSITORY_URL:?REPOSITORY_URL is required}"
: "${REPOSITORY_BRANCH:=main}"

dnf install -y docker git nginx jq python3
systemctl enable --now docker
systemctl enable --now nginx
systemctl enable --now amazon-ssm-agent

if [ ! -f /swapfile ]; then
  dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

install -d -m 0750 /etc/flash-ticketing
curl --fail --silent --show-error --location \
  'https://raw.githubusercontent.com/aws/agent-toolkit-for-aws/ab386bbd328b6ec92b3e079ef8d7859d074952e2/plugins/aws-core/skills/aws-secrets-manager/references/asm-exec' \
  --output /usr/local/bin/asm-exec
chmod 0755 /usr/local/bin/asm-exec

if ! systemctl list-unit-files aws-workload-credentials-provider-sm.service >/dev/null 2>&1; then
  dnf groupinstall -y 'Development Tools'
  curl --proto '=https' --tlsv1.2 --silent --show-error --fail \
    https://sh.rustup.rs | sh -s -- -y --profile minimal
  rm -rf /opt/aws-workload-credentials-provider-source
  git clone --branch v3.1.0 --depth 1 \
    https://github.com/aws/aws-workload-credentials-provider.git \
    /opt/aws-workload-credentials-provider-source
  cd /opt/aws-workload-credentials-provider-source
  /root/.cargo/bin/cargo build --release --locked --bin aws-workload-credentials-provider

  cat >/etc/flash-ticketing/workload-credentials-provider.toml <<WCP_CONFIG
[logging]
log_level = "INFO"
log_to_file = true

[capabilities.secrets_manager]
enabled = true
region = "${AWS_REGION}"
http_port = 2773
max_conn = 20

[capabilities.secrets_manager.cache]
ttl_seconds = 300
cache_size = 10
WCP_CONFIG

  cd aws_workload_credentials_provider_common/configuration
  ./install \
    --config /etc/flash-ticketing/workload-credentials-provider.toml \
    --no-privileges \
    --no-sudoers
fi
systemctl is-active --quiet aws-workload-credentials-provider-sm

if [ ! -d /opt/flash-ticketing/.git ]; then
  rm -rf /opt/flash-ticketing
  git clone --branch "$REPOSITORY_BRANCH" --single-branch "$REPOSITORY_URL" /opt/flash-ticketing
fi

cat >/etc/nginx/nginx.conf <<'NGINX_CORE'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log notice;
pid /run/nginx.pid;

events {
  worker_connections 1024;
}

http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;
  sendfile on;
  keepalive_timeout 65;
  include /etc/nginx/conf.d/*.conf;
}
NGINX_CORE

cat >/etc/nginx/conf.d/flash-ticketing.conf <<'NGINX'
server {
  listen 80 default_server;
  server_name _;

  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Request-Id $request_id;
    proxy_connect_timeout 5s;
    proxy_read_timeout 60s;
  }
}
NGINX
nginx -t
systemctl reload nginx

cat >/etc/flash-ticketing/deploy.conf <<DEPLOY_CONFIG
REGION='${AWS_REGION}'
BACKEND_SECRET='${BACKEND_CONFIG_SECRET_ARN}'
FIREBASE_SECRET='${FIREBASE_CREDENTIAL_SECRET_ARN}'
REPOSITORY_BRANCH='${REPOSITORY_BRANCH}'
DEPLOY_CONFIG
chmod 0600 /etc/flash-ticketing/deploy.conf

cat >/usr/local/bin/deploy-flash-ticketing <<'DEPLOY'
#!/bin/bash
set -euo pipefail

source /etc/flash-ticketing/deploy.conf
export AWS_REGION="$REGION"

install -d -m 0750 /etc/flash-ticketing
AWS_TOKEN="$(</var/run/awssmatoken)" asm-exec -- \
  sh -c 'umask 077; printf "%s" "$1" > "$2"' _ \
  "{{resolve:secretsmanager:$BACKEND_SECRET:SecretString}}" \
  /etc/flash-ticketing/backend.env
AWS_TOKEN="$(</var/run/awssmatoken)" asm-exec -- \
  sh -c 'umask 077; printf "%s" "$1" > "$2"' _ \
  "{{resolve:secretsmanager:$FIREBASE_SECRET:SecretString}}" \
  /etc/flash-ticketing/firebase-admin.json
chmod 0600 /etc/flash-ticketing/backend.env /etc/flash-ticketing/firebase-admin.json

cd /opt/flash-ticketing
git fetch origin "$REPOSITORY_BRANCH"
git reset --hard "origin/$REPOSITORY_BRANCH"

docker build --target build -t flash-ticketing-api-migrate:current backend
docker build -t flash-ticketing-api:current backend
docker run --rm --env-file /etc/flash-ticketing/backend.env \
  flash-ticketing-api-migrate:current npm run db:migrate

docker rm -f flash-ticketing-api 2>/dev/null || true
docker run -d \
  --name flash-ticketing-api \
  --restart unless-stopped \
  -p 127.0.0.1:4000:4000 \
  --env-file /etc/flash-ticketing/backend.env \
  -v /etc/flash-ticketing/firebase-admin.json:/run/secrets/firebase-admin.json:ro \
  flash-ticketing-api:current

for attempt in $(seq 1 30); do
  if curl --fail --silent http://127.0.0.1:4000/health >/dev/null; then
    docker image prune -f >/dev/null
    exit 0
  fi
  sleep 2
done

docker logs --tail 100 flash-ticketing-api
exit 1
DEPLOY
chmod 0750 /usr/local/bin/deploy-flash-ticketing
/usr/local/bin/deploy-flash-ticketing
