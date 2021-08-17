cd /home/arthur/mywork
minifab cleanup -o mec.example.com 
minifab up -o mec.example.com -y 'OutOf(2, "mec-example-com.member", "student-example-com.member", "ufsc-example-com.member")'  -n mycc -l node
# blows up with minifab up for some reason
minifab create -c mainchannel
minifab join,channelquery,channelsign
# read -p "continue?"
echo "Done setting up docker and channel"

cd node/src
npm install
pnpm build
cd ../../


echo -e "\n\nbuilt code, will try to install it now\n\n"

minifab install -n mycc -l node
minifab approve,commit,initialize -p '"init"'
minifab discover
# minifab invoke -p  '"query", "a"'

# minifab install,approve,commit,initialize -n mycc -v 1.1 -p '"init", "a", "200"'



# Setup initial state

# minifab invoke -p '"issue", "1", "2021-01-01", "2022-01-01", "1e6"'
minifab invoke -p  '"query", "tokenIDCounter"'
# minifab invoke -p '"sendToBeneficiary", "1", "Ezequiel"'
# minifab invoke -p  '"query", "MEC_1"'
