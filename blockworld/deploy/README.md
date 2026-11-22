# Deploy: Sato Aliyun ECS 101.132.143.85 (static files via the existing nginx)

- Files: /opt/blockworld/releases/<timestamp>/ ; live = symlink /opt/blockworld/site -> releases/<ts>
- nginx: /etc/nginx/sites-available/blockworld (copy of deploy/blockworld.nginx), enabled via symlink in sites-enabled.
  server_name 101.132.143.85 world.xueruo.me, port 80; other hostnames still hit the existing default/bin.xueruo.me servers.
- Logs: /var/log/nginx/blockworld.{access,error}.log
- No new processes/services; no ports opened; nothing else changed.

## Update
  python3 gen/build.py ; tar -C site -czf /tmp/bw.tgz . ; upload ; on server:
  sudo mkdir /opt/blockworld/releases/$TS && sudo tar -xzf /tmp/bw.tgz -C /opt/blockworld/releases/$TS && sudo ln -sfn releases/$TS /opt/blockworld/site

## Rollback
  previous release:   cd /opt/blockworld && sudo ln -sfn releases/<older-ts> site
  remove completely:  sudo rm /etc/nginx/sites-enabled/blockworld && sudo nginx -t && sudo systemctl reload nginx
                      sudo rm -rf /opt/blockworld /etc/nginx/sites-available/blockworld
