cd /home/arthur/mywork
minifab cleanup -o mec.example.com 
minifab up -o mec.example.com -y 'OutOf(2, "mec-example-com.member", "student-example-com.member", "ufsc-example-com.member")' -e true  -n mycc -l node
minifab create -c mainchannel
minifab join,channelquery,channelsign

echo "Done setting up docker and channel"

cd node/src
npm install
pnpm build
cd ../../


echo "built code, will try to install it now"

minifab install -n mycc -l node
minifab approve,commit,initialize -p '"init"'
minifab discover
# minifab invoke -p  '"query", "a"'

# minifab install,approve,commit,initialize -n mycc -v 1.1 -p '"init", "a", "200"'



# Setup initial state

minifab invoke -p '"issue", "1", "2021-01-01", "2022-01-01", "1e6"'
minifab invoke -p  '"query", "MEC_1"'
minifab invoke -p '"sendToBeneficiary", "1", "Ezequiel"'
minifab invoke -p  '"query", "MEC_1"'
