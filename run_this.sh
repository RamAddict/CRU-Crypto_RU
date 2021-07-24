cd /home/arthur/mywork
minifab cleanup
minifab up -o mec.example.com -y 'OR("mec-example-com.peer")'
minifab create -c mainchannel
minifab join,channelquery,channelsign -n mycc -l node

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
