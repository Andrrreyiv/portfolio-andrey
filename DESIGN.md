---
name: Андрей Брыкун — портфолио
description: Тёплый уголь и бежевые главы, Playfair с курсивным акцентным словом, одна оранжевая нота; работа показывает себя сама.
colors:
  coal: "#100E0C"
  coal-raised: "#171411"
  coal-deep-surface: "#221E1A"
  coal-surface: "#1A1714"
  bone: "#EFE8DD"
  bone-muted: "#BDB3A6"
  bone-faint: "#8E8478"
  ember: "#FF5B2E"
  ember-soft: "#FF8A5C"
  on-ember: "#160B06"
  paper: "#F3ECE0"
  paper-raised: "#EAE1D2"
  paper-deep: "#E1D6C3"
  paper-surface: "#FBF7F0"
  paper-ink: "#18130E"
  paper-ink-muted: "#4A4038"
  paper-ink-faint: "#6B6054"
  ember-on-paper: "#BF401C"
  ember-on-paper-soft: "#E0522E"
  ember-on-sand: "#A8361A"
  day-bg: "#F6F2EB"
  day-surface: "#FFFEFB"
  day-ink: "#15110D"
  sand: "#EAE0CE"
  state-cool: "#9DB4C8"
  state-ok: "#6FBF95"
  state-warn: "#E5B653"
  state-bad: "#E8664F"
typography:
  display:
    fontFamily: "Playfair, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(44px, min(6.8vw, 11vh), 132px)"
    fontWeight: 500
    lineHeight: 0.95
    letterSpacing: "-0.03em"
    fontVariation: "'wdth' 87.5"
  headline:
    fontFamily: "Playfair, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(44px, 6.2vw, 96px)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 87.5"
  case-title:
    fontFamily: "Playfair, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(42px, min(5.2vw, 8.6vh), 84px)"
    fontWeight: 500
    lineHeight: 0.96
    letterSpacing: "-0.03em"
    fontVariation: "'wdth' 87.5"
  title:
    fontFamily: "Playfair, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(34px, 3.8vw, 60px)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 87.5"
  title-sm:
    fontFamily: "Playfair, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(22px, 2vw, 30px)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 87.5"
  figure:
    fontFamily: "Playfair, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(44px, min(5vw, 8vh), 76px)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "'lnum' 1, 'tnum' 1"
  lead:
    fontFamily: "Onest, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "clamp(17px, 1.3vw, 19px)"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "Onest, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "'JetBrains Mono', ui-monospace, Consolas, monospace"
    fontSize: "12px"
    fontWeight: 400
    letterSpacing: "0.08em"
rounded:
  focus: "6px"
  window: "14px"
  frame: "18px"
  device: "26px"
  pill: "100px"
  circle: "50%"
spacing:
  gutter: "clamp(16px, 4vw, 48px)"
  wrap: "1320px"
  section: "clamp(88px, 11vw, 150px)"
  head-gap: "clamp(48px, 7vw, 96px)"
  column-gap: "clamp(32px, 6vw, 96px)"
components:
  button-accent:
    backgroundColor: "{colors.ember}"
    textColor: "{colors.on-ember}"
    rounded: "{rounded.pill}"
    padding: "14px 26px"
    height: "50px"
  button-accent-hover:
    backgroundColor: "{colors.ember-soft}"
  button-line:
    backgroundColor: "transparent"
    textColor: "{colors.bone}"
    rounded: "{rounded.pill}"
    padding: "14px 26px"
    height: "50px"
  button-line-hover:
    backgroundColor: "{colors.bone}"
    textColor: "{colors.coal}"
  button-xl:
    rounded: "{rounded.pill}"
    padding: "18px 34px"
    height: "64px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.bone-muted}"
    rounded: "{rounded.pill}"
    padding: "10px 16px"
    height: "44px"
  shot:
    backgroundColor: "{colors.coal-deep-surface}"
    rounded: "{rounded.frame}"
  frag-window:
    backgroundColor: "{colors.coal-raised}"
    rounded: "{rounded.window}"
  icon-button:
    rounded: "{rounded.circle}"
    size: "44px"
  finale:
    backgroundColor: "{colors.ember}"
    textColor: "{colors.on-ember}"
---

# Design System: Андрей Брыкун — портфолио

## Overview

**Creative North Star: "Ночная мастерская с листами на столе"**

The site is a warm, nearly black workshop (never pure black) where the work itself is the exhibit. Chapters alternate: coal for the main story, beige paper bands for the quieter chapters (about, the works index, solution examples, FAQ; on a case page only the "Цифры" band). A section re-declares the colour tokens and everything inside it re-colours itself, so one component set serves both materials. A WebGL particle cloud lives under the page and morphs between figures as the visitor scrolls (the "АБ" monogram, a chat, a window, a magnifier, a network, a question mark). Over paper the particles print in the paper's own ink and accent.

Type does the talking: a condensed Playfair display (width 87.5 %, optical size fixed at 144) with one italic accent word per headline, set against Onest for reading. There is one hot colour, an ember orange. It is rationed to actions, the first screen, the work strip, case figures and the closing scene, which is flooded with it. Case pages open with a live fragment of the product playing its main action once (a bot conversation, a game room filling up, personal data being masked, metal grains growing). The work is not shown as a captioned screenshot.

Motion is slow and expensive-feeling at the scale of the page (expo-out reveals of 0.9–1.2 s, Lenis-smoothed scroll) and quick at the scale of controls (≤ 220 ms). With reduced motion, no JS or no WebGL, every composition shows complete in its final state.

**Key Characteristics:**
- Warm coal (#100E0C) and beige paper (#F3ECE0) chapters, interleaved, with tokens re-declared per tone
- One ember accent, rationed; on paper it darkens to keep AA contrast
- Condensed Playfair display, one italic accent word per headline; Onest body
- Figures read as a counter board: tabular digits that roll in place, with every number tied to a source
- Product fragments wear the product's own shape (window, phone, sheet) and own colours
- Soft, long, low ambient shadows under work frames only; the page itself is flat
- Film grain over everything on desktop; none on phones

## Colors

A warm two-material palette: tinted coal and toasted paper, both carrying the same single ember accent.

### Primary
- **Ember** (`ember`): the only hot colour. Primary buttons, the italic accent word in first-screen and case headlines, case figures, the scroll progress hairline, focus rings, text selection, step-line progress, and the full-bleed closing scene. Contrast on coal is 6.2:1.
- **Ember Soft** (`ember-soft`): the hover state of ember buttons only.
- **Ember on Paper** (`ember-on-paper`): ember darkened for paper and the light theme (4.6:1 on paper). **Ember on Sand** (`ember-on-sand`) is the deeper step used for paper chapters inside the light theme (5:1).
- **On Ember** (`on-ember`): near-black ink on ember fills, including all type in the closing scene.

### Neutral
- **Coal** (`coal`): default page ground in the night theme. Warm-tinted; pure #000 never appears.
- **Coal Raised / Coal Surface / Coal Deep Surface** (`coal-raised`, `coal-surface`, `coal-deep-surface`): fragment windows, cards, and the empty fill behind loading frames.
- **Bone** (`bone`): primary text on coal. **Bone Muted** (`bone-muted`): leads, list text, nav links. **Bone Faint** (`bone-faint`): captions, labels, figure keys (5.2:1).
- **Paper / Paper Raised / Paper Deep / Paper Surface** (`paper`…): beige chapter ground and its layers.
- **Paper Ink / Muted / Faint** (`paper-ink`…): text on paper.
- **Day** (`day-bg`, `day-surface`, `day-ink`): the light theme (`data-theme="light"`, stored in localStorage). Its paper chapters sink to **Sand** (`sand`) so they still read as a separate material.
- **Lines** are not fixed colours. They are the current ink at 10 % (`--line`) and 18 % (`--line-2`) alpha (12 % / 22 % on paper), so they follow every tone.

### State
- **Cool, Ok, Warn, Bad** (`state-*`): diagram and fragment semantics only (statuses, checks, schema nodes). Each tone re-declares its own darker set for contrast; they never decorate.

### Named Rules
**The One Ember Rule.** Ember is for action, the first screen, the work strip, case figures and the finale. Section headlines outside the works chapter keep their italic word in the text colour. If ember is everywhere it stops pointing at anything.

**The Re-declare Rule.** A tone (`.tone-paper`, the light theme) overrides the tokens, including `--line` and `--line-2`, on the element where it applies, and components inherit. Components never hard-code coal or paper values.

**The Product's Own Colours Rule.** Live fragments reconstruct the real product (a messenger's dark theme, a game's violet and lime) in that product's palette. Those values stay inside the fragment and never become site tokens.

## Typography

**Display Font:** Playfair, self-hosted variable font (weight 400–700, width 87.5–100 %, optical size fixed at 144), with Georgia as fallback
**Body Font:** Onest (400–700), with system-ui as fallback
**Label/Mono Font:** JetBrains Mono (400–600), used for data, codes and window chrome
**Fragment-only Font:** 'Hand' = Caveat 500 (google/fonts, OFL), self-hosted as `assets/fonts/caveat-moves.woff2` (10 KB, subset to move-notation glyphs only: digits, a–h, К С Л Ф, `:+#-`). Declared at the top of `assets/css/case.css` and used only for the handwritten moves on the score sheet inside the NeurochessAI case fragment (19px, fill #1E2B63). It is a deliberate narrow addition (review 25.10: Playfair italic cannot stand in for handwriting) and is not part of the type scale. Playfair, Onest and JetBrains Mono remain the system; no other surface uses 'Hand'.

**Character:** A condensed high-contrast serif reads like a magazine cover that someone actually lives in. The single italic word is the voice of each headline. Onest keeps the reading plain and modern, so the serif never has to carry paragraphs.

### Hierarchy
- **Display** (500, width 87.5 %, `display`): first-screen headline only, about two to three lines, max 17ch. It is the loudest type on the site.
- **Headline** (500, `headline`): section headlines, which stay deliberately quieter than the first screen. The closing scene steps up to about 112px.
- **Case Title** (500, `case-title`): case first screen, two lines, max 16ch, sized against viewport height as well as width.
- **Title** (500, `title`): case block headings. They stick at 104px from the top while their content scrolls.
- **Title Small** (500, `title-sm`): step names, service rows (28–52px), FAQ questions.
- **Figure** (`figure`): the case counter board, set in ember with tabular lining figures. Units and separators drop to Onest Light at 0.6em in the faint colour.
- **Lead** (400, `lead`): the task line under a case title (max 31em) and section intros (max 620px), in the muted colour.
- **Body** (400, 17px / 1.6): paragraphs at 60–68ch. List and step text runs 15.5–16.5px.
- **Label** (400, 12px, 0.08em tracking, uppercase, `label`): table keys, list numbers, window address bars, codes.

### Named Rules
**The One Italic Word Rule.** Every display or headline carries exactly one italic accent phrase (em, weight 400). It is the brand signature and an owner decision, not a detector finding to fix.

**The Unbroken Dash Rule.** A dash never opens a line: a non-breaking space precedes it in source and in the build, and split-word animation must preserve it.

**The Counter Board Rule.** Numbers that matter roll digit by digit in place (fixed tabular slots) and end on the exact source text. Every figure on the site has a recorded source; no source means no figure.

## Layout

A single 1320px wrap with a fluid gutter (`spacing.gutter`), and sections breathing at `spacing.section` vertically. The default composition is **heading left, substance right**. Case blocks use a 4:8 grid with a sticky heading, the FAQ uses 5:7, and work-strip scenes use 5:6 (4.5:6.5 when pinned). The case first screen splits 44:56. Text, the number board and the action sit on the left. On the right a live fragment fills the viewport height minus the header (min 520px, max 860px) and sizes itself with container query units.

Rhythm is generous between chapters and tight inside them: section heads hold 48–96px below, lists run on 20px row padding with hairline separators, and stacks inside the case text column use 12–20px gaps.

Breakpoints are 1100, 1024 (the pinned horizontal work strip appears at ≥1024 with a fine pointer and no reduced motion), 900 (nav collapses to a full-width menu set in display type), 767 (grain off), 640, 560 and 480. On phones every split stacks text-first, and the tall diagram variants replace the wide ones.

**The Whole Scene Rule.** The work strip moves as "travel, then hold": a scene arrives centred and rests, and scroll is never hijacked or auto-snapped.

## Elevation & Depth

The page is flat. Depth comes from material (coal vs paper chapters), the particle field behind the main content, and a fixed film-grain layer (8 % overlay on coal, 35 % multiply in the light theme, hidden under 767px). Shadows appear only under objects that represent a work: screenshots, fragment windows, devices and the "next case" cover. These shadows are long, soft, and offset downward with a negative spread, like a sheet lifted slightly off a desk.

### Shadow Vocabulary
- **Frame** (`--shadow`; night `0 1px 2px rgba(0,0,0,.4), 0 28px 70px -28px rgba(0,0,0,.85)`, paper and day use the ink colour at 5–6 % and 30–32 %): every work frame and fragment window.
- **Device** (`0 40px 80px -30px rgba(0,0,0,.85)` and close variants): phones and floating sub-screens inside fragments.
- **Nav hairline** (`0 1px 0 var(--line)`): the scrolled nav bar, together with a 14px backdrop blur on desktop and a solid 96 % fill on touch.

### Named Rules
**The Sheet-Off-The-Desk Rule.** Shadows are ambient and downward only, with no hard offsets and no coloured glows on UI. Text, buttons and sections cast nothing.

## Shapes

Two families. Controls are fully round: pill buttons and chips (`rounded.pill`) and circular icon buttons, the logo mark and step dots (`rounded.circle`). Works are softly cornered rectangles: screenshot frames at 18px (`rounded.frame`), fragment browser windows at 14px with a 30px chrome bar and three dots, and devices at 22–36px with a thick dark bezel. Paper chapters enter as a card: they scale in from narrower and with rounded corners, then flatten to full bleed. The closing scene likewise opens out of a card. Hairlines (1px at line alpha) separate list rows, FAQ items and blocks. The site uses no boxed cards with fills for text content.

## Components

### Buttons
Tactile and soft, with a magnetic pull toward the cursor and a quick press.
- **Shape:** full pill (`rounded.pill`), min height 50px (44px in the nav, 64–84px for the closing Telegram button).
- **Accent:** ember fill, near-black ink, Onest 600 at 15px.
- **Line:** 1px `--line-2` border in the text colour. On hover it fills with the text colour and the label inverts.
- **States:** colour transitions run 220ms on the out-curve. The magnet writes `translate` over 380ms, and `:active` scales to 0.96 in 140ms. Movement and press are separate properties so they never cancel. A trailing arrow nudges 4px on hover. The closing button's label rolls to a duplicate on hover.
- **Inside the finale:** roles invert. The accent button becomes an ink fill with ember text, and the line button uses a 38 % ink border.

### Chips
- **Style:** transparent pill, 1px `--line-2` border, 14px muted text, 44px tall.
- **State:** on hover, text and border move to the full text colour. Used for tags and filters in the works index.

### Cards / Containers
- **Work frame:** 18px corners, deep-surface fill, 1px line border, frame shadow. While the image loads, a light sweep runs across it (1.5s) instead of an empty box.
- **Fragment window:** raised fill, 14px corners, mono address bar. Tall product video goes up to 22px corners and never wider than its native 412px.
- **Text blocks** are never boxed. They sit on hairlines.

### Navigation
Fixed and transparent over the first screen. After scrolling it gains a 86 % ground fill and a hairline, shrinks from 76px to 64px, and hides downward on scroll. It adopts the tone of the chapter under it. Links are 14px muted text with an ember underline that grows from the left. The 44px circular theme toggle grows the new theme as a circle from the button (View Transitions, 680ms). At ≤900px a two-line burger opens a full-width panel of 30px display-type links on hairlines.

### Live Fragment
The case's first-screen exhibit. The build prints the final state, so the fragment reads complete without JS. The script plays the product's main action once on entry (typed replies with the chosen button filling in ember, a counter rising as players join, data masked under labels, grains growing). Only transform, opacity and clip-path move, on expo.out over 0.6–1.2s. Older cases show their recorded video inside a browser window, with a phone or a second screen overlapping its edge.

### Steps Rail
A vertical 1px rail with 11px ring dots. An ember line grows down the rail with scroll, and each passed dot fills in.

### Closing Scene
A full-bleed ember stage. An italic display ticker (72–220px) alternates filled and outlined words above the final call to Telegram.

## Do's and Don'ts

### Do:
- **Do** declare a chapter's tone by overriding tokens (including `--line`/`--line-2`) on the section, and let components inherit.
- **Do** keep ember for actions, the first screen, the work strip, case figures and the finale. Elsewhere, italic accent words stay in the text colour.
- **Do** give every headline one italic accent phrase in Playfair at width 87.5 %.
- **Do** show work inside its own form (window, phone, sheet) with the frame shadow, and play its action once.
- **Do** render the final composition without JS, without WebGL and under `prefers-reduced-motion`.
- **Do** keep control feedback ≤ 220ms on `cubic-bezier(.23,1,.32,1)`, and keep reveals at 0.9–1.2s expo-out.
- **Do** keep targets ≥ 44px and use the ember focus ring (2px, 4px offset).
- **Do** use inline SVG for any new icon or arrow.

### Don't:
- **Don't** use pure black or pure white grounds. Coal and paper are tinted warm.
- **Don't** introduce a second accent hue for UI. Product colours stay inside their fragment.
- **Don't** put captions or labels inside a work frame, or present a case as "cover screenshot, then text".
- **Don't** auto-snap or hijack scroll. Scenes travel and hold.
- **Don't** put fills, boxes or shadows behind text blocks. Use hairlines.
- **Don't** let two videos play at once.
