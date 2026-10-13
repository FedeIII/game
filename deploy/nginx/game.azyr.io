# game.azyr.io: the mirror of World of Kandrax (the main address is world.kandrax.app, since
# 2026-10-13). It serves the same files and the same server as the main address; the routes are in
# the shared snippet game-site.conf.
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
	# Authenticated Origin Pulls is on for the azyr.io zone (hidden-agenda uses it too).
	include /etc/nginx/snippets/game-mtls*.conf;

	access_log /var/log/nginx/game.azyr.io.access.log;
	error_log /var/log/nginx/game.azyr.io.error.log;

	# The headers, the web root and the locations: the same on every address of the game.
	include /etc/nginx/snippets/game-site.conf;
}
