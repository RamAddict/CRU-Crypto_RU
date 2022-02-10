#!/bin/bash
cd client
pnpm i
xdg-open http://localhost:3000/login
pnpm run dev
cd ..