#!/bin/bash

cd ~/CRU

rm ./server/database/database.db
rm ./server/wallet/*.id

echo "restarting network"

./run_network.sh
./start_server.sh
