# libtype

Gardes de type et helpers d'affichage pour Toba. Rend les vérifications de type
lisibles. Style Toba : un seul `return` par fonction.

## Installation / usage

```
import : libtype / type
name = type::TypeName(42)        // "number"
```

## Fonctions

| Fonction | Retour | Description |
|----------|--------|-------------|
| `TypeName(value)` | string | Nom du type : `number` / `string` / `map` / `object` / `function` / `enum` / `archive`. |
| `IsScalar(value)` | 0 / 1 | 1 si `value` est un nombre ou une chaîne. |
| `IsContainer(value)` | 0 / 1 | 1 si `value` est un conteneur (chaîne ou map). |
| `IsCallable(value)` | 0 / 1 | 1 si `value` est une fonction. |
| `IsSameType(a, b)` | 0 / 1 | 1 si `a` et `b` ont le même type. |
| `ToText(value)` | string | Texte lisible de toute valeur (chaîne telle quelle, nombre via `strnum`, `[map:n]`...). |
| `StringOr(value, fallback)` | valeur | `value` si c'est une chaîne, sinon `fallback`. |
| `NumberOr(value, fallback)` | valeur | `value` si c'est un nombre, sinon `fallback`. |
| `IsBooleanNumber(value)` | 0 / 1 | 1 si `value` est le nombre 0 ou 1. |

## Test

```
cd C:\Toba
Toba.exe C:\Toba\modules\libtype\test_type.to editor
```

Doit afficher les résultats attendus sans `error(`.