# BadgeCounter

Categorie: Display

Petit compteur avec badge et evenement de clic.

Evenement: `badge_counter_click`

Payload conseille: `{id,value}`

Usage:

```toba
widget = BadgeCounter()
widget.Setup("badgecounter", "BadgeCounter", "value", "badge_counter_click")
widget.Close()
panel.Add(widget)
```
