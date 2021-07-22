cd /home/arthur/mywork
minifab cleanup
minifab up -o mec.example.com
minifab create -c mainchannel
minifab join,channelquery,channelsign

echo "Done setting up docker and channel"

cd node/src
npm install
pnpm build
cd ../../


echo "built code, will try to install it now"

minifab install -n mycc -l node
minifab approve,commit,initialize # -p '"init"'
minifab discover
# minifab invoke -p  '"query", "a"'

# minifab install,approve,commit -n mycc -v 1.1 '"init", "a", "200"'
