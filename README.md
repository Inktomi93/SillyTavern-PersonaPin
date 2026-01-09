# Persona Pin

Locks `{{user}}` in character cards to the persona that opened each chat.

## The Problem

You start a chat as "John". Character card says `{{user}} is my brother`. Later you switch to "Sarah" temporarily. Now the character thinks "Sarah is my brother".

## The Solution

This extension pins "John" to that chat. Character cards always reference "John" regardless of your current persona.

## How It Works

1. When you open a chat, the current persona gets pinned to that chat
2. Before each generation, `{{user}}` in character fields gets replaced with the pinned persona
3. After generation, the original character data is restored

Affects: description, personality, scenario, first message, examples, lorebook.

## Installation

```bash
cd public/scripts/extensions/third-party/
git clone https://github.com/inktomi/SillyTavern-PersonaPin
cd SillyTavern-PersonaPin
npm install && npm run build
```

Restart SillyTavern, enable in Extensions.

## License

AGPLv3
