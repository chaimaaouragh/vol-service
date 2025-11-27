# Vol-Service (Oracle Cloud - Always Free)

## Objectif
Micro-service IaaS pour gérer les positions des bénévoles.  
Endpoints disponibles :
- PUT `/volunteers/:id/location` → enregistrer la position
- GET `/volunteers/:id/location` → récupérer la dernière position
- GET `/health` → vérifier que le service est actif

Service Node.js exécuté sur une VM Oracle Always Free.

## Déploiement sur la VM

### 1. Préparer la VM
```bash
sudo dnf update -y
sudo dnf install -y git curl
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs
Cloner le projet et installer les dépendances
git clone <URL_DU_REPO> ~/vol-service
cd ~/vol-service
npm install --production
Créer le service systemd

Créer /etc/systemd/system/vol-service.service :
[Unit]
Description=Volunteer Location Service
After=network.target

[Service]
Type=simple
User=opc
WorkingDirectory=/home/opc/vol-service
ExecStart=/usr/bin/node /home/opc/vol-service/index.js
Restart=always
RestartSec=5
Environment=PORT=3000
Environment=AUTH_TOKEN=change_me_token

[Install]
WantedBy=multi-user.target
Activer et démarrer le service :
sudo systemctl daemon-reload
sudo systemctl enable vol-service
sudo systemctl start vol-service
sudo systemctl status vol-service --no-pager








Reverse Proxy avec Nginx



sudo dnf install -y nginx
sudo tee /etc/nginx/conf.d/vol-service.conf > /dev/null <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo nginx -t
sudo systemctl restart nginx



Endpoints et tests
Health check
curl http://PUBLIC_IP/health



PUT location

curl -X PUT http://PUBLIC_IP/volunteers/vol_123/location \
-H "Content-Type: application/json" \
-H "Authorization: Bearer change_me_token" \
-d '{"lat":33.5883,"lon":-7.6114,"accuracy":5,"ts":"2025-11-29T10:00:00Z"}'



GET location


curl -H "Authorization: Bearer change_me_token" \
http://PUBLIC_IP/volunteers/vol_123/location

Exemple de réponse :

{
  "id":"vol_123",
  "data":{
    "lat":33.5883,
    "lon":-7.6114,
    "accuracy":5,
    "ts":"2025-11-29T10:00:00Z",
    "received_at":"2025-11-27T10:50:39.493Z"
  }
}
