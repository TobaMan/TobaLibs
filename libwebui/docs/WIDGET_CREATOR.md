# Widget Creator

Le widget creator sert a creer rapidement un nouveau widget `libwebui` sans casser la gallery.

Principe:

1. Decrire le widget dans `C:/Toba/modules/libwebui/widgets_def/new.widget`.
2. Lancer `C:/Toba/Toba.exe C:/Toba/modules/libwebui/tools/create_widget.to`.
3. Recuperer les fichiers generes dans:
   - `generated/`
   - `docs/`
   - `examples/`

Format minimal:

```ini
name=Rating
category=Input
description=Selection de note de 1 a 5.
props=id,label,value,maxValue,eventName
events=rating_change
```

Qualite attendue pour un widget stable:

- dimensions stables
- styles bases sur les variables theme `libwebui`
- evenement `webuiEvent(...)` documente
- payload clair `{id,value,state}`
- exemple Toba minimal
- doc generee
- pas de dependance reseau

Les widgets valides peuvent ensuite etre ajoutes dans `widgets_extra.to`, puis eventuellement promus dans `widgets.to`.
