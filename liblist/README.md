# liblist

Helpers pour les listes Toba (valeurs `MAPTYPE`). Complète les natives `map`,
`size`, `find`, `slice`, `remove` avec les opérations de liste courantes. Style
Toba : un seul `return` par fonction.

## Installation / usage

```
import : liblist / list
xs = list::Push(list::Empty(), "hello")
n  = list::Count(xs)             // 1
```

## Fonctions

### Construction / état
| Fonction | Retour | Description |
|----------|--------|-------------|
| `Empty()` | liste | Nouvelle liste vide (`map(0,0)`). |
| `Count(items)` | entier | Nombre d'éléments. |
| `IsEmpty(items)` | 0 / 1 | 1 si la liste est vide. |
| `Push(items, value)` | liste | Liste avec `value` ajoutée à la fin. |

### Accès
| Fonction | Retour | Description |
|----------|--------|-------------|
| `First(items)` | élément | Premier élément (`null` si vide). |
| `Last(items)` | élément | Dernier élément (`null` si vide). |
| `GetOr(items, idx, fallback)` | élément | Élément à `idx`, ou `fallback` si hors bornes. |

### Recherche
| Fonction | Retour | Description |
|----------|--------|-------------|
| `IndexOf(items, value)` | entier | Position du premier `value`, ou -1. |
| `ContainsValue(items, value)` | 0 / 1 | 1 si `value` est présent. |

### Transformation
| Fonction | Retour | Description |
|----------|--------|-------------|
| `RemoveAt(items, idx)` | liste | Liste sans l'élément à `idx`. |
| `Take(items, count)` | liste | Les `count` premiers éléments. |
| `Drop(items, count)` | liste | Liste sans ses `count` premiers éléments. |
| `Reverse(items)` | liste | Liste en ordre inverse. |
| `Concat(left, right)` | liste | Concaténation des deux listes. |

## Test

```
cd C:\Toba
Toba.exe C:\Toba\modules\liblist\test_list.to editor
```

Doit afficher les résultats attendus sans `error(`.