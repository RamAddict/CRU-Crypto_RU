#!/bin/bash

cd ~/CRU
echo "here we go!"
./minifab cleanup -o mec.example.com 


cd node/src
npm install
pnpm build
cd ../../

./minifab up -e true -i 2.4.1 -c mainchannel -o mec.example.com -n mycc -l node 
# -y 'OutOf(2, "mec-example-com.member", "student-example-com.member", "ufsc-example-com.member")'
# blows up with minifab up for some reason
# echo "Creating mainchannel"
# ./minifab create -c mainchannel
# echo "joining and singing"
# ./minifab join,channelquery,channelsign
# read -p "continue?"
sleep 3
./minifab channelquery
./minifab discover
./minifab explorerup
if [[ -n "$IS_WSL" || -n "$WSL_DISTRO_NAME" ]]; then
    echo "This is WSL. Waiting a while, otherwise it might not work"
    sleep 300
else
    echo "This is not WSL. Waiting a little while, otherwise it might not work"
    sleep 50
fi
echo "Done setting up docker and channel"

# echo -e "\n\nbuilt code, will try to install it now\n\n"

# ./minifab install -n mycc -l node
# ./minifab approve,commit
# ./minifab initialize -p '"init"'
# ./minifab discover
# ./minifab explorerup
# minifab invoke -p  '"query", "a"'

# minifab install,approve,commit,initialize -n mycc -v 1.1 -p '"init", "a", "200"'



# Setup initial state

# minifab invoke -p '"issue", "1", "2021-01-01", "2022-01-01", "1e6"'
# minifab invoke -p  '"query", "tokenIDCounter"'
# minifab invoke -p '"sendToBeneficiary", "1", "Ezequiel"'
# minifab invoke -p  '"query", "MEC_1"'


# minifab invoke -p '"getBalance", "mec-example-com"'
# minifab invoke -p '"sendTokens", "mec-example-com", "Arthur", "1200"'
# minifab invoke -p '"getBalance", "Arthur"'
# minifab invoke -p '"getBalance", "mec-example-com"'
# minifab invoke -o student.example.com -p '"issue", "26-09-2021", "26-09-2022", "500"'
# minifab invoke -o mec.example.com -p '"issue", "26-09-2021", "26-09-2022", "500"'
# minifab invoke -p '"showIdentity"'
# minifab invoke -p '"getHist", "UTXOLIST"'
