# LibTest

The `libtest` directory contains utility libraries written in the **Toba** programming language for testing and validating code. This includes tools for executing tests, generating reports, and performing assertions.

## Directory Content

- **`process.to`**: Provides classes and methods to manage and execute file-based tests, as well as generate detailed reports.
- **`unittest.to`**: Contains utility functions for performing unit tests and making assertions.

## Features and Usage

### `process.to`
This file defines two main objects:
1. **File**:
   - Represents a file object used for testing.
   - Tracks the number of successful and failed tests.
   - Generates reports summarizing test results.

   #### Example:
   ```toba
   f = File()
   f.file = "test_file.to"
   f.nok = 5
   f.nko = 2
   f.Report()
   // Output:
   // file: [passed] test_file.to
   // success: 5 test(s)
   // failure: 2 test(s)
   // result: 71.43 %
   ```

2. **Test**:
   - Manages the execution of tests on files.
   - Generates detailed reports for individual files and all tests combined.

   #### Example:
   ```toba
   t = Test()
   t.SetFiles(["file1.to", "file2.to"])
   t.TestAll()
   t.CreateReport()
   ```

### `unittest.to`
This file provides assertion functions for unit testing. These include:
- **`TEST_EQUALITY(val, fname, ref)`**: Verifies if `val` equals `ref`.
- **`TEST_INSIDE(val, fname, ref)`**: Verifies if `val` is not inside `ref`.
- **`TEST_UNEQUALITY(val, fname, ref)`**: Verifies if `val` does not equal `ref`.
- **`TEST_GREATERTHAN(val, fname, ref)`**: Verifies if `ref` is greater than `val`.

#### Example:
```toba
// Test for equality
TEST_EQUALITY(10, "TestFunction", 10)
// Output: TEST OK! TestFunction => 10

// Test for inequality
TEST_UNEQUALITY(5, "TestFunction", 10)
// Output: TEST OK! TestFunction => 10
```

## Notes

- Ensure the `Toba.exe` executable is properly configured in your environment if using the `Test` object from `process.to`.
- The library is licensed under the MIT license.

## License
This library is licensed under the terms of the MIT license. See [MIT License](https://opensource.org/licenses/MIT) for more details.