# Foundry Mobile Companion

Foundry Mobile Companion is a portrait-first touch interface for **Foundry VTT** worlds running **DnD5e**. It replaces the standard Foundry interface only for supported mobile clients, while desktop clients continue to use normal Foundry unchanged.

The module has two automatic modes:

- **Player Companion** for Player and Trusted Player accounts: a compact character-sheet, chat, combat, journal, and audio experience.
- **DM Companion** for GM and Assistant GM accounts: a mobile control surface for combat, actors, scenes, players, journals, playlists, and Monk's TokenBar requests.

It is a Foundry module, not a separate service or mobile app. Install it in a world, connect from an Android phone or iPhone, and the matching mobile interface is enabled for that client. A Settings action can temporarily return a client to the standard Foundry UI until the next page reload.

Author: **HornedPriestess**



## What Players Can Do

- Choose between actors their Foundry account can access and switch characters at any time.
- Use compact Character, Favorites, Spells, Inventory, Features, Combat, Chat, Journal, Audio, and Settings tabs.
- Roll DnD5e ability checks, skills, saving throws, death saves, initiative, attacks, item actions, and spells with normal, advantage, or disadvantage modes.
- View item, spell, feature, and linked-document details in mobile modals without leaving the active sheet.
- Edit permitted character data, including spell slots, currency, notes, prepared state, equipped/attuned state, HP-related fields, and journal pages where Foundry permissions allow it.
- Manage Inspiration, short rest, long rest, and death-save success/failure marks.
- Create favorites for weapons, items, spells, skills, and features.
- Read and send chat messages, collapse long card descriptions, use the mobile dice widget, and trigger supported DnD5e roll-card actions.
- Follow combat, roll initiative for owned combatants, and end an available turn.
- Browse, create, edit, move, and organize accessible Journal Entries and pages.
- Control local Music, Environment, and Interface volume independently from other users.

## What GMs Can Do

- Use Dashboard, Combat, Actors, DM TokenBar, Scenes, Chat, Journal, Players, Audio, and Settings tabs.
- Pause or resume the game from Dashboard and monitor current global audio.
- Create, start, and manage combat encounters; add or remove combatants; edit initiative, HP, temporary HP, damage/healing, visibility, and conditions; and advance any combatant's turn.
- Browse Actors by Foundry folder, search actors, change folders and ownership, and open compact NPC/player sheets.
- Use mobile NPC statblocks with Overview, Statblock, Inventory, Spellbook, and Biography sections when data exists. Actions, abilities, skills, saves, spells, and item actions can be rolled from the sheet.
- Browse Scenes by folder with previews, view a scene, activate it, and open its standard Foundry configuration sheet.
- Browse Players, open their assigned character, whisper them, send a roll request, and request a kick back to the Foundry join screen when the server API permits it.
- Manage Journal Entry folders, entries, pages, ownership, and permissions.
- Organize Playlist folders, create playlists, move playlists, add tracks by Foundry path or URL, and control per-track playback and volume.

## Monk's TokenBar Integration

When [Monk's TokenBar](https://github.com/ironmonk108/monks-tokenbar) is active, DM Companion adds a dedicated request panel for assigned player characters and active-scene tokens.

- Ability Check, Skill Check, and Saving Throw requests can offer one or more choices; players select the offered check before rolling.
- Contested Rolls assign a specific check to each participant, without a player-side choice prompt.
- Requests support public or whisper visibility and optional DC display.
- Mobile Chat renders TokenBar request and result cards, including roll formulas, DC states, contest outcomes, and direct player roll controls.
- GM result buttons synchronize success/failure state with native TokenBar message flags, so the mobile and desktop cards stay aligned.

## Optional D&D 2024 PDF Exporter Integration

When [D&D 2024 PDF Exporter](https://github.com/LittleRainbowFox/dnd5e-2024-pdf-exporter) is active, Settings includes a character PDF download action. The exporter controls the PDF layout and details dialog; Foundry Mobile Companion provides a mobile-safe way to open that workflow.

## Interface, Layout, and Localization

- Automatic Android/iPhone detection, plus a client setting to force the mobile interface for desktop testing.
- Six client-side color themes: Ember, Arcane, Forest, Frost, Crimson, and Sunlit.
- English, Russian, and Spanish mobile UI localization.
- Full navigation, Main + Drawer, and Grouped navigation layouts. Grouped navigation separates character/world controls for players and DM workflows for GMs.
- Mobile-safe modals, chat toasts, and viewport-warning suppression when the on-screen keyboard opens.
- Logout and a temporary return-to-standard-Foundry action.

## Compatibility

- Foundry VTT v14 build 363
- DnD5e system 5.3.3
- Player, Trusted Player, GM, and Assistant GM accounts
- Portrait-oriented Android and iPhone browsers

## Current Limits

- The module does not provide a mobile canvas or token-placement interface.
- Landscape-first layouts, offline play, Android APK packaging, and non-DnD5e systems are not supported.
- Some actions intentionally defer to the installed system or module UI when their workflow depends on a third-party dialog or unavailable Foundry API.

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

## Changelog

### 0.8.3

- Improved mobile multi-choice TokenBar request layout.
- Expanded Audio playlist action controls for touch use.
- Fixed contested-roll winner indicators for Monk's TokenBar `won` results.
- Synced mobile TokenBar success/failure toggles with native Monk's TokenBar message flags.
- Hidden irrelevant `DC 0` labels from contested-roll cards.

### 0.8.2

- Added multi-option Monk's TokenBar requests for Ability Checks, Skill Checks, and Saving Throws. Players choose one offered option before rolling.
- Kept contested-roll requests fixed to the GM-selected check for each participant.
- Added GM result-state cycling on TokenBar card results: neutral, success, failure, then neutral.
- Removed extracted auxiliary TokenBar card controls from mobile Chat.
- Reworked Kick Player fallback handling to avoid the reserved Socket.IO `disconnect` event.
- Added playlist folders, playlist creation, folder editing, playlist moves, and audio track creation from a Foundry file path or URL.
- Applied the selected theme to mobile Chat message and roll-card backgrounds.

### 0.8.1

- Expanded Russian and Spanish localization for mobile views, DM controls, modal dialogs, Audio/playlist controls, form labels, placeholders, and accessibility labels.
- Fixed DC visibility in the mobile Monk's TokenBar card: visible DC is shown to all permitted viewers, hidden DC remains visible to GMs only.
- Fixed native Monk's TokenBar request payloads so they create standard TokenBar cards immediately instead of opening the desktop request window.
- Fixed mobile fallback roll messages to use Foundry's `rollMode` option and serialized roll data.
- Removed the reserved `disconnect` socket event from Kick Player fallback handling.

### 0.8.0

- Improved Monk's TokenBar API discovery and target resolution for native roll and contested-roll requests.
- TokenBar messages are now recognized by their Monk's TokenBar flags in mobile Chat, including cards without the module's usual HTML classes.
- Fixed public fallback roll requests by omitting the whisper field entirely.
- Added mobile TokenBar actor reconstruction from module flags when chat markup does not contain actor rows.
- Replaced the browser confirmation used by Kick Player with a mobile confirmation dialog and added disconnect fallback handling.
- Added DM playlist browsing with expandable playlists, per-track play/stop controls, and global per-track volume editing.

### 0.7.9

- DM TokenBar now prefers native Monk's TokenBar requests, so request cards and results are synchronized with the standard Foundry interface.
- Added roll-card visibility selection: whisper targets and GMs, or show to everyone.
- Added an option to show or hide DC on check request cards.
- Added independent ability/skill selection for each side of a contested roll.
- Added folder delete confirmation. Direct contents move to Unsorted and child folders move to the root.
- Improved kick handling with Foundry user kick/disconnect compatibility fallbacks.
- Moved Player grouped-navigation selectors to the bottom row, matching the DM grouped layout.

### 0.7.8

- Fixed empty Actor, Scene, and Journal folders so they remain visible and can be opened immediately after creation.
- Positioned roll and item-use popups directly above the Chat navigation button instead of in the center of the screen.
- Fixed the Scene Settings action so the native Foundry scene configuration window is rendered above the mobile interface.
- Reworked mobile permission controls to fit narrow phone screens.
- Added Journal Entry folder moves from the mobile Journal list.
- Added Actor owner/permission management from the mobile Actors list.
- Added DM TokenBar request creation for assigned player characters and active-scene tokens.
- Added ability check, skill check, saving throw, and contested-roll request flows in the DM TokenBar tab.

### 0.7.7

- Fixed DM scene previews by rendering actual scene preview images in the mobile scene list.
- Reduced scene popup actions to View, Activate, and Settings.
- Added folder creation for Actors, Scenes, and Journal Entries.
- Added generic whisper recipient selection for player-to-player, player-to-GM, GM-to-player, and GM-to-GM whispers.
- Fixed basic mobile roll request buttons with a global handler that also works from the standard Foundry chat.
- Centered mobile roll/item toast popups instead of anchoring them to the bottom chat tab.
- Suppressed known external token/action hover menus while the mobile interface is active.
- Added mobile language selection with English, Russian, and Spanish options.
- Added Russian and Spanish module setting translation files.

### 0.7.6

- Added DM Scenes list with folder grouping, scene previews, and per-scene popup action menus.
- Added scene View, Activate, navigation visibility toggle, Show Players, and Preload actions.
- Added DM Players list actions for opening assigned characters, sending whispers, sending basic roll requests, and requesting kick/return to join screen when supported by Foundry.
- Added Journal creation and ownership editing from the mobile Journal tab.
- Added player-to-GM whisper action in mobile Chat.
- Added clickable Roll buttons to basic DM roll request whispers.
- Replaced broken Habitat display with damage resistances, damage immunities, and condition immunities in the DM actor overview.
- Improved DM combat ordering by using combat turn data with initiative, initiative modifier, and natural-name tie sorting.
- Improved scene preview source detection for mobile scene rows.
- Fixed DM actor sheet child dialogs so item cards, linked documents, and roll dialogs stay above the actor sheet instead of closing it.
- Fixed combat status refresh after active effect changes.
- Centered linked-document popups opened from chat.
- Fixed combatant initiative advantage/disadvantage buttons so they roll 2d20 keep-high/keep-low instead of normal initiative.
- Fixed combat status rendering to use actual active effect statuses instead of derived status sets that could show false statuses.
- Fixed condition toggle active state detection.
- Fixed item, feature, and spell description cards from the DM actor sheet so they open as stacked cards without closing the main actor sheet.
- Fixed habitat display for structured DnD5e data.
- Improved natural sorting for folders and journal entries so numbered names sort as 1, 2, 3, 10.
- Adjusted stacked mobile modals to render above their parent actor sheet.

### 0.7.5

- Added initiative roll options from the combatant initiative control: normal, advantage, and disadvantage.
- Added a Start Combat action while a combat exists but has not been started.
- Improved manual initiative updates by using Foundry's combat initiative API when available.
- Added dynamic combatant create/delete hooks for tracker refreshes.
- Added visible combatant status icons in the DM combat tracker.
- Made combatant names open the mobile DM actor sheet.
- Replaced missing initiative dashes with a d20 icon.
- Reworked Add Combatant to use the actor folder tree.
- Changed DM Actors rows to open sheets from actor names and use the right-side button for folder moves.
- Added actor folder move UI.
- Added Add to Combat action to the mobile DM actor sheet footer.
- Added a DM actor Overview tab with speed, senses, languages, habitat, and core stats.
- Grouped actor skills by ability in the DM statblock.
- Added legendary action/resistance display when present.
- Made DM statblock sections collapsible.
- Added item/feature/spell description viewing from the DM actor sheet.
- Added Journal folder grouping.

### 0.7.4

- Added DM Combat controls for creating/stopping combat, next turn, per-combatant end turn, initiative editing, hide/show, removal, and NPC initiative rolls.
- Added combatant HP/temp HP editing and damage/heal adjustment.
- Added condition toggles for combatant actors.
- Added add-combatant flow from readable actors.
- Added collapsible Actor and Scene folder trees.
- Added mobile DM actor sheet with Statblock, Inventory, Spellbook, and Biography tabs.
- Added DM actor statblock ability checks, saving throws, skill checks, and item/action use buttons.

### 0.7.3

- Added a DM Dashboard pause/resume button for the global game pause state.
- Moved the Players tab into the DM Tools group.
- Reworked the DM Actors tab to display actors grouped by Foundry actor folders, including an Unsorted section.
- Added a DM Actors search toggle in the header with live filtering.

### 0.7.2

- Fixed grouped DM navigation after opening Settings so the upper grouped row no longer sticks on Audio.
- Kept Tools focused on the Audio tool while Settings acts as its own bottom navigation action.
- Added an empty DM TokenBar tab as a placeholder for the planned 0.7.8 roll request tools.

### 0.7.1

- Fixed full DM navigation width so all tabs fill the available bottom bar.
- Adjusted grouped DM navigation to keep the main selector row at the bottom and include Settings there.
- Hid Dashboard Quick Links for now while keeping the code path for a future dashboard setting.
- Changed DM audio controls to use explicit play and stop actions for current global playlist sounds.

### 0.7.0

- Added automatic mobile DM companion mode for GM and Assistant GM users.
- Added DM Dashboard with active scene, combat, online players, recent chat, quick links, and current audio.
- Added DM navigation shell for Combat, Actors, Players, Scenes, Chat, Journal, Audio, and Settings.
- Added current global playlist sound play/stop controls for DM mode.
- Added initial DM shell lists for actors, players, and scenes.

### 0.6.1

- Added a Settings button to download the active character through D&D 2024 PDF Exporter.
- Declared D&D 2024 PDF Exporter as an optional recommended module.
