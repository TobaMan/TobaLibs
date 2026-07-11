# libmath

Utilitaires mathématiques pour Toba. Complète les fonctions natives (`abs`, `sqrt`,
`pow`, `sin`, `cos`, `log`, `floor`, `ceil`, `rand`) avec les utilitaires courants
qui manquent. Style Toba : un seul `return` par fonction.

## Installation / usage

```
import : libmath / math
m = math::Max(3, 7)      // 7
```

## Fonctions

### Constantes
| Fonction | Retour | Description |
|----------|--------|-------------|
| `Pi()` | `3.14159265358979` | Valeur de π. |

### Min / Max / Clamp
| Fonction | Retour | Description |
|----------|--------|-------------|
| `Min(a, b)` | nombre | Le plus petit de `a`, `b`. |
| `Max(a, b)` | nombre | Le plus grand de `a`, `b`. |
| `Clamp(value, lo, hi)` | nombre | Borne `value` entre `lo` et `hi`. |

### Arrondi / signe
| Fonction | Retour | Description |
|----------|--------|-------------|
| `Round(x)` | entier | Arrondi à l'entier le plus proche. |
| `Sign(x)` | -1 / 0 / 1 | Signe de `x`. |

### Conversions d'angle
| Fonction | Retour | Description |
|----------|--------|-------------|
| `DegToRad(degrees)` | nombre | Degrés → radians. |
| `RadToDeg(radians)` | nombre | Radians → degrés. |

### Arithmétique entière
| Fonction | Retour | Description |
|----------|--------|-------------|
| `Gcd(a, b)` | entier | Plus grand commun diviseur (Euclide). |
| `Lcm(a, b)` | entier | Plus petit commun multiple. |
| `Factorial(n)` | entier | `n!` pour `n >= 0`. |
| `IsEven(n)` | 0 / 1 | 1 si `n` est pair. |

### Statistiques (sur un tableau)
| Fonction | Retour | Description |
|----------|--------|-------------|
| `Sum(tab)` | nombre | Somme des éléments. |
| `Average(tab)` | nombre | Moyenne (0 si tableau vide). |
| `MinOf(tab)` | nombre | Plus petite valeur du tableau. |
| `MaxOf(tab)` | nombre | Plus grande valeur du tableau. |

## Test

```
cd C:\Toba
Toba.exe C:\Toba\modules\libmath\test_math.to editor
```

Doit afficher les résultats attendus sans `error(`.