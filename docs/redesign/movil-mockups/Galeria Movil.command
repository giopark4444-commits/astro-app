#!/bin/zsh
cd "$(dirname "$0")"
( sleep 1; open "http://localhost:8423" ) &
python3 -m http.server 8423
