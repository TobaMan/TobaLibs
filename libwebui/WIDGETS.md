# libwebui Widgets

Documentation de l'API publique `webui` et du bus d'evenements `eventbus`.

Note: quelques classes CSS internes utilisent encore le prefixe historique `gallery-`. Ce n'est pas le contrat public. Le contrat public cote Toba est `webui::...` pour construire l'interface, `eventbus::...` pour les evenements, et `webuiEvent(...)` cote navigateur.

## Widget Creator

Modules:

- `libwebui/widget_core`
- `libwebui/widgets/<widget>`
- `libwebui/widgets_extra`

Outil:

- `C:/Toba/modules/libwebui/tools/create_widget.to`

Documentation:

- `C:/Toba/modules/libwebui/docs/WIDGET_CREATOR.md`
- `C:/Toba/modules/libwebui/docs/WIDGETS_GENERATED.md`

Etat disabled:

Les wrappers dans `widgets/` et la facade `widgets_extra` supportent `SetDisabled(1)` sur les widgets factory. Le rendu utilise la classe commune `lw-disabled`.

Architecture:

- `libwebui/widgets/<widget>.to` contient le code public du widget.
- `libwebui/widget_core.to` contient les helpers communs: styles, `WidgetStart`, `WidgetEnd`, `DisableHtml`, popovers, conversions, coloration de code et fonctions JS partagees.
- `libwebui/widget_factory.to` a ete supprime. Le nouveau code doit importer `widgets/<widget>.to` ou `widget_core.to` pour les helpers.

Deja sortis de la factory vers leurs fichiers dedies: `date_picker.to`, `color_picker.to`, `audio_player.to`, `video_player.to`, `dropdown_list.to`, `theme_dropdown.to`, `action_dropdown.to`.
Les widgets media image sont aussi separes: `image_view.to`, `image_gallery.to`, `carousel.to`.

```toba
import : libwebui / widgets / rating

rating = rating::Rating()
rating.Setup("quality", "Qualite", 4, 5, "rating_change")
rating.SetDisabled(1)
rating.Close()
```

Workflow:

```text
1. Modifier C:/Toba/modules/libwebui/widgets_def/new.widget
2. Lancer C:/Toba/Toba.exe C:/Toba/modules/libwebui/tools/create_widget.to
3. Recuperer generated/<widget>_widget.to, docs/<Widget>.md, examples/<widget>_example.to
```

Widgets factory deja disponibles:

- `libwebui/widgets/action_dropdown.to`
- `libwebui/widgets/dropdown_list.to`
- `libwebui/widgets/rating.to`
- `libwebui/widgets/switch.to`
- `libwebui/widgets/copy_field.to`
- `libwebui/widgets/progress_steps.to`
- `libwebui/widgets/date_picker.to`
- `libwebui/widgets/color_picker.to`
- `libwebui/widgets/image_view.to`
- `libwebui/widgets/image_gallery.to`
- `libwebui/widgets/carousel.to`
- `libwebui/widgets/audio_player.to`
- `libwebui/widgets/video_player.to`
- `libwebui/widgets/chart.to`
- `libwebui/widgets/chart_library_script.to`
- `libwebui/widgets/chat_bar.to`
- `libwebui/widgets/chat_bar_script.to`
- `libwebui/widgets/chat_bar_styles.to`
- `libwebui/widgets/chat_composer.to`
- `libwebui/widgets/chat_message.to`
- `libwebui/widgets/code_block.to`
- `libwebui/widgets/dashboard.to`
- `libwebui/widgets/data_panel.to`
- `libwebui/widgets/data_panel_styles.to`
- `libwebui/widgets/desktop_layout.to`
- `libwebui/widgets/dock_page.to`
- `libwebui/widgets/dock_script.to`
- `libwebui/widgets/empty_gpu_metric_row.to`
- `libwebui/widgets/file_picker.to`
- `libwebui/widgets/gpu_metric_row.to`
- `libwebui/widgets/gpu_table.to`
- `libwebui/widgets/kpi.to`
- `libwebui/widgets/kpi_grid.to`
- `libwebui/widgets/metrics_dashboard.to`
- `libwebui/widgets/metrics_script.to`
- `libwebui/widgets/metrics_styles.to`
- `libwebui/widgets/monaco_editor.to`
- `libwebui/widgets/rich_text_editor.to`
- `libwebui/widgets/popup_window.to`
- `libwebui/widgets/pill_button.to`
- `libwebui/widgets/pill_button_row.to`
- `libwebui/widgets/pill_field.to`
- `libwebui/widgets/pill_input.to`
- `libwebui/widgets/pill_select.to`
- `libwebui/widgets/styles.to`
- `libwebui/widgets/task_manager_page.to`
- `libwebui/widgets/theme_dropdown.to`

`dropdown_list.to` est le widget factory generique pour les menus deroulants. `theme_dropdown.to` et `action_dropdown.to` sont maintenant deux widgets derives bases dessus; les anciens appels `widgets::ThemeDropdown()` et `widgets::ActionDropdown()` restent compatibles.

`audio_player.to` fournit un lecteur audio compact: moteur `<audio>` masque, boutons play/pause, slider WebUI de progression et slider WebUI de volume. Evenements principaux: `audio_loaded`, `audio_play`, `audio_pause`, `audio_seek`, `audio_volume`, `audio_ended`, `audio_error`.

Compatibilite:

`widgets_extra` reste disponible pour ne pas casser les anciens exemples. Pour le nouveau code, preferer un import cible depuis `libwebui/widgets/<widget>`.

Exemple:

```toba
import : libwebui / widgets / rating

rating = rating::Rating()
rating.Setup("quality_rating", "Qualite", 4, 5, "rating_change")
rating.Close()
panel.Add(rating)
```

Demo:

```text
C:/Toba/modules/libwebui/examples/webui_components_gallery.to
```

### Rich Text Editor

Module: `libwebui/widgets/rich_text_editor`

Le widget `RichTextEditor` fournit un editeur WYSIWYG themable base sur Quill. La librairie est embarquee localement dans `vendor/quill.js` et `vendor/quill.snow.css`; il n'y a pas de dependance CDN par defaut.

Quill est open source sous licence BSD 3-Clause et ne depend pas de React, jQuery ou Bootstrap.

```toba
import : libwebui / widgets / rich_text_editor

ed = rich_text_editor::RichTextEditor()
ed.Setup("notes", "Notes", "<p>Hello <strong>Toba</strong></p>", "notes_change")
ed.Close()
panel.Add(ed)
```

Methodes:

- `Setup(id, title, value, eventName)`
- `SetLoaderUrl(loaderUrl)`
- `SetReadOnly(1)`
- `SetDisabled(1)`
- `Close()`

### Popup Window

Module: `libwebui/widgets/popup_window`

`PopupWindow` fournit une fenetre modale themable, avec fermeture par clic exterieur et touche `Escape`. Le corps accepte du HTML genere par Toba, donc on peut y placer du texte, des grilles, ou d'autres fragments de widget.

```toba
import : libwebui / widgets / popup_window

popup = popup_window::PopupWindow()
popup.Setup("confirm_voice", "Confirmer", "Creation du fichier voice", "<p>Verifier les options avant de lancer.</p>")
popup.SetPrimary("Creer", "voice_confirm")
popup.SetSecondary("Annuler", "voice_cancel")
popup.Close()
panel.Add(popup)
```

Methodes:

- `Setup(id, title, subtitle, bodyHtml)`
- `SetPrimary(text, eventName)`
- `SetSecondary(text, eventName)`
- `SetDisabled(1)`
- `Close()`

Events navigateur envoyes automatiquement:

- `popup_open`
- `popup_close`
- l'event donne a `SetPrimary`
- l'event donne a `SetSecondary`

### Image Widgets

Modules:

- `libwebui/widgets/image_view`
- `libwebui/widgets/image_gallery`
- `libwebui/widgets/carousel`

Ces widgets affichent des images locales, URL ou `data:image/...`. Pour un chemin local Windows, le widget convertit automatiquement en `file:///...`. Si un fichier `image.ext.b64` existe, il est embarque en `data:` avec le MIME correspondant.

```toba
import : libwebui / widgets / image_view
import : libwebui / widgets / image_gallery
import : libwebui / widgets / carousel

img = image_view::ImageView()
img.Setup("preview", "Preview", "C:/images/photo.png", "Photo", "Image principale")
img.SetFit("cover")
img.Close()

gal = image_gallery::ImageGallery()
gal.Setup("photos", "Photos", "Vignettes cliquables", "photo_select")
gal.AddImage("C:/images/a.png", "A", "A")
gal.AddImage("C:/images/b.png", "B", "B")
gal.Close()

car = carousel::Carousel()
car.Setup("slides", "Carousel", "Slides image", "slide_change")
car.AddSlide("C:/images/a.png", "Slide A", "Premiere image")
car.AddSlide("C:/images/b.png", "Slide B", "Deuxieme image")
car.SetAutoPlay(0)
car.Close()
```

Methodes `ImageView`:

- `Setup(id, title, source, alt, caption)`
- `SetFit("cover")` ou `SetFit("contain")`
- `SetDisabled(1)`
- `Close()`

Methodes `ImageGallery`:

- `Setup(id, title, note, eventName)`
- `SetColumns(columns)`
- `AddImage(source, caption, alt)`
- `SetDisabled(1)`
- `Close()`

Methodes `Carousel`:

- `Setup(id, title, note, eventName)`
- `AddSlide(source, title, note)`
- `SetAutoPlay(ms)` avec `0` pour desactiver
- `SetDisabled(1)`
- `Close()`

Evenements:

- `image_click`
- `image_gallery_select`
- `image_gallery_open`
- `carousel_change`

## SimpleUI

Module: `libwebui/simpleui`

`simpleui` est une facade plus directe au-dessus de `CompactPage`, `Fields`, `Toolbar` et `eventbus`. Elle est prevue pour les petites fenetres outil: formulaire, file picker, actions a droite, notifications et boucle d'evenements simple.

Elle ne remplace pas `webui`: les composants avances et custom peuvent toujours etre ajoutes avec `Add(widget)` ou `AddHtml(html)`.

Exemple court:

```toba
import : libwebui / simpleui

app = simpleui::New("Voice Clone")
app.SetWindow(1040, 430, 180, 120)
app.FileEvent("audio_path", "Audio", "C:/audio/test.wav", ".wav,.mp3", "pick_audio")
app.TextEvent("voice_name", "Nom", "webui_clone", "name_changed")
app.SelectEvent("quality", "Qualite", ("balanced", "fast", "high"), "quality_changed")
app.ActionsRight()
app.ButtonEvent("create_voice", "Creer .voice", "save", "create_voice", "primary")
app.ButtonEvent("test_play", "Tester", "play", "test_play", " ")
app.Show()

loop {
    evt = app.Poll(10)
    if (evt.HasEvent()) {
        if (evt.Is("create_voice")) {
            app.Notify("Toba", "Creation demandee")
        }
        if (evt.Is("window_close_request")) {
            eventbus::AllowClose()
            break
        }
    }
    sleep(0.01)
}
```

Methodes principales:

- `Setup(title)` ou `simpleui::New(title)`
- `SetTitle(title)`
- `SetFooter(footer)`
- `SetPort(port)`
- `SetDebugPath(path)`
- `NoDebug()`
- `SetWindow(width, height, x, y)`
- `SetSize(width, height)`
- `SetPosition(x, y)`
- `Normal()`
- `Maximized()`
- `File(id, label, value, accept)`
- `FileEvent(id, label, value, accept, eventName)`
- `Text(id, label, value)`
- `TextEvent(id, label, value, eventName)`
- `Select(id, label, options, value)`
- `SelectEvent(id, label, options, eventName)`
- `ActionsRight()`
- `Button(id, text, icon, kind)`
- `ButtonEvent(id, text, icon, eventName, kind)`
- `IconButton(id, icon)`
- `Add(widget)`
- `AddHtml(html)`
- `Render()`
- `Show()`
- `Poll(timeoutMs)`
- `PollRaw(timeoutMs)`
- `EventName(raw)`
- `EventValue(raw)`
- `SetFile(id, path)`
- `Notify(title, text)`

Pour les apps interactives critiques, preferer `PollRaw` + `EventName/EventValue`: c'est le meme chemin fiable que `simple_voice_clone.to`.

Utilitaires mutualises dans `libwebui/uiutil`:

- `HasText(value)`
- `NormalizePath(path)`
- `SetFilePicker(id, path)`
- `PickFile(title, filter)`
- `PickAudioFile()`
- `Notify(title, text)`

Exemples:

- `C:/Toba/modules/libwebui/examples/simple_voice_clone.to`

## Format des evenements

Tous les widgets interactifs envoient un `CustomEvent("toba:event")`. `desktopui::WithBridge(...)` le transforme ensuite en JSON recu par Toba avec `desktopui::BridgePoll(timeoutMs)`.

Format recu cote Toba:

```json
{
  "type": "event",
  "name": "event_name",
  "widgetId": "widget_id",
  "args": ["widget_id", "value_or_state"],
  "data": {
    "id": "widget_id",
    "value": "value_or_state",
    "state": "open"
  },
  "timestamp": 1780000000000
}
```

Regles:

- `name` est le nom logique de l'evenement.
- `widgetId` vaut `data.id`, `data.widgetId`, ou `args[0]`.
- `args` reste disponible pour compatibilite.
- `data` est la map propre a utiliser dans le nouveau code Toba.
- `data.value` contient une valeur de champ ou un texte.
- `data.state` contient souvent `open/closed`.
- Si aucun `widgetId` n'est donne, `webuiEvent(name)` utilise `name` comme identifiant.

Cote Toba, utiliser `eventbus`:

```toba
import : libwebui / webui
import : libwebui / eventbus

evt = eventbus::Poll(50)
if (evt.HasEvent()) {
    print(evt.WidgetId())
    print(evt.State())
}

if (evt.Is("chat_send")) {
    message = evt.Value()
    eventbus::Notify("Toba", "Message recu: " $ message)
}
```

Pour une fenetre interactive fiable, utiliser le demarrage bridge de `webui`:

```toba
import : libwebui / webui

page = webui::CompactPage()
page.SetTitle("Petit outil")
page.SetPort(19190)
page.AddHtml("<div class='gallery-code'>Pret</div>")
page.ShowReliable("C:/Toba/modules/libwebui/examples/petit_outil_debug.html")

loop {
    raw = webui::PollRaw(10)
    if (size(raw) > 0) {
        name = webui::EventName(raw)
        value = webui::EventValue(raw)
    }
    sleep(0.01)
}
```

`ShowReliable(debugPath)` est le chemin recommande pour les nouvelles apps: il demarre le bridge, vide la file d'evenements, genere le HTML et ouvre la fenetre dans le bon ordre.

`CompactPage` est prevu pour les petites fenetres outil sans sidebar ni vue "gallery". `Page` garde la vue multi-panneaux avec menu lateral.

Exemples reels:

```json
{"type":"event","name":"save_clicked","widgetId":"save_clicked","args":["save_clicked"],"data":{"id":"save_clicked"},"timestamp":1780000000000}
{"type":"event","name":"collapse_open","widgetId":"details","args":["details","open"],"data":{"id":"details","state":"open"},"timestamp":1780000000000}
{"type":"event","name":"collapse_close","widgetId":"details","args":["details","closed"],"data":{"id":"details","state":"closed"},"timestamp":1780000000000}
{"type":"event","name":"dropdown_open","widgetId":"theme_menu","args":["theme_menu","open"],"data":{"id":"theme_menu","state":"open"},"timestamp":1780000000000}
{"type":"event","name":"chat_send","widgetId":"gallery_prompt","args":["gallery_prompt","hello"],"data":{"id":"gallery_prompt","value":"hello","text":"hello"},"timestamp":1780000000000}
```

## Eventbus

Module: `libwebui/eventbus`

Classe: `eventbus::UiEvent()`

Methodes:

- `FromJson(raw)`
- `HasEvent()`
- `Is(name)`
- `Name()`
- `WidgetId()`
- `Get(key, fallback)`
- `GetNumber(key, fallback)`
- `Arg(index, fallback)`
- `State()`
- `Value()`

Classe: `eventbus::UiCommand()`

Methodes:

- `Setup(action)`
- `SetJson(payload)`
- `Json()`
- `Execute()`

Helpers:

- `eventbus::New(raw)`
- `eventbus::Poll(timeoutMs)`
- `eventbus::Command(action)`
- `eventbus::Notify(title, text)`
- `eventbus::ChartAddPoint(label, value, secondary)`
- `eventbus::ChartReset()`
- `eventbus::SetCloseGuard(enabled, prompt)`
- `eventbus::AllowClose()`
- `eventbus::DenyClose()`

Exemple bidirectionnel:

```toba
evt = eventbus::Poll(50)
if (evt.HasEvent()) {
    if (evt.Is("callback_notify")) {
        eventbus::Notify("Callback Toba", "Widget: " $ evt.WidgetId())
    }
}

cmd = eventbus::Command("webuiNotify")
cmd.SetJson("{\"title\":\"Toba\",\"text\":\"Commande explicite.\"}")
cmd.Execute()
```

## Fermeture de fenetre

Le bridge fournit deux chemins de fermeture:

- fermeture WebUI recommandee: `webuiRequestClose()` ouvre une popup WebUI themable;
- fermeture native par la croix Windows: le navigateur declenche `beforeunload`, donc une confirmation native.

Important: `beforeunload` ne permet pas d'afficher une modale HTML a la place de la confirmation native du navigateur. Pour avoir une confirmation WebUI, utilisez le menu `Actions > Quitter` ou appelez:

```js
webuiRequestClose({source:'toolbar'})
```

Le bouton `Quitter` de la popup appelle `webuiAllowClose()`. Le bouton `Annuler` appelle `webuiDenyClose()`.

Evenements:

```json
{"type":"event","name":"window_close_request","widgetId":"window","args":["window","request"],"data":{"id":"window","state":"request"},"timestamp":1780000000000}
{"type":"event","name":"window_close_cancel","widgetId":"window","args":["window","cancel"],"data":{"id":"window","state":"cancel"},"timestamp":1780000000000}
{"type":"event","name":"window_close_confirm","widgetId":"window","args":["window","confirm"],"data":{"id":"window","state":"confirm"},"timestamp":1780000000000}
{"type":"event","name":"window_closing","widgetId":"window","args":["window","closing"],"data":{"id":"window","state":"closing"},"timestamp":1780000000000}
{"type":"event","name":"window_closed","widgetId":"window","args":["window","closed"],"data":{"id":"window","state":"closed"},"timestamp":1780000000000}
```

Exemple:

```toba
eventbus::SetCloseGuard(1, "Demander l'autorisation a Toba avant de quitter ?")

evt = eventbus::Poll(50)
if (evt.Is("window_close_request")) {
    eventbus::Notify("Fermeture demandee", "La popup WebUI est ouverte.")
}
if (evt.Is("window_close_confirm")) {
    break
}
```

## CompactPage

Classe: `webui::CompactPage()`

Pour les petites fenetres outil sans sidebar. Le header contient le titre, le selecteur de theme et l'etat du bridge.

Methodes:

- `SetTitle(title)`
- `SetFooter(footer)`
- `SetPort(port)`
- `SetWindow(width, height, x, y)`
- `SetSize(width, height)`
- `SetPosition(x, y)`
- `Normal()`
- `Maximized()`
- `Add(widget)`
- `AddHtml(html)`
- `Render()`
- `ShowReliable(debugPath)`

Exemple:

```toba
page = webui::CompactPage()
page.SetTitle("Voice Clone Simple")
page.SetPort(19189)
page.SetWindow(1040, 430, 180, 120)
// page.Maximized()
page.Add(fields)
page.ShowReliable("C:/Toba/modules/libwebui/examples/simple_voice_clone_debug.html")
```

Notes fenetre:

- `SetWindow(width,height,x,y)` definit taille et position.
- `SetSize(width,height)` change seulement la taille.
- `SetPosition(x,y)` change seulement la position.
- `Normal()` garde une fenetre normale.
- `Maximized()` ouvre une grande fenetre de travail via size/position. Le binding actuel expose `webui_set_size` et `webui_set_position`, pas un vrai appel DLL de maximisation native.
- `CustomChrome()` ajoute une barre de fenetre WebUI themable et demande a la DLL native `toba_window_bridge` de retirer le cadre systeme. Les boutons de fenetre envoient `native_window_action`, que `webui::HandleNativeWindowEvent(raw,title)` transforme en appel natif.

Notes natives:

- Windows est implemente avec Win32 dans `native/toba_window_bridge.c`.
- Linux et macOS exposent la meme ABI mais retournent actuellement non supporte tant qu'un handle de fenetre WebUI stable n'est pas disponible.

## Page

Classe: `webui::Page()`

Methodes:

- `SetTitle(title)`
- `SetFooter(footer)`
- `SetPort(port)`
- `SetWindow(width, height, x, y)`
- `SetSize(width, height)`
- `SetPosition(x, y)`
- `Normal()`
- `Maximized()`
- `AddPanel(panel)`
- `Render()`
- `Show()`
- `ShowReliable(debugPath)`
- `Run()`

Evenements:

- `show_<panelId>` quand un panneau est selectionne.
- Tous les evenements des widgets enfants remontent avec le format JSON ci-dessus.

## Panel

Classe: `webui::Panel()`

Methodes:

- `Setup(id, title, value, note)`
- `Add(widget)`
- `AddText(text)`
- `Close()`

Evenements:

- `show_<id>` quand le panneau devient actif.

Imbrication:

- Tout objet ayant une propriete `.html` peut etre ajoute avec `Add(widget)`.

## Stats

Classe: `webui::Stats()`

Methodes:

- `Add(label, value, note)`
- `Close()`

Evenements:

- Aucun. Widget d'affichage.

## CardGrid

Classe: `webui::CardGrid()`

Methodes:

- `AddCard(title, sub, text)`
- `Close()`

Evenements:

- Aucun. Widget d'affichage.

## Toolbar

Classe: `webui::Toolbar()`

Methodes:

- `Right()`
- `Button(id, text, icon, eventName, kind)`
- `IconButton(id, icon, eventName)`
- `Separator()`
- `Close()`

Aligner une toolbar a droite:

```toba
toolbar = webui::Toolbar()
toolbar.Right()
toolbar.Button("create_voice", "Creer .voice", "save", "create_voice", "primary")
toolbar.Button("test_play", "Tester", "play", "test_play", " ")
toolbar.Close()
```

Evenement bouton:

```json
{"type":"event","name":"save_clicked","widgetId":"save_clicked","args":["save_clicked"],"timestamp":1780000000000}
```

## Dropdown

Classe: `webui::Dropdown()`

Methodes:

- `Setup(id, label)`
- `Option(text, eventName, active)`
- `Close()`

Evenements:

- `dropdown_open`, data `{id, state:"open"}`
- `dropdown_close`, data `{id, state:"closed"}`
- `eventName` quand une option est choisie.

Exemple:

```json
{"type":"event","name":"dropdown_open","widgetId":"theme_menu","args":["theme_menu","open"],"data":{"id":"theme_menu","state":"open"},"timestamp":1780000000000}
{"type":"event","name":"theme_midnight","widgetId":"theme_midnight","args":["theme_midnight"],"timestamp":1780000000000}
```

## Fields

Classe: `webui::Fields()`

Methodes:

- `PillInput(id, label, value, eventName)`
- `PillSelect(id, label, options, eventName)`
- `FilePicker(id, label, value, accept, eventName)`
- `Slider(id, label, value, minValue, maxValue, funcName, valueId)`
- `EventLog()` pour diagnostic uniquement
- `Close()`

Evenements:

- `PillInput` et `PillSelect` emettent `eventName`.
- `FilePicker` emet `eventName`; l'application Toba ouvre ensuite le dialogue natif et peut mettre a jour l'affichage avec la commande JS `webuiSetFilePicker`.
- `Slider` appelle une fonction JS, par exemple `gallerySetRadiusPx(value)`. Les fonctions de reglage existantes emettent ensuite `radius_px_<value>` ou `spacing_px_<value>`.

Le `FilePicker` est un widget d'affichage/evenement. L'ouverture du dialogue natif reste faite cote Toba, puis l'affichage est mis a jour avec:

```toba
cmd = eventbus::Command("webuiSetFilePicker")
cmd.SetJson("{\"id\":\"audio_path\",\"path\":\"C:/audio/test.wav\"}")
cmd.Execute()
```

## Themes

`CompactPage` ajoute automatiquement le selecteur de theme dans le header.

Themes disponibles dans `widgets::ThemeDropdown()`:

- `light_modern`
- `ocean_dark`
- `ember_dark`
- `forest_dark`
- `rose_light`
- `dracula_dark`
- `nord_light`
- `graphite_dark`
- `shadcn_light`
- `shadcn_dark`

Le choix appelle `tmPickTheme(...)`, qui applique `data-theme` sur le `body`.

## Tabs

Classe: `webui::Tabs()`

Methodes:

- `Tab(id, text, count, active)`
- `TabCount(id, text, count, active)`
- `Close()`

Evenement:

- `table_tab_<id>`.

Classe: `webui::TabView()`

Methodes:

- `Add(id, text, count, active, widget)`
- `AddHtml(id, text, count, active, html)`
- `Close()`

Evenement:

- `tab_<id>`, data `{id, value}`.

Usage:

```toba
tabs = webui::TabView()
tabs.Add("graph", "Graph", "live", 1, chartWidget)
tabs.Add("video", "Video player", "new", 0, videoPlayer)
tabs.Close()
panel.AddHtml(tabs.html)
```

## Table

Classe: `webui::Table()`

Methodes:

- `AddSection(header, sectionType, status, statusKind, target, limit, reviewer, eventName)`
- `Close()`

Parametres:

- `statusKind`: `done`, `busy`, ou classe CSS compatible.
- `reviewer`: texte libre. La valeur `Assign reviewer` affiche un dropdown.
- `eventName`: base des actions de ligne.

Evenements:

- `table_select`
- `table_select_all`
- `<eventName>_open`
- `<eventName>_duplicate`
- `assign_eddie`
- `assign_jamik`
- `assign_marie`

## TableDemo

Classe: `webui::TableDemo()`

Methodes:

- `AddTop(tabs, dropdown)`
- `AddTable(table)`
- `AddPagination()`
- `Close()`

Evenements:

- `page_first`
- `page_prev`
- `page_next`
- `page_last`
- `page_10`
- `page_25`
- `page_50`

## VideoPlayer

Classe: `webui::VideoPlayer()`

Lecteur HTML5 avec controles custom libwebui. Les controles natifs du navigateur ne sont pas utilises, ce qui permet d'appliquer les themes, radius et espacements globaux.

Methodes:

- `Setup(id, title, source, poster, note)`
- `Close()`

Parametres:

- `id`: identifiant du lecteur video.
- `title`: titre affiche dans la carte.
- `source`: chemin local ou URL compatible HTML5 (`mp4`, `webm`, etc.). Si `source + ".b64"` existe, le lecteur embarque cette version en `data:video/mp4;base64,...` avant de tenter le chemin local.
- Pour les MP4, privilegier H.264/`avc1`. Les anciens fichiers `mp4v` peuvent etre refuses par Edge/WebView avec `MEDIA_ERR_SRC_NOT_SUPPORTED`.
- `poster`: image d'attente optionnelle, mettre `" "` si inutile.
- `note`: sous-titre du widget.

Evenements:

- `video_loaded`, data `{id, value:duration}`
- `video_play`, data `{id, value:currentTime}`
- `video_pause`, data `{id, value:currentTime}`
- `video_ended`, data `{id, state:"ended"}`
- `video_time`, data `{id, value:currentTime}`
- `video_play_request`
- `video_pause_request`
- `video_seek_start`
- `video_seek`
- `video_mute_toggle`
- `video_fullscreen`

Usage:

```toba
video = webui::VideoPlayer()
video.Setup("intro_video", "Video player", "C:/videos/intro.mp4", " ", "HTML5 video component")
video.Close()
```

## VideoTable

Classe: `webui::VideoTable()`

Methodes:

- `AddVideo(title, source, kind, status, eventName)`
- `Close()`

Evenements:

- `<eventName>_select`, data `{id:eventName, value:title}`
- `<eventName>_inspect`, data `{id:eventName, value:source}`

Ce widget reste disponible pour lister plusieurs medias, mais la rubrique `Advanced` utilise maintenant `webui::VideoPlayer()` pour afficher un vrai lecteur.

## Chart

Classe: `webui::Chart()`

Methodes:

- Aucune pour l'instant. Le widget construit un graphe Chart.js local.

Evenements vers Toba:

- `chart_add_point`
- `chart_add_burst`
- `chart_start_stream`
- `chart_stop_stream`
- `chart_reset`

Commandes Toba vers UI:

```toba
eventbus::ChartAddPoint("Toba 1", 42, 30)
eventbus::ChartReset()
```

## Navigation

Classe: `webui::Navigation()`

Methodes:

- `Build()`

Widgets inclus:

- Profile dropdown
- Treeview
- Collapse
- Accordion

Evenements profile:

- `profile_open`, data `{id:"profile", state:"open"}`
- `profile_close`, data `{id:"profile", state:"closed"}`
- `upgrade`
- `account`
- `billing`
- `notifications`
- `logout`

Evenements treeview:

- `tree_open`, data `{id:label, label, state:"open"}`
- `tree_close`, data `{id:label, label, state:"closed"}`
- `tree_button`
- `tree_dropdown`
- `tree_table`
- `tree_chart`
- `tree_dock`
- `tree_grid`
- `tree_gallery`

Evenements collapse:

- `collapse_open`, data `{id, state:"open"}`
- `collapse_close`, data `{id, state:"closed"}`

Evenements accordion:

- `accordion_open`, data `{id:label, label, state:"open"}`
- `accordion_close`, data `{id:label, label, state:"closed"}`

## Chat

Classe: `webui::Chat()`

Methodes:

- `Build()`

Evenement:

- `chat_send`, data `{id:"gallery_prompt", value:message, text:message}`

## Code

Classe: `webui::Code()`

Methodes:

- `Text(text)`

Evenements:

- Aucun. Widget d'affichage.

## Markdown

Classe: `webui::Markdown()`

Methodes:

- `Text(markdown)`
- `LoadFile(path)`

Markdown supporte actuellement:

- titres `#`, `##`, `###`
- listes `- item`
- blocs code avec triple backticks
- code inline avec backticks

Evenements:

- Aucun. Widget d'affichage.

## DataPanel

Classe: `widgets::DataPanel()`

Methodes:

- `Setup(id)`
- `AddToolButton(label, icon, onClickJs)`
- `SetSearchBox(placeholder)`
- `TreeNode(label, badge, open)`
- `TreeLeaf(label, onClickJs)`
- `TreeEnd()`
- `SetColumns(cols)`
- `AddRow(cells, onClickJs)`
- `Render()`

Evenements vers Toba:

- `datapanel_search`, data `{id, value}`
- `datapanel_tree_toggle`, data `{id, label}`
- `datapanel_tree_leaf`, data `{id, label}`
- `datapanel_row_action`, data `{id, value}`

## ChatBar

Classe: `widgets::ChatBar()`

Methodes:

- `Setup(id, placeholder, sendJs)`
- `AddPill(key, icon, label)`
- `AddPillBadge(key, icon, label, badge)`
- `AddPanel(key, title, html)`
- `Render()`

Inclure une fois dans la page:

- `widgets::ChatBarStyles()`
- `widgets::ChatBarScript()`

Evenements vers Toba:

- `chatbar_panel_open`, data `{id, value, state:"open"}`
- `chatbar_panel_close`, data `{id, value, state:"closed"}`

## Commandes UI disponibles

Toba peut appeler des fonctions JS exposees par le runtime:

```toba
eventbus::Notify("Toba", "Notification depuis Toba.")
eventbus::ChartAddPoint("P1", 64, 51)
eventbus::ChartReset()
```

Alias de compatibilite:

- `galleryNotify`
- `galleryChartAddPoint`
- `galleryChartReset`

Ces alias existent pour les anciens exemples, mais le nouveau nom public est `webui...`.

## Exemple callback Toba

```toba
func: OnWebuiEvent(evt) {
    if (evt.Is("callback_notify")) {
        eventbus::Notify("Toba callback", "Notification depuis Toba.")
    }
    return (1)
}
```
