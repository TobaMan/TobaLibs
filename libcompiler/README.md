Voici un fichier `README.md` généré en fonction de ma précédente réponse :

```markdown
# LibCompiler

This directory contains libraries and classes for managing and configuring various compilers like Clang, GCC, and TCC. These libraries are developed as part of the **Toba** language and provide abstractions for configuring, executing, and measuring compiler performance.

## Directory Content

- **`compiler.to`**: A base class for compilers, offering generic functionality for configuration and execution.
- **`compiler_clang.to`**: A specific class for interacting with the Clang compiler.
- **`compiler_gcc.to`**: A specific class for interacting with the GCC compiler.
- **`compiler_tcc.to`**: A specific class for interacting with the TCC compiler.
- **`Compilers/`**: Contains the executables of the supported compilers.
- **`Examples/`**: Contains example source files for testing the compilers.

## Features

### `Compiler` Class
The main `Compiler` class provides generic methods:
- Configure compilation options (`SetO0`, `SetO1`, `SetO2`, etc.).
- Generate executables (`BuildExe`).
- Generate shared libraries (`BuildSharedLib`).
- Measure the execution time of a code block (`Timing`).

#### Usage Example
```toba
cpl = Compiler()
cpl.SetPath("path/to/compiler")
cpl.SetSourceFile("main.c")
cpl.Set64bits()
cpl.SetO2()
cpl.BuildExe()
```

### `Clang` Class
The `Clang` class offers specific functionalities for the Clang compiler:
- Advanced configuration options like `-Ofast` or `-fopenmp`.

#### Usage Example
```toba
clang = Clang()
clang.SetSourceFile("examples/test.c")
clang.Set64bits()
clang.SetFast()
clang.BuildExe()
```

### `GCC` Class
The `GCC` class allows configuring and executing the GCC compiler.

#### Usage Example
```toba
gcc = GCC()
gcc.SetSourceFile("examples/test.c")
gcc.Set32bits()
gcc.SetO3()
gcc.BuildExe()
```

### `TCC` Class
The `TCC` class provides methods for using the Tiny C Compiler (TCC).

#### Usage Example
```toba
tcc = TCC()
tcc.SetSourceFile("examples/test.c")
tcc.Set64bits()
tcc.BuildExe()
```

## Notes
- Ensure that the compiler executables (e.g., `clang.exe`, `gcc.exe`, etc.) are available in the `Compilers/` folder.
- All files are licensed under the MIT license.
```

