package utils

import (
	"log/slog"
)

func HandleErrorOrLogWithMessages(err error, errMsg string, successMsg string) {
	if err != nil {
		slog.Error(errMsg, "error", err)
		return
	}
	if successMsg != "" {
		slog.Info(successMsg)
	}
}
