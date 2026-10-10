# Redstone Compiler

Redstone Compiler is a browser-based redstone building and simulation editor for Minecraft Bedrock Edition. Build circuits in a 3D workspace, run Bedrock-style command scripts, inspect block states, and import or export structures.

## Getting started

1. Open `index.html` in a modern browser. The 3D editor and Ace Editor load from a CDN, so an internet connection is needed for those libraries.
2. Enter one command per line in the command editor and press **Run** or `Ctrl+Enter`.
3. Use **Clear & Run** to clear the simulated world and run the current script. Use **Clear world** to clear the scene without running a script.
4. Click or tap interactive blocks to operate them. Right-click or touch-and-hold a block to open its context menu.
5. Open **File** to import or export commands and structures. Use **Structures** to manage named structures in the editor.

## Commands supported by the simulator

The local simulator implements a focused subset of Minecraft Bedrock commands:

- `/setblock <x> <y> <z> <block>[state=value] [replace|keep]`
- `/fill <x1> <y1> <z1> <x2> <y2> <z2> <block> [replace|destroy|keep|hollow|outline]`
- `/clone <x1> <y1> <z1> <x2> <y2> <z2> <destination> [replace|masked] [normal|move]`
- `/structure save <name> <from x y z> <to x y z>`
- `/structure load <name> <x> <y> <z> [rotation] [mirror]`
- `/structure delete <name>`
- `/summon armor_stand <x> <y> <z>`
- `/kill @e`
- `/time set <ticks|day|sunrise|noon|sunset|night|midnight>`
- `/time add <ticks>`
- `/time query <daytime|gametime|day>`
- `/gamerule doDaylightCycle <true|false>`

Coordinates support standard separated values, such as `~ ~1 ~`, and compact coordinates commonly produced by structure-to-function converters, such as `~0~1~0`.

Commands execute from the first line to the last. Place support blocks before components that depend on them when order matters. A command that is valid in Minecraft may not be simulated locally if it is outside the supported list.

`/clear` is a valid Minecraft Bedrock command that clears a player's inventory. Player inventory is not simulated, so this command reports that limitation rather than clearing the build. Use **Clear world** or **Clear & Run** to clear the editor's simulated world.

For the full command reference, see the official [Minecraft Bedrock Command Reference](https://learn.microsoft.com/en-us/minecraft/creator/commands/?view=minecraft-bedrock-stable).

## Import and export

- **Import `.mcfunction` or `.txt`:** loads command text into the command editor.
- **Import `.mcstructure`:** reads a native Bedrock structure into the editor's structure library.
- **Import `.json`:** loads normalized structure JSON into the structure editor.
- **Export `.mcfunction`:** downloads the command script with editor-only `<js>` blocks removed.
- **Export `.mcstructure`:** writes the authored block layout and native Bedrock palette states, rather than temporary states produced by simulation.
- **Export `.mcpack`:** creates a behavior-pack package for the authored scene and includes a Minecraft function for loading the exported structure. Enable the pack in the target world, then run the function path shown by the export status.

## Editor-only JavaScript blocks

The editor supports `<js>...</js>` blocks for generating command text dynamically. Each block must evaluate to a JavaScript expression that returns a string. When **Run** is pressed, the expression is evaluated and its returned string replaces the entire block before command parsing begins. Editor-only blocks are omitted from Minecraft command exports.

Example:

```html
<js>
  (() => {
    return `/setblock 0 1 0 stone`;
  })();
</js>
```

This feature executes JavaScript in your browser. Only run code you trust.

## Blocks and redstone simulation

The block catalog includes common building blocks, all 16 wool colors, redstone dust and torches, levers, buttons, pressure plates, repeaters, comparators, observers, pistons, slime and honey blocks, note blocks, daylight detectors, droppers, barrels, and blocks used for piston movement and note-block instrument testing.

Autocomplete suggests block names, block-state keys, and allowed values using the block registry. The simulator models common redstone power propagation, repeater delays and locking, comparator inputs, daylight detectors, piston movement with slime/honey attachment rules, armor-stand gravity, note-block instruments, and synthesized spatial audio. Sound is positioned at its source, changes with camera direction, and gets quieter with distance; the stereo monitor shows left and right output levels.

This is a focused simulator, not a complete Minecraft runtime. Some commands, blocks, states, entity behaviors, weather effects, and vanilla tick edge cases may not be implemented.

## Interface and controls

- **Ctrl+Enter:** run the command script.
- **Ctrl+F / Ctrl+H:** open Ace Find / Replace.
- **Drag:** orbit the camera.
- **Right-drag / Shift-drag:** pan the camera.
- **Mouse wheel / two-finger pinch:** zoom.
- **Click or tap a block:** activate its available interaction.
- **Right-click / touch-and-hold:** open the block context menu.
- **Scroll CMD:** select the last command responsible for the block's current placement.
- **ⓘ buttons:** open contextual help; clicking outside closes the panel.
- **Hide logs:** expand the command editor.

The HUD displays tick count, block count, camera facing, and simulated time. The **Daylight cycle** toggle controls automatic time advancement. Manual `/time set` and `/time add` commands still work while automatic cycling is disabled.
