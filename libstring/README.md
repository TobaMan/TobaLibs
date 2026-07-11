# libstring

Utilitaires de chaînes pour Toba. Complète les natives (`size`, `find`, `slice`,
`freplace`) avec les opérations de chaîne courantes qui manquent. Style Toba : un
seul `return` par fonction, constantes en fonctions accesseurs.

> `find(s, pattern)` renvoie la **liste** des positions (vide si absent).

## Installation / usage

```
import : libstring / string
n = string::Upper("hello")     // "HELLO"
```

## Fonctions

### Constantes
| Fonction | Retour | Description |
|----------|--------|-------------|
| `Lowercase()` | string | `"abc...z"`. |
| `Uppercase()` | string | `"ABC...Z"`. |
| `Spaces()` | string | Les caractères d'espacement (` \t\n\r`). |

### Tests
| Fonction | Retour | Description |
|----------|--------|-------------|
| `IsEmpty(s)` | 0 / 1 | 1 si `s` est vide. |
| `Contains(s, pattern)` | 0 / 1 | 1 si `pattern` est présent dans `s`. |
| `StartsWith(s, prefix)` | 0 / 1 | 1 si `s` commence par `prefix`. |
| `EndsWith(s, suffix)` | 0 / 1 | 1 si `s` finit par `suffix`. |
| `IsSpace(c)` | 0 / 1 | 1 si `c` est un caractère d'espacement. |

### Casse
| Fonction | Retour | Description |
|----------|--------|-------------|
| `Upper(s)` | string | Convertit en majuscules. |
| `Lower(s)` | string | Convertit en minuscules. |

### Manipulation
| Fonction | Retour | Description |
|----------|--------|-------------|
| `Repeat(s, times)` | string | Répète `s` `times` fois. |
| `Reverse(s)` | string | Inverse la chaîne. |
| `Replace(s, target, replacement)` | string | Remplace toutes les occurrences de `target`. |

### Trim
| Fonction | Retour | Description |
|----------|--------|-------------|
| `TrimLeft(s)` | string | Enlève l'espacement au début. |
| `TrimRight(s)` | string | Enlève l'espacement à la fin. |
| `Trim(s)` | string | Enlève l'espacement aux deux extrémités. |

### Split / Join
| Fonction | Retour | Description |
|----------|--------|-------------|
| `Split(s, separator)` | liste (MAPTYPE) | Découpe `s` sur `separator`. |
| `Join(list, separator)` | string | Concatène les éléments de `list` avec `separator`. |

## Test

```
cd C:\Toba
Toba.exe C:\Toba\modules\libstring\test_string.to editor
```

Doit afficher les résultats attendus sans `error(`.