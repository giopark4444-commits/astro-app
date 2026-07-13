#!/bin/zsh
# Galería de las 6 direcciones de desktop (R4) — doble clic para abrir.
cd "$(dirname "$0")"
lsof -ti:8430 >/dev/null 2>&1 || (python3 -m http.server 8430 >/dev/null 2>&1 &)
sleep 1
open "http://localhost:8430"
