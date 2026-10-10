# Redstone Compiler

Redstone Compiler is a browser-based redstone build and simulation editor for Minecraft Bedrock Edition. It uses a deliberately limited subset of Bedrock commands for local simulation, with a 3D scene, state-aware autocomplete, structure tools, and Minecraft-oriented exports.

## Start here

1. Open `index.html` in a modern browser. The 3D editor and Ace Editor load from CDN, so an internet connection is needed for those libraries.
2. Enter **Minecraft Bedrock command syntax** in the command editor, one command per line, then press **Run** or `Ctrl+Enter`.
3. **Clear & Run** clears the editor's simulated world using an internal UI action, then executes the script. **Clear world** clears the scene. Neither button inserts an invented command into your script.
4. Click/tap blocks to interact with them. This is an editor UI action, not a Minecraft command. Right-click or touch-and-hold opens the block menu; **Scroll CMD** selects the command that last placed/replaced that block.
5. Use **File** to import/export commands and structures. **Structures** manages the editor's named structure library.

## Important: commands vs. editor controls

Except for the editor-only `<js>...</js>` block described below, script text is intended to be Minecraft Bedrock command syntax. The editor does **not** define a `/use` command or another custom command for clicking blocks. Interactions such as toggling a lever or pressing a button happen by clicking/tapping the block in the 3D editor.

The simulation implements only a subset of Bedrock commands. A command may be valid in Minecraft but not simulated here yet; such commands should be kept for Minecraft export, but the local simulator may report them as unsupported. The README's “Supported by the simulator” list below names the currently simulated commands. Unsupported commands are not silently remapped to editor-specific behavior.

### Commands simulated by this editor

- `/setblock <x> <y> <z> <block>[state=value] [replace|keep]`
- `/fill <x1> <y1> <z1> <x2> <y2> <z2> <block> [replace|destroy|keep|hollow|outline]`
- `/clone <x1> <y1> <z1> <x2> <y2> <z2> <destination> [replace|masked] [normal|move]`
- `/structure save <name> <from x y z> <to x y z>`
- `/structure load <name> <x> <y> <z> [rotation] [mirror]`
- `/structure delete <name>`
- `/summon armor_stand <x> <y> <z>` (the command is real Bedrock syntax; only armor stands are simulated)
- `/kill @e` (the command is real Bedrock syntax; only editor-simulated entities are affected)
- `/time set <ticks|day|sunrise|noon|sunset|night|midnight>`
- `/time add <ticks>`
- `/time query <daytime|gametime|day>`
- `/gamerule doDaylightCycle <true|false>`

Coordinates support normal separated values (`~ ~1 ~`) and the compact converter form (`~0~1~0`). The simulator executes commands from first line to last; support blocks should generally be placed before components that need them.

### Native Bedrock commands not simulated here

`/use` is **not** a Minecraft Bedrock command and is not supported. Older projects containing `/use x y z` must replace those lines with the editor's click/tap interaction, or remove the lines. The simulator reports an unknown command for `/use`, and `.mcfunction` export is blocked if a legacy `/use` line remains, preventing that custom syntax from reaching Minecraft.

`/clear` **is** a real Bedrock command, but it clears player inventory—not the world. Inventory is not simulated, so running `/clear` reports that limitation; use the editor's **Clear world** or **Clear & Run** UI buttons to clear the simulation. Those buttons do not write `/clear` into your command file.

Other Bedrock commands may still be valid for Minecraft exports even if this local simulator cannot execute them. See the official [Bedrock Command Reference](https://learn.microsoft.com/en-us/minecraft/creator/commands/?view=minecraft-bedrock-stable).

## File import and export

- **Import `.mcfunction` or `.txt`:** loads command text into the editor. Review before running.
- **Import `.mcstructure`:** reads a native Bedrock structure into the structure library.
- **Import `.json`:** loads normalized structure JSON into the structure editor.
- **Export `.mcfunction`:** downloads the command-editor text after removing editor-only `<js>` blocks. An old `/use` line blocks export because `/use` is not a Minecraft command.
- **Export `.mcstructure`:** writes the authored block layout and native Bedrock palette states, not temporary simulation states.
- **Export `.mcpack`:** packages the current authored block layout as a behavior pack and adds a real Minecraft function that loads the structure. This export is based on the scene snapshot, not a conversion of arbitrary editor commands. Enable the pack in the world, then use the `/function ...` path shown by the export status.

Editor-only JavaScript blocks and editor UI actions are not emitted into Minecraft files.

## Editor-only JavaScript: `<js>`

`<js>...</js>` is the one intentional editor-specific script feature. It is not Minecraft syntax. Each block must evaluate to a JavaScript expression that returns a string; when **Run** is pressed, the result replaces the complete block in the editor before command parsing begins. The block is removed—not run—when exporting Minecraft command files.

```html
<js>
  (()=>{
    return `/setblock 0 1 0 stone`;
  })();
</js>
```

This feature executes JavaScript in your browser. Only run code you trust.

## Blocks and redstone behavior

The block registry includes common solids, all 16 wool colors, redstone dust, torches, levers, buttons, pressure plates, repeaters, comparators, observers, pistons, slime/honey blocks, note blocks, daylight detectors, droppers, barrels, and blocks used to test piston movement or note-block instruments. Autocomplete reads block names and allowed block-state values from the registry; it isn't a separate list that must be manually updated for each new block definition.

The simulator models common redstone power propagation, repeater delays/locking, comparator inputs from redstone and supported container states, daylight detectors, piston movement with slime/honey attachment rules, armor-stand gravity, and synthesized spatial sound. Spatial audio is emitted from block coordinates, attenuates with distance, pans with camera orientation, and includes a live left/right channel monitor. The stereo meters show the actual mixed output level for each channel. It is a focused simulator rather than a complete Minecraft runtime; entity AI, every block state, every command, every light/weather effect, and all vanilla tick edge cases are not implemented.

## Interface and controls

- **Ctrl+Enter:** run the command script.
- **Ctrl+F / Ctrl+H:** Ace Find / Replace.
- **Drag:** orbit the camera.
- **Right-drag / Shift-drag:** pan.
- **Wheel / two-finger pinch:** zoom.
- **Click/tap a block:** use its interactive behavior where available; this is a UI action, not a command.
- **Right-click / touch-and-hold:** open the block menu.
- **Scroll CMD:** select the last command responsible for the block's current placement.
- **ⓘ buttons:** open contextual help; clicking outside dismisses it.
- **Hide logs:** expand the editor area.

The bottom-left HUD shows tick count, block count, camera facing, and simulated time. The daylight-cycle toggle controls automatic time progression; `/time set` and `/time add` can still be used while the cycle is off.

## Project modules

- `js/simulationEngine.js` — simulation model, block registry, command parser, authored source map, and redstone logic.
- `js/simulationEngineSW.js` — self-contained Web Worker engine.
- `js/renderer.js` — Three.js rendering, camera controls, audio positioning, and block picking.
- `js/bedrockStructure.js` — Bedrock structure NBT parsing/writing and behavior-pack packaging.
- `js/main.js` — interface, Ace autocomplete, file dialog, logs, audio, and UI coordination.
- `style.css` — interface styling and responsive layouts.
