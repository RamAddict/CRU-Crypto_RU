#!/bin/bash
file="minifab"

if [ -x "$(command -v docker)" ]; then
    echo "Already has docker, Great!"
else
    # install docker
    echo "Installing docker"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
fi

if [ -e "$file" ]; then
    echo "Minifab exists!"
    echo "Great you are all set! You should probably do \"bash run_network.sh\""
else 
    echo "Minifab does not exist, installing"
    # install minifabric
    curl -o minifab -sL https://tinyurl.com/yxa2q6yr && chmod +x minifab
    echo "Great you are all set! You should probably do \"bash run_network.sh\""
fi 

cd node

if [ -x "$(command -v npm)" ]; then
    echo "Already has npm, Great!"
else
    # install npm
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
    source ~/.bashrc
    nvm install --lts
    nvm use --lts
fi

if [ -x "$(command -v pnpm)" ]; then
    echo "Already has pnpm, Great!"
else
    # install pnpm
    npm install -g pnpm
fi

cd ..
# export PATH=/home/arthur/CRU:$PATH
source ~/.bashrc 