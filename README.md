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

## Changelog

### 0.6.0

- Prepared the module for public GitHub distribution.
- Updated package metadata with HornedPriestess as author.
- Added public manifest and release download URLs.
- Declared optional Monk's TokenBar support.

### 0.1.1

- Added a placeholder Chat tab.
- Removed the Resources block from the Character tab.
- Added a custom mobile roll modal and fallback ability/skill/save rolls.
- Added a mobile item/spell details modal with description and quick editable fields.
- Added broader item/spell use fallbacks for DnD5e item methods and activities.
- Suppressed Foundry's mobile viewport-size warning while the companion UI is active.

### 0.1.2

- Removed Prepared and Uses controls from spell list rows.
- Kept Prepared editing inside the spell details modal.
- Changed spell and item Use to prefer native DnD5e configuration dialogs.
- Added mobile layering for native Foundry/DnD5e dialogs above the companion UI.
- Reworked Spell Slots into a compact sticky top bar with `current/max` display.

### 0.1.3

- Character ability, save, and skill rolls now prefer native DnD5e roll dialogs before falling back to simple rolls.
- Item and spell descriptions now use Foundry HTML enrichment for content links, inline rolls, and document links.
- Content links inside descriptions open in a mobile popup.
- Item/spell details footer now uses Favorite, Use, and Close actions instead of Save.
- Item fields in details auto-save on change.
- Spell rows now show Use on the right and no edit button.
- Inventory rows now show compact non-editable Qty/Uses/equipment metadata.

### 0.1.4

- Hardened ability, save, and skill fallback rolls with robust DnD5e modifier parsing.
- Added a compact sticky currency bar to the Inventory tab.
- Added first functional Chat tab with message viewing and simple message sending.
- Added chat message updates to the mobile render hooks.
- Improved mobile handling for Foundry content links and background sheet interception.

### 0.1.5

- Replaced character checks with a custom mobile roll dialog styled after DnD5e checks.
- Added Advantage, Normal, and Disadvantage roll buttons directly in the mobile roll dialog.
- Collapsed long chat card content by default with an expand/collapse control.
- Reduced chat card image sizes for mobile readability.
- Added a bridge that attempts to forward mobile chat card button presses to the original Foundry chat card actions.

### 0.1.6

- Made mobile roll dialog buttons use the module-wide click handler for more reliable mobile taps.
- Added safer Foundry v14 roll evaluation and chat-message creation fallbacks.
- Improved chat-card action forwarding by matching original Foundry buttons by dataset/action before falling back to position.
- Added a CSS.escape fallback for mobile browsers.

### 0.1.7

- Updated mobile character rolls to use Foundry v14 roll evaluation and `messageMode` chat delivery.
- Removed the old `rollMode` retry path that could break roll message creation in v14.
- Let chat-card action links pass through the mobile action bridge instead of being treated as document links first.
- Made the ChatMessage fallback omit undefined roll message types.

### 0.1.8

- Character ability, save, and skill buttons now prefer native DnD5e 5.x roll dialogs using object configs.
- Kept legacy actor roll signatures as fallback for older-compatible methods.
- Chat card buttons without module-specific data are now captured inside the mobile chat view.
- Added native DnD5e activity handling for mobile chat Attack and Damage buttons via message activity/item flags.

### 0.1.9

- Chat messages now show a useful title from roll flavor, DnD5e roll flags, card title, or author.
- The Chat tab scrolls to the newest messages after rendering.
- Card buttons are extracted from collapsed chat content and rendered in a visible action row below the description.

### 0.1.10

- Chat card action extraction now ignores inline dice/formula buttons from descriptions.
- Measured template placement buttons are suppressed in the mobile chat view for now.
- Chat scrolling now retries after layout and image loading time so the newest messages are shown more reliably.
- Added a small roll result popup above the Chat nav button when rolls arrive while another tab is open.

### 0.1.11

- Reworked death saves into skull and heart pips with a central d20 death-save roll button.
- Death save pips can now be toggled directly from the mobile Character tab.
- Chat scrolling now also scrolls the main mobile container and anchors to the newest visible message.
- Item and spell use now shows a compact Chat-nav popup with the item name when another tab is open.
- Added a mobile dice widget next to the chat input, plus `/r` and `/roll` formula support.

### 0.1.12

- Death save failures now fill from right to left.
- Replaced the inline chat dice row with an overlay dice roller popup.
- Grouped skills by their governing ability with compact icon rows.
- Added a translucent scroll-to-bottom button for chat when the user is above the newest messages.
- Added Short Rest and Long Rest buttons to the Character tab.
- Added faint background icons to AC, proficiency, and speed stat tiles.
- Added six client-side theme color presets in Settings.

### 0.1.13

- Prevented mobile keyboard resize from triggering a full companion UI re-render while text input is focused.
- Expanded suppression of Foundry's minimum viewport warning across notifications, DOM mutations, focus, window resize, and visual viewport resize.

### 0.1.14

- Dice roller formula input now starts empty.
- Dice roller `+` and `-` controls now modify the formula directly, defaulting to `1d20+1` or `1d20-1` from an empty field.

### 0.1.15

- Added editable currency fields to the Inventory coin bar.
- Added a Favorites tab.
- Added favorite toggles for actor items and skills.
- Favorites can now show spells, weapons, inventory items, features, and skill rolls.
- Preserved compatibility with previously saved favorite items.

### 0.1.16

- Split Favorites into Weapons & Items, Spells, and Skills & Features sections.
- Added spell slot display to the Favorites spell section.
- Hid weapon quantity, uses, equipped, and attuned metadata in Favorites.
- Hid spell uses metadata in Favorites.
- Moved the Inventory favorite star next to the item name and kept Use in the action row.

### 0.3

- Added a Journal tab for viewing accessible Journal Entries in the mobile UI.
- Started the Audio tab with local Music, Environment, and Interface volume controls.
- Added a compact Now Playing summary for active playlist sounds.
- Extended mobile chat-card action extraction for Monk's TokenBar roll requests, saving throws, contested rolls, and grab/assign roll buttons.

### 0.3.1

- Added compact mobile rendering for Monk's TokenBar contested/request roll cards with smaller action buttons and inline roll results.
- Hid the Sequencer database journal from the mobile Journal list.
- Changed Journal opening to show page names first, then open individual page contents.
- Added text Journal page editing for users with edit permission.

### 0.3.2

- Removed sticky positioning from the Inventory currency bar while keeping coin display and editing unchanged.

### 0.3.3

- Added row-level Monk's TokenBar roll buttons to compact contested/request roll cards.
- Changed Chat scroll-to-bottom behavior to treat the compose field as the bottom of the tab.
- Changed the Features navigation icon so it no longer matches Favorites.
- Added an editable Inspiration toggle to the Character tab.

### 0.3.4

- Restored cleaner Monk's TokenBar contested card rows by keeping completed roll results as result pills.
- Forced mobile TokenBar row roll controls to render as visible d20 buttons instead of blank cloned controls.
- Expanded TokenBar roll detection to cover rollable actor/token rows and dice-roll elements.
- Improved contested row name cleanup when actor names and roll totals are duplicated in the source card.

### 0.3.5

- Hid generic roll formula blocks under Monk's TokenBar mobile cards.
- Filtered numeric roll-result rows out of compact TokenBar actor lists.
- Forwarded TokenBar d20 taps with pointer, mouse, and click events to better match the original card handlers.

### 0.3.6

- Changed Monk's TokenBar d20 buttons to use the companion's mobile roll flow instead of relying on hidden source-card click handlers.
- Added parsing for TokenBar ability, save, and skill request labels such as Strength Ability Check.
- TokenBar roll buttons now open the same native/mobile roll dialogs used by Character ability and skill checks.

### 0.3.7

- TokenBar mobile rolls now send their result back through Monk's TokenBar `rollability` socket flow.
- TokenBar request rolls no longer create a separate standalone chat roll message from the mobile fallback path.
- Added lookup of `flags.monks-tokenbar.token<ID>` entries by actor so the result is attached to the correct request-card row.

### 0.3.8

- TokenBar d20 buttons now keep working even if the Monk's TokenBar slot lookup fails, falling back to a normal roll message.
- Added direct `data-tokenbar-token-id` capture while rendering TokenBar rows so results can be attached by token id instead of actor-name matching.
- Improved TokenBar actor resolution for rows that display token names instead of actor names.

### 0.3.9

- TokenBar d20 clicks are now handled before generic chat-card forwarding so fallback roll buttons cannot silently do nothing.
- TokenBar request rolls now infer actor, token id, and roll type from the rendered card when button dataset fields are missing.
- If a TokenBar result cannot be attached to the request card, the button still opens the mobile roll flow and creates a normal roll message.

### 0.3.10

- Added direct click and touch binding for TokenBar d20 buttons after chat render so visible buttons do not depend only on delegated shell clicks.
- Routed delegated and direct TokenBar taps through the same guarded handler to avoid duplicate rolls.
- Added a fallback that triggers the original Monk's TokenBar source-card button when the mobile TokenBar roll path cannot identify or complete the request.

### 0.3.11

- Added document-level capture handling for mobile TokenBar d20 taps so Foundry/chat-card handlers cannot swallow the event before the companion sees it.
- Added a short visible `TokenBar roll` tap indicator to confirm that the mobile handler received the tap during testing.

### 0.3.12

- Fixed TokenBar taps failing before the dialog opened when a rendered roll button did not carry `data-actor-id`.
- Added a top-level TokenBar tap error guard so early failures now surface as a visible warning instead of silently stopping after the tap indicator.
- Included Monk's TokenBar message flags in roll-request detection to improve ability/save/skill inference from compact mobile cards.

### 0.3.13

- Removed silent early fallback to the original Monk's TokenBar source button when the mobile request could not be identified.
- TokenBar d20 taps now always open the mobile roll dialog for an owned actor, falling back to a Strength check if the request text cannot be parsed.
- TokenBar mobile roll failures now still attempt the original source button, but no longer hide the failure warning.

### 0.3.14

- Fixed mobile roll dialogs failing in Foundry v14 when `CONFIG.Dice.rollModes` entries are objects instead of localization strings.
- Roll Mode selects now support both legacy string values and v14 object values.

### 0.3.15

- Added multi-option TokenBar roll detection for requests such as Perception Check, History Check, or Intimidation Check.
- TokenBar d20 taps now show a mobile "Please pick a roll" dialog when a request contains multiple possible checks.
- Roll choices display the selected actor's current modifier before opening the normal mobile roll dialog.

### 0.4.0

- TokenBar contested rolls now mark the highest single result as success and lower results as failure.
- TokenBar DC checks now mark results at or above the DC as success and lower results as failure.
- Success and failure results are shown with green/red result backgrounds and check/cross markers.
- TokenBar result rows now show a compact roll summary such as `7+3=10` when roll details can be inferred.

### 0.4.1

- TokenBar result coloring now prefers the original Monk's TokenBar success/failure state from the desktop card or message flags.
- GM-overridden success/failure states are preserved in the mobile card instead of being recalculated from totals first.
- DC checks without an explicit DC now remain neutral instead of being colored automatically.

### 0.4.2

- Added client-selectable navigation layouts: Full, Main + Drawer, and Grouped.
- Added drawer main-tab customization in Settings.
- Added Character/Foundry grouped navigation mode.
- Added a Logout button to Settings.

### 0.4.3

- Changed the default navigation layout to Main + Drawer while preserving any player-selected layout.
- Grouped Foundry navigation now stretches its tabs across the full bottom menu width.
- Drawer navigation now keeps one bottom row when many main tabs are selected by shrinking tab controls.
- Journal entries can now create new text pages from the mobile page list.
- Journal page editing now uses plain text instead of exposing raw HTML tags.
