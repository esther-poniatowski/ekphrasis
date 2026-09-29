---
tags:
  - guide
index: "[User guide](docs/guide/_index.md)"
aliases:
  - Installation
---
# Installation

Ekphrasis installs into the plugin folder of a vault by one of three routes: a published release, the BRAT plugin, or the source code.

## Prerequisites

The plugin requires Obsidian 1.5.0 or later. The vault must not enable YAML Databases together with ekphrasis, because of the [conflict between the two plugins](../existing-plugins.md#^yaml-databases-conflict).

## Installation from a release

To install a published version, the author copies the three files of a release into the plugin folder of the vault:

1. Download the plugin bundle `main.js`, the manifest `manifest.json` and the style sheet `styles.css` from the latest release.
2. Copy the three files into the folder `.obsidian/plugins/ekphrasis/` of the vault.
3. Enable *Ekphrasis* in *Settings → Community plugins*.

## Installation with BRAT

To follow the development versions, the author installs ekphrasis through the BRAT plugin. BRAT installs the plugin from the repository of ekphrasis and keeps the plugin updated. The author proceeds in three steps:

1. Install and enable the BRAT plugin.
2. Add the repository `https://github.com/esther-poniatowski/ekphrasis` as a beta plugin in the settings of BRAT.
3. Enable *Ekphrasis* in *Settings → Community plugins*.

## Installation from source

To modify the plugin, the author builds the bundle from the source code and links it into a vault, following the [development setup](../../CONTRIBUTING.md).
