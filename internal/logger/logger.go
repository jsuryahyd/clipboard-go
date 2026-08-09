package logger

import (
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type LogLevel int

const (
	DEBUG LogLevel = iota
	INFO
	WARN
	ERROR
)

type Logger struct {
	mu       sync.Mutex
	filePath string
	file     *os.File
	level    LogLevel
}

var globalLogger *Logger

// InitLogger initializes logging to both file (~/.local/state/clipboard-gnome/app.log) and stdout.
func InitLogger(logPath string, level LogLevel) (*Logger, error) {
	dir := filepath.Dir(logPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create log directory: %w", err)
	}

	// Rotate log if it exceeds 5MB
	if info, err := os.Stat(logPath); err == nil && info.Size() > 5*1024*1024 {
		backupPath := logPath + ".1"
		_ = os.Rename(logPath, backupPath)
	}

	f, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return nil, fmt.Errorf("failed to open log file: %w", err)
	}

	l := &Logger{
		filePath: logPath,
		file:     f,
		level:    level,
	}

	globalLogger = l
	return l, nil
}

func (l *Logger) log(level LogLevel, levelStr, format string, v ...interface{}) {
	if level < l.level {
		return
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	timestamp := time.Now().Format("2006-01-02 15:04:05.000")
	msg := fmt.Sprintf(format, v...)
	entry := fmt.Sprintf("[%s] [%s] %s\n", timestamp, levelStr, msg)

	if l.file != nil {
		_, _ = l.file.WriteString(entry)
	}
	log.Print(entry)
}

func Debug(format string, v ...interface{}) {
	if globalLogger != nil {
		globalLogger.log(DEBUG, "DEBUG", format, v...)
	} else {
		log.Printf("[DEBUG] "+format, v...)
	}
}

func Info(format string, v ...interface{}) {
	if globalLogger != nil {
		globalLogger.log(INFO, "INFO", format, v...)
	} else {
		log.Printf("[INFO] "+format, v...)
	}
}

func Warn(format string, v ...interface{}) {
	if globalLogger != nil {
		globalLogger.log(WARN, "WARN", format, v...)
	} else {
		log.Printf("[WARN] "+format, v...)
	}
}

func Error(format string, v ...interface{}) {
	if globalLogger != nil {
		globalLogger.log(ERROR, "ERROR", format, v...)
	} else {
		log.Printf("[ERROR] "+format, v...)
	}
}

func (l *Logger) Close() error {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.file != nil {
		return l.file.Close()
	}
	return nil
}

// GetLogWriter returns a Writer suitable for standard library log redirection.
func (l *Logger) GetLogWriter() io.Writer {
	return io.MultiWriter(l.file, os.Stdout)
}
