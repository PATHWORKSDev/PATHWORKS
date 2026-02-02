# PATHWORKS — Studio Library Website Kit (Monochrome)

Static HTML/CSS/JS kit intended as a **reusable library** for a studio site that can host **every game** the studio makes.

- Dark-mode only, monochrome (black/white)
- Zero dependencies
- Data-driven **Our games** page (JSON)
- Reusable UI components (buttons, cards, scroll rails, tabs, accordions, modal viewer)
- Copyable page skeleton (hero → body → footer)

## Quick start

Because this uses `fetch()` for JSON, you need a local server (not `file://`).

### Option A (Python)
```bash
python -m http.server 5500
```
Open: `http://localhost:5500`

### Option B (Node)
```bash
npx serve .
```

## Folder layout

```
/
  index.html                      # Home (Our games)
  pages/
    game.html                      # Game detail (driven by ?id=)
    studio.html                    # About / contact template
    press.html                     # Press kit template
    template.html                  # UI library + conventions (copy this for new pages)
    legal.html
    404.html

  assets/
    css/
      tokens.css                   # design tokens (monochrome)
      base.css                     # reset + typography
      ui.css                       # component library
      pages/
        home.css
        game.css
        studio.css

    js/
      core.js                      # utils (debounce, readJson, etc.)
      ui.js                        # UI behaviors (nav drawer, scroll fades, modal)
      pages/
        home.js                    # renders games grid from JSON
        game.js                    # renders a single game from JSON

    data/
      games.json                   # source of truth for all games
      socials.json                 # optional future use

    img/
      brand/                       # studio logos (placeholders included)
      placeholders/                # banner/square/transparent placeholders
      games/
        (make a folder per game id)
```

## Add a new game

1. Create a folder: `assets/img/games/<id>/`
2. Add images (recommended):
   - `banner.jpg` (or .png) – wide
   - `square.png` – square tile
   - `shot-01.jpg`, `shot-02.jpg` – gallery
3. Add an entry to `assets/data/games.json`:

```json
{
  "id": "my-game",
  "title": "MY GAME",
  "oneLiner": "one sentence hook",
  "status": "In development",
  "release": "TBA",
  "platforms": ["Roblox"],
  "genres": ["Horror"],
  "tags": ["horror","co-op"],
  "banner": "assets/img/games/my-game/banner.jpg",
  "media": [
    { "src": "assets/img/games/my-game/shot-01.jpg", "alt": "Screenshot 1" }
  ],
  "links": [
    { "label": "Roblox", "href": "https://..." }
  ]
}
```

## Copyable page skeleton

Duplicate `pages/template.html` and replace:
- hero kicker/title/sub
- section headers and body
- per-page CSS (optional)

## Notes

This kit includes placeholders where real URLs/images go.
If you want this to match your existing portfolio repo structure exactly, connect your GitHub source in ChatGPT (Apps) and share the repo path; then the kit can be reshaped to mirror it 1:1.
