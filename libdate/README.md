# libdate

Module date/heure pour Toba. Construit sur la native `dtime()` qui renvoie un
tableau de taille 6 : `[0]=année [1]=mois [2]=jour [3]=heure [4]=minute [5]=seconde`.
Style Toba : un seul `return` par fonction.

## Installation / usage

```
import : libdate / date
d = date::Now()                  // [2026, 7, 11, 9, 48, 0]
s = date::NowString()            // "11/07/2026 09:48:00"
```

## Fonctions

### Constantes
| Fonction | Retour | Description |
|----------|--------|-------------|
| `MonthName(month)` | string | Nom du mois (1-12), sinon `""`. |
| `DaysInMonthTable(idx)` | entier | Jours par défaut du mois d'indice 0-11. |

### Accès à la date courante
| Fonction | Retour | Description |
|----------|--------|-------------|
| `Now()` | tableau | `[année, mois, jour, heure, minute, seconde]`. |
| `Year()` `Month()` `Day()` | entier | Composante courante. |
| `Hour()` `Minute()` `Second()` | entier | Composante courante. |

### Année bissextile / nombre de jours
| Fonction | Retour | Description |
|----------|--------|-------------|
| `IsLeapYear(year)` | 0 / 1 | 1 si `year` est bissextile. |
| `DaysInMonth(month, year)` | entier | Nombre de jours du mois (gère février bissextile). |

### Formatage
| Fonction | Retour | Description |
|----------|--------|-------------|
| `Pad2(n)` | string | Nombre sur 2 chiffres (`5` → `"05"`). |
| `FormatDate(year, month, day)` | string | `JJ/MM/AAAA`. |
| `FormatTime(hour, minute, second)` | string | `HH:MM:SS`. |
| `NowString()` | string | `"JJ/MM/AAAA HH:MM:SS"` de l'instant courant. |

## Test

```
cd C:\Toba
Toba.exe C:\Toba\modules\libdate\test_date.to editor
```

Doit afficher les résultats attendus sans `error(`.