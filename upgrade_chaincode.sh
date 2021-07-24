#!/bin/bash
# run with source"!!!
cd /home/arthur/mywork
echo "compiling before upgrade"

cd node/src
npm install
pnpm build
cd ../../

CODE_VERSION=${CODE_CVERSION:-1}

CODE_VERSION=$((CODE_VERSION+1))
echo $CODE_VERSION
minifab install,approve,commit,initialize -n mycc -v 1.$CODE_VERSION -p '"init", "a", "200"'
export CODE_CVERSION=$CODE_VERSION
echo $CODE_CVERSION
