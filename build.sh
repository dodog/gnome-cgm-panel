#!/bin/bash
cd gnome-cgm-panel@bramgn-on-github
VERSION=$(grep -oP '(?<="version": )[0-9]+' metadata.json)
zip -r ../gnome-cgm-panel-v${VERSION}.zip *
