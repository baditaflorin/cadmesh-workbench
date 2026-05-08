# Phase 2 Source State Taxonomy

| State               | Meaning                                                       | User exits                                             |
| ------------------- | ------------------------------------------------------------- | ------------------------------------------------------ |
| `idle`              | No source selected.                                           | Select files, continue with manual controls.           |
| `loading`           | Files are being read or transferred to the worker.            | Cancel, reset.                                         |
| `loaded-empty`      | Selection contained no usable files.                          | Select files, reset.                                   |
| `loaded-some`       | One or more files were classified and diagnostics are usable. | Continue, override route, reset, inspect.              |
| `loaded-many`       | Many files were classified, usually a photo set.              | Continue, cancel backend job, reset, inspect.          |
| `loaded-too-many`   | Input exceeds the current browser budget.                     | Downsample/split, send to backend if available, reset. |
| `error-recoverable` | Domain problem with a next step.                              | Apply suggestion, select different files, reset.       |
| `error-fatal`       | Input cannot be read or classified.                           | Save diagnostics, select different files, reset.       |
| `in-progress`       | A long operation is running.                                  | Cancel, inspect progress.                              |
| `cancelled`         | User cancelled or a newer selection superseded the old one.   | Retry, reset, select files.                            |

No state may leave the user without an exit.
