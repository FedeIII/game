# game.azyr.io: the browser game. Static files, and /ws for the multiplayer server (PM2:
# game-server on 127.0.0.1:3008).
#
# Install as /etc/nginx/sites-available/game.azyr.io (NO .conf extension, which is the
# convention on this box) and symlink it into sites-enabled. See deploy/README.md.
#
# Modelled on hidden-agenda.azyr.io, /ws included.

server {
	listen 80;
	listen [::]:80;
	server_name game.azyr.io;
	return 301 https://$host$request_uri;
}

server {
	listen 443 ssl http2;
	listen [::]:443 ssl http2;
	server_name game.azyr.io;

	# Cloudflare Origin Certificate. Its SANs are *.azyr.io and azyr.io, so it covers this name.
	ssl_certificate /etc/nginx/ssl/azyr.io.pem;
	ssl_certificate_key /etc/nginx/ssl/azyr.io.key;

	ssl_protocols TLSv1.2 TLSv1.3;
	ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
	ssl_prefer_server_ciphers off;
	ssl_session_cache shared:SSL:10m;
	ssl_session_timeout 10m;

	# Cloudflare Authenticated Origin Pulls: only Cloudflare can connect. The include is a GLOB,
	# so the site works without the snippet, and moving the snippet aside is the rollback.
	include /etc/nginx/snippets/game-mtls*.conf;

	access_log /var/log/nginx/game.azyr.io.access.log;
	error_log /var/log/nginx/game.azyr.io.error.log;

	add_header X-Frame-Options "SAMEORIGIN" always;
	add_header X-Content-Type-Options "nosniff" always;
	add_header Referrer-Policy "no-referrer-when-downgrade" always;
	add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

	root /var/www/game.azyr.io;
	index index.html;

	client_max_body_size 64k;

	# A location that sets add_header does NOT inherit the add_header lines of the server
	# block. Thus each location below repeats the security headers. Do not remove them.

	# The multiplayer server. proxy_read_timeout has to outlast a quiet connection: the server
	# pings every 25 s, which also keeps Cloudflare from dropping the connection at ~100 s.
	location = /ws {
		proxy_pass http://127.0.0.1:3008;
		proxy_http_version 1.1;
		proxy_set_header Upgrade $http_upgrade;
		proxy_set_header Connection "upgrade";
		proxy_set_header Host $host;
		proxy_read_timeout 3600s;
		proxy_send_timeout 3600s;

		# SET, not $proxy_add_x_forwarded_for. The server limits connections per address with
		# it, and appending would let a client add a value of its own to get a fresh limit.
		proxy_set_header X-Forwarded-For $remote_addr;

		# A websocket must never be cached, whatever a Cloudflare rule might say.
		proxy_cache_bypass 1;
	}

	# Vite gives every file in /assets/ a content hash in its name, so a year and immutable is
	# correct here. A new build makes new names.
	location /assets/ {
		try_files $uri =404;
		add_header Cache-Control "public, max-age=31536000, immutable" always;
		add_header X-Content-Type-Options "nosniff" always;
		add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
	}

	# The entry page must never be cached: it names the current hashed bundle. try_files serves
	# "/" from inside this location, so the no-store must be here.
	location / {
		try_files $uri $uri/ /index.html;
		add_header Cache-Control "no-store" always;
		add_header X-Frame-Options "SAMEORIGIN" always;
		add_header X-Content-Type-Options "nosniff" always;
		add_header Referrer-Policy "no-referrer-when-downgrade" always;
		add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
	}
}
