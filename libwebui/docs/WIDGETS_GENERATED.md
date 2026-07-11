# Widgets Factory

Widgets stables ajoutes au-dessus de la gallery existante.

Architecture actuelle:

- `libwebui/widgets/<widget>.to` est le fichier public du widget.
- `libwebui/widget_core.to` regroupe les helpers communs pour eviter de dupliquer styles, popovers, conversions, coloration de code et fonctions JS partagees.
- `libwebui/widget_factory.to` a ete supprime.

Widgets deja autonomes cote rendu: `date_picker.to`, `color_picker.to`, `audio_player.to`, `video_player.to`, `dropdown_list.to`, `theme_dropdown.to`, `action_dropdown.to`.

Les widgets ont maintenant un fichier dedie dans `libwebui/widgets/`:

- `action_dropdown.to`
- `dropdown_list.to`
- `rating.to`
- `switch.to`
- `copy_field.to`
- `progress_steps.to`
- `date_picker.to`
- `color_picker.to`
- `audio_player.to`
- `video_player.to`
- `chart.to`
- `chart_library_script.to`
- `chat_bar.to`
- `chat_bar_script.to`
- `chat_bar_styles.to`
- `chat_composer.to`
- `chat_message.to`
- `code_block.to`
- `dashboard.to`
- `data_panel.to`
- `data_panel_styles.to`
- `desktop_layout.to`
- `dock_page.to`
- `dock_script.to`
- `empty_gpu_metric_row.to`
- `file_picker.to`
- `gpu_metric_row.to`
- `gpu_table.to`
- `kpi.to`
- `kpi_grid.to`
- `metrics_dashboard.to`
- `metrics_script.to`
- `metrics_styles.to`
- `monaco_editor.to`
- `pill_button.to`
- `pill_button_row.to`
- `pill_field.to`
- `pill_input.to`
- `pill_select.to`
- `styles.to`
- `task_manager_page.to`
- `theme_dropdown.to`

`dropdown_list.to` expose le dropdown factory generique. `theme_dropdown.to` et `action_dropdown.to` sont des widgets derives qui utilisent cette base commune pour garder le meme rendu, le meme comportement d'ouverture et les memes conventions d'evenements.

`audio_player.to` expose un lecteur audio custom avec onde en barres, boutons play/pause/stop, volume, progression via slider WebUI et evenements `audio_*`.

`widgets_extra` reste une facade de compatibilite pour les anciens scripts. Pour un nouveau script, preferez importer uniquement le widget necessaire:

```toba
import : libwebui / widgets / rating

rating = rating::Rating()
rating.Setup("quality", "Qualite", 4, 5, "rating_change")
rating.Close()
```

Les widgets a dropdown utilisent le helper commun `PopoverToggleJs()` dans `widget_core.to`. Il ferme les autres dropdowns ouverts, ferme les panneaux au clic exterieur, et positionne automatiquement le panneau vers le haut ou aligne a droite quand l'espace manque.

Pour les vues qui doivent occuper tout l'espace disponible, appelez `panel.Fill()` avant d'ajouter les widgets. Cela ajoute la classe layout `lw-fill-panel` et permet aux composants compatibles, comme `TabView`, `Chart` et `VideoPlayer`, de s'etirer verticalement.

## Disabled State

Les wrappers `widgets/` et `widgets_extra` exposent `SetDisabled(1)` pour rendre un widget non interactif sans changer son API `Setup(...)`.

```toba
import : libwebui / widgets / rating

rating = rating::Rating()
rating.Setup("quality", "Qualite", 4, 5, "rating_change")
rating.SetDisabled(1)
rating.Close()
panel.Add(rating)
```

Le rendu ajoute la classe commune `lw-disabled`, qui applique un etat visuel desature et bloque les interactions pointeur.

## Rating

Evenement: `rating_change`

Payload:

```json
{"id":"quality_rating","value":4}
```

Usage:

```toba
import : libwebui / widgets_extra

rating = widgets_extra::Rating()
rating.Setup("quality_rating", "Qualite", 4, 5, "rating_change")
rating.Close()
panel.Add(rating)
```

## Switch

Evenement: `switch_change`

Payload:

```json
{"id":"auto_play","value":"on","state":"on"}
```

## CopyField

Evenement: `copy_value`

Copie la valeur dans le presse-papiers si le navigateur l'autorise.

## ProgressSteps

Evenement: `step_select`

Payload:

```json
{"id":"clone_steps","value":2}
```

## DatePicker

Evenement: `date_change`

Payload:

```json
{"id":"delivery_date","value":"2026-06-26"}
```

Calendrier custom integre a `libwebui`, sans input natif du navigateur. Le dropdown est compact, prefere l'ouverture vers le haut dans les panneaux limites, et utilise des boutons `-` / `+` pour changer le mois et l'annee.

## ColorPicker

Evenement: `color_change`

Payload:

```json
{"id":"accent_color","value":"#00d4aa"}
```

Palette custom type color picker avec zone saturation/luminosite, barre de teinte, preview, valeur hex editable et swatches. Aucun `input type=color` natif n'est utilise.

## VideoPlayer

Evenements principaux: `video_loaded`, `video_play`, `video_pause`, `video_seek`, `video_mute_toggle`, `video_fullscreen`

Usage:

```toba
video = widgets_extra::VideoPlayer()
video.Setup("advanced_video_player", "Video player", "C:/videos/intro.mp4", " ", "HTML5 video component with Toba events")
video.Close()
panel.Add(video)
```

Le widget est rendu par `widget_core::VideoPlayer()` et reutilise les helpers video du runtime webui. Si un fichier sidecar `source + ".b64"` existe, il est injecte en `data:video/mp4;base64,...` pour contourner les WebView qui bloquent les chemins locaux. Sinon les chemins locaux Windows sont convertis en URL `file:///C:/...` avant d'etre passes au tag `<video>`.

Le slider de lecture est entierement skinne par `runtime.to` (`.gallery-video-progress`) et le widget porte `lw-fill-widget` pour remplir la hauteur d'un panel `Fill()`.

Une petite video de test est fournie ici:

```text
C:/Toba/modules/libwebui/sample_video.mp4
C:/Toba/modules/libwebui/sample_video.mp4.b64
```

Cette video de test est encodee en H.264/`avc1`, format beaucoup mieux supporte par Edge/WebView que les anciens MP4 `mp4v`.

## Chart

Evenements principaux: `chart_add_point`, `chart_add_burst`, `chart_start_stream`, `chart_stop_stream`, `chart_reset`

Usage:

```toba
chart = widgets_extra::Chart()
chart.Setup("gallery_chart", "Chart.js professional chart", "Toba can push real-time points through the bridge")
chart.Close()
panel.Add(chart)
```

Le widget est rendu par `widget_core::Chart()` et reutilise l'initialisation Chart.js du runtime webui.

## CodeBlock

Affiche un bloc de code avec coloration syntaxique generee cote Toba. La coloration `toba` reprend les categories du support VSCode local `toba-language-support`: declarations, controle, `self`, builtins, nombres, strings, commentaires et operateurs.

Usage:

```toba
code = widgets_extra::CodeBlock()
code.Setup("demo_code", "Code Toba", "toba", "func: Hello() {\n    return (\"hello\")\n}")
code.Close()
panel.Add(code)
```

Les autres langages sont affiches avec echappement HTML simple pour l'instant.

## MonacoEditor

Editeur de code Monaco avec fallback textarea automatique. Si le loader Monaco ne charge pas, le widget reste utilisable et continue d'envoyer les evenements depuis le textarea.

Evenements:

- `monaco_change`
- `monaco_format`
- `monaco_copy`

Payload `monaco_change`:

```json
{"id":"monaco_toba_sample","value":"print(\"ok\")","language":"toba","source":"monaco"}
```

Usage:

```toba
editor = widgets_extra::MonacoEditor()
editor.Setup("script_editor", "Script Toba", "toba", "print(\"ok\")", "monaco_change")
editor.Close()
panel.Add(editor)
```

Loader:

```toba
editor.SetLoaderUrl("C:/Toba/modules/libwebui/vendor/monaco/vs/loader.js")
```

Par defaut, le widget pointe vers le CDN Monaco `0.52.2`. Pour une app offline, fournissez un Monaco local via `SetLoaderUrl(...)`.

La coloration syntaxique Toba de Monaco est fournie par:

```text
C:/Toba/modules/libwebui/vendor/monaco_toba.js
```

Ce fichier reprend les categories de `toba-language-support`: declarations, controle, `self`, builtins, fonctions utilisateur, strings, nombres, commentaires et operateurs. Il est charge comme fichier vendor separe pour eviter d'injecter une grosse grammaire JavaScript dans une chaine Toba.

## Markdown Code Fences

Le viewer `webui::Markdown()` applique aussi la coloration syntaxique aux blocs fenced declares en `toba` ou `to`.

Exemple: un bloc markdown qui commence par trois backticks suivis de `toba` sera rendu avec les classes `lw-code-*`.

Les blocs non Toba restent echappes proprement sans coloration avancee.
