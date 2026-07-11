# libwebui effects

Effects are small Toba helpers that return HTML, CSS and JavaScript strings.
They do not use React. They are designed to layer on top of existing libwebui
widgets and theme variables.

## Import

```toba
import : libwebui / effects
```

Add assets once in the page:

```toba
html = effects::Assets() $ effects::CursorGlow() $ body
```

## Text effects

```toba
effects::ShinyText("Streaming")
effects::GradientText("Voice Studio")
effects::BlurText("Ready")
effects::ScrambleText("demo_scramble", "TOBA WEBUI")
```

## Container effects

```toba
html = effects::Panel("card", innerHtml, "lwfx-spotlight lwfx-border lwfx-pop")
html = effects::Wrap(buttonHtml, "lwfx-magnetic")
```

Common classes:

- `lwfx-spotlight`
- `lwfx-border`
- `lwfx-pop`
- `lwfx-float`
- `lwfx-pulse`
- `lwfx-magnetic`
- `lwfx-tilt`
- `lwfx-reveal`
- `lwfx-scan`

## Apply effects to existing widgets

```toba
html = html $ effects::Apply(".ui-card", "lwfx-reveal lwfx-pop")
html = html $ effects::Apply(".ui-btn.primary", "lwfx-magnetic")
```

## Click sparks

```toba
html = html $ effects::EnableClickSparks()
```

This adds click particles globally. It respects the current theme accent color.

## Object helper

```toba
box = effects::EffectBox()
box.Setup("hero_card", "lwfx-spotlight lwfx-border lwfx-tilt")
box.AddHtml("<h2>" $ effects::GradientText("Effects") $ "</h2>")
box.AddText("Theme-aware animated panel.")
box.Close()
html = box.html
```

The effects are intentionally CSS/JS-based so they can work with the existing
WebSocket bridge and Toba polling model.
