# libvalidate

Validateurs de chaînes utiles pour les parseurs et petits langages. Style Toba :
un seul `return`, pas de variable au niveau module.

## Installation / usage

```
import : libvalidate / validate
ok = validate::IsIdentifier("name_1")    // 1
```

## Fonctions

### Constantes
| Fonction | Retour | Description |
|----------|--------|-------------|
| `Digits()` | string | `"0123456789"`. |
| `Letters()` | string | Les 52 lettres ASCII (a-z A-Z). |
| `IdentifierExtra()` | string | Caractères supplémentaires autorisés dans un identifiant (`"_"`). |

### Caractères
| Fonction | Retour | Description |
|----------|--------|-------------|
| `IsDigitChar(c)` | 0 / 1 | 1 si `c` est un chiffre. |
| `IsLetterChar(c)` | 0 / 1 | 1 si `c` est une lettre ASCII. |
| `IsIdentifierStart(c)` | 0 / 1 | 1 si `c` peut débuter un identifiant (lettre ou `_`). |
| `IsIdentifierChar(c)` | 0 / 1 | 1 si `c` peut apparaître dans un identifiant (lettre, chiffre ou `_`). |

### Chaînes
| Fonction | Retour | Description |
|----------|--------|-------------|
| `IsIntegerText(s)` | 0 / 1 | 1 si `s` est un entier valide (`-` optionnel). |
| `IsIdentifier(s)` | 0 / 1 | 1 si `s` est un identifiant valide. |
| `IsOneOf(s, values)` | 0 / 1 | 1 si `s` fait partie des `values`. |
| `IsInRange(value, lo, hi)` | 0 / 1 | 1 si `lo <= value <= hi`. |

## Test

```
cd C:\Toba
Toba.exe C:\Toba\modules\libvalidate\test_validate.to editor
```

Doit afficher les résultats attendus sans `error(`.