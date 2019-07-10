# ------------------------
# Authorize a specific app store:
# (via @userdashboard/express-application-server)
# ---------------------------------
# AUTHORIZE_APP_STORE_1=https://..... \
# AUTHORIZE_APP_STORE_1_TOKEN=.... \
# APPLICATION_SERVER_1_TOKEN=.... \
#
# ----------------------------------------------------
# Ban an app store
# (via @userdashboard/express-application-server)
# --------------------------------------------------
# PROHIBIT_APP_STORE_1=https://....
# PROHIBIT_APP_STORE_2=https://....
#
# ----------------------------------------------------
# Enable users to import on any app store 
# (via server.js)
# --------------------------------------------------
# ANONYMOUS_APP_STORES=true
#

AUTHORIZE_APP_STORE_1=https://userappstore.server7373.synology.me \
AUTHORIZE_APP_STORE_1_TOKEN=\$2a\$04\$WhBeOhKJy5ujDGvq1rkUg.cNURIkf6Etr7gDTjc6gw/./kVl5linW \
APPLICATION_SERVER_1_TOKEN=hkur8PEjG08OcbwdwTHcgrhkXeS7qsigvvV9oWzeYC08USg46zvj5uZuf4GYYcil \
PUBLIC_DOMAIN="test-application.server7373.synology.me" \
PORT=8300 \
HOST=0.0.0.0 \
node main.js 
