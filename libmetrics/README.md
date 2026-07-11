# libmetrics

Pont vers des métriques système natives et un superviseur de process pour Toba,
via une DLL native. Expose un serveur WebSocket de métriques + le démarrage/arrêt
fiable d'un binaire (par HANDLE natif, pas par chasse au PID).

## Dépendance native

- Windows : `metrics_ws_win64_v7.dll` (doit être présent dans `libmetrics/`).
- Backends futurs : `metrics_ws_linux64.so`, `metrics_ws_macos.dylib`.

> Sans la DLL, les appels échouent proprement (valeurs neutres / `""`).

## Installation / usage

```
import : libmetrics / metrics
metrics::Start(19101)
json = metrics::Snapshot()
```

## Fonctions — serveur de métriques

| Fonction | Retour | Description |
|----------|--------|-------------|
| `Start(port)` | code | Démarre le serveur WebSocket de métriques sur `port`. |
| `Stop()` | code | Arrête le serveur. |
| `IsRunning()` | 0 / 1 | 1 si le serveur tourne. |
| `Snapshot()` | string (JSON) | Métriques courantes (`""` en cas d'échec). |
| `LastError()` | string | Dernier message d'erreur. |
| `ClientCount()` | entier | Clients WebSocket connectés. |
| `SentCount()` | entier | Messages envoyés. |
| `AcceptCount()` | entier | Connexions acceptées. |
| `HandshakeFailCount()` | entier | Handshakes WebSocket échoués. |
| `ClientThreadCount()` | entier | Threads clients actifs. |
| `SendFailCount()` | entier | Envois échoués. |

## Fonctions — superviseur de process

| Fonction | Retour | Description |
|----------|--------|-------------|
| `ProcStart(cmdline)` | PID / 0 | Lance un binaire (garde son HANDLE). PID > 0, ou 0 si échec. |
| `ProcStop()` | 0 / 1 | Tue le process géré. 1 si mort confirmée. |
| `ProcIsAlive()` | 0 / 1 | 1 si le process géré est vivant. |
| `ProcPid()` | entier | PID du process géré (0 si aucun). |
| `ProcLastError()` | string | Erreur du dernier `ProcStart`/`ProcStop`. |

## Helpers

| Fonction | Description |
|----------|-------------|
| `NativePath()` | Chemin de la DLL native. |
| `NativeLib()` | Ouvre la DLL (`dlopen`). |

## Test

```
cd C:\Toba
Toba.exe C:\Toba\modules\libmetrics\test_metrics.to editor
```

Le test **ne démarre pas** le serveur : il vérifie seulement que le module se charge
et qu'un appel en lecture répond sans erreur.
