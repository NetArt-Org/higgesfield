# Higgesfield

A Higgsfield-style **Adobe Premiere Pro** panel that generates AI shots **inside the timeline** and keeps them coherent across a sequence. It talks **directly** to each model provider's API (no broker/aggregator) — you bring your own keys.

Four pillars:

| Pillar | What it does | Direct provider(s) |
|---|---|---|
| **Character** | create a character, reuse it consistently across shots | Flux (create) → Kling / Seedance (animate, reference-to-video) |
| **Background** | generate a reusable environment/plate | Flux |
| **SFX** | generate sound effects onto an audio track | ElevenLabs |
| **Auto-Cut** | detect cut points and slice the timeline | local **ffmpeg** (no key) |

Extra video providers are pre-wired and selectable: **Veo, Runway, Luma, MiniMax (Hailuo)**, plus optional **Higgsfield** (your Pro key).

---

## Architecture

```
Premiere ▸ Extensions ▸ Higgesfield  (CEP panel)
  client/  (HTML/CSS/JS, Node enabled)  ──evalScript──▶  host/index.jsx (timeline ops)
        │
        ├─ lib/        cep bridge · http (Node https) · media (data-uri) · store (~/.higgesfield)
        ├─ providers/  one adapter per native API (Bearer / JWT / Google) behind a common interface
        ├─ jobs.js     submit → poll → download   (provider-agnostic)
        ├─ pillars/    character · background · sfx · autocut
        └─ engine/autocut/  ffmpeg scene & silence detection
```

- **Consistency store** (`~/.higgesfield/projects/<name>/`) holds characters, backgrounds and sound profiles, reused as reference inputs on every generation.
- **Keys** live in `~/.higgesfield/config.json` (per-machine, gitignored). Traffic goes straight to each provider.
- Generation is **asynchronous** everywhere: the panel polls each provider's task endpoint, then downloads and imports the result.

---

## Install

Requires **Premiere Pro 2024 (24.0)+**. The installer enables CEP debug mode, copies the panel into the correct per-user extensions folder, and optionally captures your core keys.

### Windows
```powershell
cd C:\Users\sanja\higgesfield
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

### macOS
```bash
cd /path/to/higgesfield
chmod +x install.command      # once
bash install.command          # or just double-click install.command in Finder
```

Then restart Premiere → **Window ▸ Extensions ▸ Higgesfield**. On first launch the panel opens a **Setup wizard** to collect any keys you skipped — each with a “Get key ↗” link. Reopen it anytime from **Settings ▸ Run setup wizard**.

<details><summary>Manual install / what the scripts do</summary>

- **Enable unsigned extensions** (`<ver>` = 11 for Premiere 2024, 12 for 2025):
  - Windows: set `PlayerDebugMode=1` (String) under `HKCU\Software\Adobe\CSXS.<ver>`.
  - macOS: `defaults write com.adobe.CSXS.<ver> PlayerDebugMode 1` then `killall cfprefsd`.
- **Copy the panel** into the per-user CEP extensions folder:
  - Windows: `%APPDATA%\Adobe\CEP\extensions\com.higgesfield`
  - macOS: `~/Library/Application Support/Adobe/CEP/extensions/com.higgesfield`

</details>

### Packaged install (.zxp)
Sign with Adobe's `ZXPSignCmd` into `higgesfield.zxp`, then install with the free **ZXP Installer** (aescripts) — the same flow Higgsfield's own plugin uses (Windows + macOS).

---

## Configure keys

Use the first-run **Setup wizard** (or the **Settings** tab, or the installer's optional prompts) to paste each key — all saved to `~/.higgesfield/config.json`. Where to get them:

| Provider | Get key at | Auth / format |
|---|---|---|
| `seedance` | BytePlus ModelArk console | Bearer API key. *1.0/1.5 Pro are GA; 2.0 is public-beta — confirm API access.* |
| `kling` | klingai.com/global/dev | `ACCESS_KEY:SECRET_KEY` (panel builds the JWT). Needs an API plan. |
| `flux` | Black Forest Labs (api.bfl.ai) | Bearer |
| `elevenlabs` | elevenlabs.io | `xi-api-key` |
| `veo` | Google AI Studio (Gemini API) | API key |
| `runway` | dev.runwayml.com | Bearer |
| `luma` | lumalabs.ai | Bearer |
| `minimax` | MiniMax (minimaxi) | Bearer |
| `higgsfield` | api.higgsfield.ai | Bearer (your Pro key) |

**Auto-Cut needs no key** — just ffmpeg on PATH, or set its full path in Settings.

---

## Usage

- **Character → Create**: describe a character, generate a reference image (Flux). It's saved to the project library.
- **Character → Animate**: pick a saved character, write the shot, choose Kling/Seedance, optionally tick *Use current frame* (exports the playhead frame as the first frame). The finished clip is placed on **V1** at the playhead.
- **Background**: generate a reusable environment plate.
- **SFX**: describe a sound; it's generated and dropped on **A1**. Tick *Save to profile* to keep a consistent palette.
- **Auto-Cut**: paste a media file path, choose *Scene* or *Silence*, run. Cut points are detected locally and razored onto the timeline.

---

## Verify-on-device flags

Some calls are environment-sensitive and are clearly commented in the source. Confirm them against your accounts / Premiere version:

- **Provider endpoints** (`client/js/providers/*.js`) are marked `verified: false` — base hosts, model ids and field names move fast. Update them as needed; the Settings tab shows a `verify` hint.
- **`host/index.jsx`**
  - `hgExportFrame` uses `Sequence.exportFramePNG` (availability/signature varies by Premiere version).
  - `hgApplyCuts` uses the **QE DOM** razor (`qe…`), which is unofficial. Razor is applied; **ripple-delete** is a planned follow-up.
- **Reference images** are inlined as base64 **data URIs**. A few providers require a *public URL* instead — for those, add an upload step (their file endpoint or your own bucket).

## Roadmap / not yet wired
- Background **replacement** on existing footage (subject matte + composite).
- Auto-Cut: **ripple-delete**, **beat-sync**, and **transcript-based** cuts (would add Whisper).
- Asset **upload** helper for providers that reject data URIs.
- After Effects host target (add `AEFT` to the manifest).

## Notes
Personal tool using **your own** provider keys against each lab's official API — intended, in-policy usage. No private/plugin-only endpoints are reverse-engineered. Generated media is written to `~/.higgesfield/tmp/` before import.
