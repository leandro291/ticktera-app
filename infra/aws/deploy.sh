#!/usr/bin/env bash
# Deploy en la EC2. Lo envía el workflow por SSM Run Command: `deploy.sh <sha>`.
# Orden: bajar imágenes → migrar → reemplazar la app → health check (si falla, vuelve a la imagen anterior).
set -euo pipefail

SHA=${1:?uso: deploy.sh <sha>}
REGION=${AWS_REGION:-us-east-2}
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
REGISTRY=$ACCOUNT.dkr.ecr.$REGION.amazonaws.com
REPO=$REGISTRY/ticktera-app
LOG_GROUP=/ticktera/app

cd /opt/ticktera

aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REGISTRY"

# Secretos de Parameter Store a un .env (600); el nombre del parámetro es el de la variable.
umask 077
aws ssm get-parameters-by-path --path /ticktera --with-decryption --region "$REGION" --output json \
  | jq -r '.Parameters[] | "\(.Name | split("/") | last)=\(.Value)"' > .env
grep -q '^DATABASE_URL=' .env || { echo "falta /ticktera/DATABASE_URL en Parameter Store" >&2; exit 1; }

docker pull "$REPO:app-$SHA"
docker pull "$REPO:migrate-$SHA"

# Migraciones primero: si fallan no se toca la app que está corriendo.
docker run --rm --env-file .env "$REPO:migrate-$SHA"

start() {
  docker run -d --name ticktera-app --restart unless-stopped -p 3000:3000 --env-file .env \
    --log-driver awslogs --log-opt awslogs-region="$REGION" --log-opt awslogs-group="$LOG_GROUP" \
    --log-opt awslogs-create-group=true "$1"
}

PREV=$(docker inspect -f '{{.Config.Image}}' ticktera-app 2>/dev/null || true)
docker rm -f ticktera-app >/dev/null 2>&1 || true
start "$REPO:app-$SHA"

for _ in $(seq 1 30); do
  if curl -fsS localhost:3000/api/health >/dev/null 2>&1; then
    echo "deploy ok: $SHA"
    docker image prune -af --filter "until=72h" >/dev/null
    exit 0
  fi
  sleep 2
done

echo "health check falló para $SHA" >&2
docker logs --tail 40 ticktera-app >&2 || true
docker rm -f ticktera-app >/dev/null 2>&1 || true
if [ -n "$PREV" ]; then
  echo "vuelvo a $PREV" >&2
  start "$PREV"
fi
exit 1
