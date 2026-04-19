# libtime - Bibliothèque de gestion du temps pour Toba

## Description
Module officiel pour la gestion du temps dans le langage Toba. Fournit des fonctionnalités pour :
- Obtenir la date et l'heure actuelles
- Manipuler des timestamps
- Formater et parser des dates
- Gérer des durées
- Mettre en pause l'exécution (sleep)

## Installation
Copiez le fichier `time.to` dans le dossier `modules/` à la racine de l'exécutable Toba.

## Utilisation

```toba
import time;

// Obtenir le timestamp actuel
let timestamp = Time.now();

// Obtenir la date et heure actuelles
let dt = Time.currentDateTime();
println("Année: " + dt.year);
println("Mois: " + dt.month);
println("Jour: " + dt.day);

// Créer une durée
let duration = Time.durationFromSeconds(60);

// Sleep pendant 500 millisecondes
Time.sleep(500);

// Formater une date
let formatted = Time.format(dt, "YYYY-MM-DD HH:MM:SS");
```

## API

### Structures
- **DateTime** : Représente un instant précis (année, mois, jour, heure, minute, seconde, milliseconde)
- **Duration** : Représente une durée (secondes, millisecondes)

### Fonctions principales
- `now()` → `long` : Timestamp actuel
- `currentDateTime()` → `DateTime` : Date et heure actuelles
- `timestampToDateTime(timestamp: long)` → `DateTime` : Conversion timestamp vers DateTime
- `dateTimeToTimestamp(dt: DateTime)` → `long` : Conversion DateTime vers timestamp
- `format(dt: DateTime, formatStr: string)` → `string` : Formate un DateTime
- `parse(dateStr: string, formatStr: string)` → `DateTime` : Parse une chaîne en DateTime
- `durationFromSeconds(seconds: long)` → `Duration` : Crée une durée depuis des secondes
- `durationFromMilliseconds(ms: long)` → `Duration` : Crée une durée depuis des millisecondes
- `addDuration(dt: DateTime, duration: Duration)` → `DateTime` : Ajoute une durée à un DateTime
- `difference(start: DateTime, end: DateTime)` → `Duration` : Différence entre deux dates
- `sleep(milliseconds: int)` : Pause l'exécution
- `sleepSeconds(seconds: int)` : Pause l'exécution en secondes

## Tests
Pour exécuter les tests unitaires :
```bash
toba libtime/tests.to
```

## Licence
MIT
