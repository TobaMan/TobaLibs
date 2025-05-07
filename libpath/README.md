# LibPath

The `libpath` directory contains a library written in the **Toba** programming language for handling file paths. This library provides various utility functions to manipulate and interact with file paths, making it easier to work with directories and files in a cross-platform manner.

## Features

The `path.to` file includes the following functionalities:

1. **Path Formatting**
   - `CmdPath(path)`: Formats a given path to be suitable for Shell commands.

2. **Directory Handling**
   - `GetPath2(path)`: Retrieves the directory name of the given pathname.
   - `GetPath(path)`: Retrieves the directory name with a trailing slash.
   - `GetParent(path)`: Retrieves the parent directory of the given pathname.

3. **File Name Extraction**
   - `GetName(path)`: Extracts the file name from the given pathname.
   - `GetExt(path)`: Retrieves the file extension from the pathname.
   - `RemoveExt(path)`: Removes the file extension from the pathname.

4. **File Search**
   - `FindFile(pathlist, name)`: Searches for a file in a list of possible locations.

## Usage Examples

### Path Formatting for Shell Commands
```toba
path = "C:\Users\Example\Documents"
shellPath = CmdPath(path)
// Output: "C:/Users/Example/Documents"
```

### Retrieving Directory Names
```toba
path = "/home/user/documents/file.txt"
directory = GetPath(path)
// Output: "/home/user/documents/"
```

### Extracting File Names and Extensions
```toba
path = "/home/user/documents/file.txt"
fileName = GetName(path)
// Output: "file.txt"

extension = GetExt(path)
// Output: ".txt"

fileWithoutExt = RemoveExt(path)
// Output: "/home/user/documents/file"
```

### Searching for a File
```toba
pathlist = ["/etc", "/usr/bin", "/home/user"]
fileName = "config.txt"
foundPath = FindFile(pathlist, fileName)
// Output: Returns the path where the file is found or exits the program if not found.
```

## Notes
- Ensure that all paths provided to the functions are well-formatted and valid.
- The library is licensed under the MIT license.

## License
This library is licensed under the terms of the MIT license. See [MIT License](https://opensource.org/licenses/MIT) for more details.