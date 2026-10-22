#!/bin/bash
# Bootstrap de la EC2 (Amazon Linux 2023). Se pasa como user data al lanzar la instancia; corre una sola vez como root.
# Deja listo: Docker, swap, y el timer de systemd que vence órdenes cada minuto. La app la despliega infra/aws/deploy.sh.
set -euxo pipefail

dnf install -y docker jq
systemctl enable --now docker

# t3.micro tiene 1 GB: el swap evita OOM en picos (optimizador de imágenes de Next).
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

mkdir -p /opt/ticktera

# Reemplaza a Cloud Scheduler: el endpoint ya soporta el modo secreto (Authorization: Bearer).
cat > /usr/local/bin/ticktera-expire-orders <<'EOS'
#!/bin/bash
S=$(grep '^INTERNAL_JOB_SECRET=' /opt/ticktera/.env 2>/dev/null | cut -d= -f2-)
[ -n "$S" ] || exit 0  # todavía no hubo deploy
exec curl -fsS -m 30 -X POST -H "Authorization: Bearer $S" http://localhost:3000/api/internal/expire-orders
EOS
chmod +x /usr/local/bin/ticktera-expire-orders

cat > /etc/systemd/system/ticktera-expire-orders.service <<'EOS'
[Unit]
Description=Vence las órdenes pendientes de Ticktera

[Service]
Type=oneshot
ExecStart=/usr/local/bin/ticktera-expire-orders
EOS

cat > /etc/systemd/system/ticktera-expire-orders.timer <<'EOS'
[Unit]
Description=Vencimiento de órdenes cada minuto

[Timer]
OnCalendar=minutely
AccuracySec=5s

[Install]
WantedBy=timers.target
EOS

systemctl daemon-reload
systemctl enable --now ticktera-expire-orders.timer
