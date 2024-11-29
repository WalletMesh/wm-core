#!/usr/bin/env bash

TEMPLATE_DIR=packages/template

if [ $# -ne 1 ]; then
    echo "Create a new package in packages/<name> with the package name @walletmesh/<name>"
    echo
    echo "Usage: ./$0 <name>"
    exit 1
fi

if echo "$1" | egrep -q "[^a-z0-9-]"; then
    echo "Invalid characters in name"
    exit 1
fi

NAME=$1
PACKAGE_DIR=packages/$NAME
PACKAGE_NAME=@walletmesh/$NAME

if [ -d $PACKAGE_DIR ]; then
    echo "Package $PACKAGE_DIR already exists"
    exit 1
fi

mkdir -p $PACKAGE_DIR

# copy template files
cp -r $TEMPLATE_DIR/* $PACKAGE_DIR

# overwrite the package.json with the desired package name
jq ".name = \"$PACKAGE_NAME\"" $TEMPLATE_DIR/package.json > $PACKAGE_DIR/package.json

tmpfile=$(mktemp)
# update devcontainer.json with mount for the package's node_modules folder
jq ".mounts += [{\"source\": \"wm-core-packages-$NAME-node-modules-\${devcontainerId}\",\"target\": \"\${containerWorkspaceFolder}/packages/$NAME/node_modules\", \"type\": \"volume\"}]" .devcontainer/devcontainer.json > $tmpfile
mv $tmpfile .devcontainer/devcontainer.json

echo "Package $PACKAGE_NAME created in $PACKAGE_DIR"
echo "Rebuilding the devcontainer is recommended to pick up the $PACKAGE_DIR/node_modules mount that was added to .devcontainer/devcontainer.json"
