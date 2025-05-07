# libcompiler/Examples

This directory contains example scripts for using the **Toba LibCompiler** library. These examples demonstrate how to configure, compile, and execute C code using various compilers like Clang, GCC, and TCC.

## Directory Structure

- **`compile.to`**: Demonstrates a basic compilation of a simple C program.
- **`compute.to`**: Shows dynamic generation, compilation, and execution of C code for computations.
- **`runexe.to`**: Demonstrates executing C code directly from a string.
- **`timing.to`**: Provides examples of measuring performance for different compilers using generated C code.

## Example Descriptions

### `compile.to`
This script uses the Clang compiler to compile a simple C file (`test.c`).

#### Code Example:
```toba
import : libcompiler / compiler_clang

cl = compiler_clang::Clang()
cl.SetSourceFile("test.c")
cl.Set64bits()
cl.SetO0()
cl.BuildExe()
```

---

### `compute.to`
This script defines a `CCompute` class to dynamically generate, compile, and execute C code for computations. It demonstrates creating a shared library and calling the compiled function with data.

#### Key Features:
- Generates C code dynamically.
- Compiles the code into a shared library.
- Executes the function using dynamic linking.

#### Usage Example:
```toba
code = "
int i;
for(i=0;i<size;i++){
    data[i] = i+1;
}
"
c = CCompute()
c.SetFunction(code)
c.Compile()
print(c.Call(array(10,0)))
```

---

### `runexe.to`
This script compiles and runs a simple "Hello World" program directly from a string.

#### Code Example:
```toba
import : libcompiler / compiler_clang

helloworld = "
#include <stdio.h>
#include <stdlib.h>
void main(void){
    printf('hello world !\\n');
    system('PAUSE');
}
"
c = compiler_clang::Clang()
c.ExecFromString(helloworld)
```

---

### `timing.to`
This script measures the performance of different compilers (GCC, Clang, TCC) by compiling and executing generated C code.

#### Key Features:
- Includes OpenMP for parallelism.
- Measures the execution time for tasks like array manipulations or Fibonacci calculations.

#### Usage Example:
```toba
Timing()
```

---

## Notes
- These examples require the corresponding compiler executables (e.g., Clang, GCC) to be installed.
- Ensure that the `libcompiler` library is properly configured in your Toba environment.

## License
These files are licensed under the MIT License. For more details, see [LICENSE](https://opensource.org/licenses/MIT).