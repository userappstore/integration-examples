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
AUTHORIZE_APP_STORE_1_TOKEN=\$2a\$04\$TTiJ6MHrYXr/q0DCJTedeupXWQACaZTcHL2DKSE.i1yM.4jcAqbxi \
APPLICATION_SERVER_1_TOKEN=f57TCTpveTIiDuXgsT5oB0ZDRgSKojW86fzTKpvvOmbCotawQXILLdB5qpDcqqvb \
PUBLIC_DOMAIN="test-application.server7373.synology.me" \
PORT=8300 \
HOST=0.0.0.0 \
node main.js 
