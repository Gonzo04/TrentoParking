#!/bin/bash
set -e
mongosh admin \
  --username "$MONGO_INITDB_ROOT_USERNAME" \
  --password "$MONGO_INITDB_ROOT_PASSWORD" \
  --eval "
    db.getSiblingDB('trentoparking').createUser({
      user: '$MONGO_APP_USER',
      pwd:  '$MONGO_APP_PASS',
      roles: [{ role: 'readWrite', db: 'trentoparking' }]
    });
  "
