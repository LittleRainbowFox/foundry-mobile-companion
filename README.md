# Foundry Mobile Companion

`foundry-mobile-companion` is a portrait-first mobile player interface for Foundry VTT.

The module replaces the standard player UI on phones with a compact companion layout for character sheets, rolls, chat, journal pages, combat, audio, and selected DnD5e workflows.

Author: **HornedPriestess**

## Compatibility

- Foundry VTT v14 build 363
- DnD5e system 5.3.3
- Player and Trusted Player users
- Portrait mobile browsers

## Optional Module Support

Foundry Mobile Companion includes mobile support for:

- Monk's TokenBar (`monks-tokenbar`)

The integration supports mobile roll request cards, contested rolls, DC checks, multi-option roll prompts, and success/failure result display.

## Features

- Automatic mobile detection for Android and iPhone clients
- Actor picker and actor switching
- Character, Favorites, Spells, Inventory, Features, Combat, Chat, Journal, Audio, and Settings views
- DnD5e ability, skill, save, death save, item, and spell roll support
- Mobile roll dialogs for advantage, normal, and disadvantage rolls
- Spell slot and currency editing
- Favorites for items, spells, skills, and features
- Combat tracker with initiative and end-turn controls
- Chat viewing, sending, dice rolling, and roll-card action forwarding
- Monk's TokenBar request and contested-roll support
- Journal page viewing, editing, and text page creation
- Local audio mixer for Music, Environment, and Interface volume
- Multiple mobile navigation layouts
- Client-side theme selection
- Logout and temporary return to standard Foundry UI

## Installation

Install using this manifest URL:

```text
https://raw.githubusercontent.com/LittleRainbowFox/foundry-mobile-companion/main/module.json
```

Or download the release zip and extract it into:

```text
FoundryVTT/Data/modules/foundry-mobile-companion
```

Then enable **Foundry Mobile Companion** in the world.

## Desktop Testing

For desktop testing, enable the client setting **Force mobile interface on this client** in Configure Settings.

## Scope Notes

- This is a player-focused mobile interface.
- Canvas/scene view is intentionally not included yet.
- Offline mode and Android APK packaging are not included yet.
- Non-DnD5e systems are not supported yet.
- Landscape layout is not supported yet.
