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
minifab install,approve,commit,invoke -d false -n mycc -l node -v 1.$CODE_VERSION  -y 'OutOf(2, "mec-example-com.member", "student-example-com.member", "ufsc-example-com.member")' -p '"getBalance", "mec-example-com"'
export CODE_CVERSION=$CODE_VERSION
echo $CODE_CVERSION
