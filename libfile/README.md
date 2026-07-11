# libfile

Utilitaires système de fichiers pour Toba. Construit sur les natives `fsreadf`,
`fswritef`, `fsremove`, `fstype`, `fspath`. Style Toba : un seul `return`, gardes de
type via `isstr` / `fstype`.

> `fsreadf` renvoie `null` si le fichier n'existe pas (`isstr(...) == 0`).
> `fstype` : 0 = inexistant, 1 = fichier, 2 = dossier.

## Installation / usage

```
import : libfile / file
file::Write("data.txt", "hello")
content = file::Read("data.txt")     // "hello"
```

## Fonctions

### Existence et type
| Fonction | Retour | Description |
|----------|--------|-------------|
| `Exists(path)` | 0 / 1 | 1 si le chemin existe (fichier ou dossier). |
| `IsFile(path)` | 0 / 1 | 1 si c'est un fichier. |
| `IsDir(path)` | 0 / 1 | 1 si c'est un dossier. |

### Lecture
| Fonction | Retour | Description |
|----------|--------|-------------|
| `Read(path)` | string | Contenu complet du fichier (`""` si absent). |
| `ReadLines(path)` | liste (MAPTYPE) | Liste des lignes. |
| `CountLines(path)` | entier | Nombre de lignes (0 si absent). |

### Écriture
| Fonction | Retour | Description |
|----------|--------|-------------|
| `Write(path, content)` | 0 / 1 | Écrit (remplace) le fichier. 1 si ok. |
| `Append(path, content)` | 1 | Ajoute à la fin (crée si absent). |
| `AppendLine(path, line)` | 1 | Ajoute une ligne (avec saut de ligne). |

### Suppression et copie
| Fonction | Retour | Description |
|----------|--------|-------------|
| `Delete(path)` | 0 / 1 | Supprime un fichier. 1 si supprimé. |
| `Copy(source, destination)` | 0 / 1 | Copie un fichier. 1 si ok. |

### Chemins système
| Fonction | Retour | Description |
|----------|--------|-------------|
| `TobaDir()` | string | Dossier de l'exécutable Toba. |
| `ModulesDir()` | string | Dossier des modules Toba. |

## Test

```
cd C:\Toba
Toba.exe C:\Toba\modules\libfile\test_file.to editor
```

Le test crée, lit puis supprime un fichier temporaire. Doit afficher les résultats
attendus sans `error(`.