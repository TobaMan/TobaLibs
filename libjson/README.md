# libjson

Lecteurs JSON légers pour Toba. Lecteur pratique d'objets JSON **plats**, pensé pour
les événements du bridge WebUI. Évite au maximum les littéraux de guillemets (le
system d'échappement de chaînes de Toba est fragile — voir le guide, piège P7).

## Installation / usage

```
import : libjson / json
js   = "{\"name\":\"increment\",\"count\":42}"
name = json::GetString(js, "name", "")     // "increment"
n    = json::GetNumber(js, "count", 0)      // 42
```

## Fonctions principales (lecture)

| Fonction | Retour | Description |
|----------|--------|-------------|
| `HasKey(js, key)` | 0 / 1 | 1 si le texte JSON contient la clé. |
| `GetRaw(js, key, fallback)` | string | Texte brut de la valeur (guillemets/accolades conservés), ou `fallback`. |
| `GetString(js, key, fallback)` | string | Valeur chaîne (déguillemetée, déséchappée), ou `fallback`. |
| `GetNumber(js, key, fallback)` | nombre | Valeur numérique, ou `fallback`. |
| `GetBool(js, key, fallback)` | 0 / 1 | 1 pour `true`, 0 pour `false`, sinon `fallback`. |
| `GetArrayString(js, key, idx, fallback)` | string | Élément `idx` du tableau à `key`, ou `fallback`. |

## Helpers (bas niveau)

| Fonction | Description |
|----------|-------------|
| `TextOrEmpty(value)` | Renvoie `value` en texte (`""` si ni chaîne ni nombre). |
| `ValueStart(js, key)` | Index où commence la valeur de `key` (après `:`), ou -1. |
| `FindValueEnd(js, start)` | Fin de la valeur (respecte les strings, `[]`, `{}`). |
| `FindColonAfter(js, start)` | Index du `:` après `start`, ou -1. |
| `InnerBlock(raw)` / `StripOuter(s)` | Retire les caractères/guillemets extérieurs. |
| `SplitObjects(arrayRaw)` | Découpe un tableau JSON d'objets en liste de textes. |
| `TrimSpaces(s)` / `Unescape(s)` | Nettoyage des espaces / des échappements JSON. |

## Robustesse

Une virgule **dans** une valeur chaîne (`"bien, merci"`) ne tronque pas la valeur :
`FindValueEnd` suit l'état "dans une string". Testé.

## Test

```
cd C:\Toba
Toba.exe C:\Toba\modules\libjson\test_json.to editor
```

Doit afficher les résultats attendus sans `error(`.
