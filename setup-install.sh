#!/usr/bin/env bash
set -e

# install nvm, node and pnpm
source ./setup-nvm.sh
nvm install
corepack enable
