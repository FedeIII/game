# world.kandrax.app: World of Kandrax, the main address of the game (since 2026-10-13).
# game.azyr.io is its mirror. Both serve the same files and the same server; the routes are in the
# shared snippet game-site.conf.
#
# Install as /etc/nginx/sites-available/world.kandrax.app (NO .conf extension, which is the
# convention on this box) and symlink it into sites-enabled. See deploy/README.md.
#
# kandrax.app is a separate Cloudflare zone from azyr.io: its apex and www are another app
# (on Vercel). This site has its own origin certificate and its own mTLS snippet, because
# Authenticated Origin Pulls is a setting of each zone.

server {
	listen 80;
	listen [::]:80;
	server_name world.kandrax.app;
	return 301 https://$host$request_uri;
}

server {
	listen 443 ssl http2;
	listen [::]:443 ssl http2;
	server_name world.kandrax.app;

	# Cloudflare Origin Certificate of the kandrax.app zone. Its SANs are *.kandrax.app and
	# kandrax.app. The private key was made on this box and never left it (the certificate came
	# from a CSR, /etc/nginx/ssl/kandrax.app.csr).
	ssl_certificate /etc/nginx/ssl/kandrax.app.pem;
	ssl_certificate_key /etc/nginx/ssl/kandrax.app.key;

	ssl_protocols TLSv1.2 TLSv1.3;
	ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
	ssl_prefer_server_ciphers off;
	ssl_session_cache shared:SSL:10m;
	ssl_session_timeout 10m;

	# Cloudflare Authenticated Origin Pulls of the kandrax.app zone. The include is a GLOB, so the
	# site works without the snippet, and moving the snippet aside is the rollback. Install the
	# snippet only after Cloudflare sends its client certificate (deploy/README.md).
	include /etc/nginx/snippets/kandrax-mtls*.conf;

	access_log /var/log/nginx/world.kandrax.app.access.log;
	error_log /var/log/nginx/world.kandrax.app.error.log;

	# The headers, the web root and the locations: the same on every address of the game.
	include /etc/nginx/snippets/game-site.conf;
}
