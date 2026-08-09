package settings

import (
	"encoding/json"
	"os"
	"path/filepath"
	"os/exec"
	"clipboard-gnome/internal/logger"
)

type AppSettings struct {
	RetentionDays int    `json:"retention_days"`
	MaxItemSizeMB int    `json:"max_item_size_mb"`
	Keybinding    string `json:"keybinding"`
	IsDualTone    bool   `json:"is_dual_tone"`
	ThemeColor    string `json:"theme_color"`
	BorderRadius  int    `json:"border_radius"`
}

func DefaultSettings() *AppSettings {
	return &AppSettings{
		RetentionDays: 30,
		MaxItemSizeMB: 10,
		Keybinding:    "<Super>c",
		IsDualTone:    true,
		ThemeColor:    "indigo",
		BorderRadius:  10,
	}
}

func GetConfigPath() string {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		homeDir = "."
	}
	return filepath.Join(homeDir, ".config", "clipboard-gnome", "settings.json")
}

func LoadSettings() *AppSettings {
	configPath := GetConfigPath()
	data, err := os.ReadFile(configPath)
	if err != nil {
		return DefaultSettings()
	}

	var s AppSettings
	if err := json.Unmarshal(data, &s); err != nil {
		return DefaultSettings()
	}
	return &s
}

func SaveSettings(s *AppSettings) error {
	configPath := GetConfigPath()
	if err := os.MkdirAll(filepath.Dir(configPath), 0755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}

	err = os.WriteFile(configPath, data, 0644)
	if err == nil {
		// Attempt to update GNOME gsettings for the extension
		updateGnomeKeybinding(s.Keybinding)
	}
	return err
}

func updateGnomeKeybinding(keybinding string) {
	// The extension reads from org.gnome.shell.extensions.clipboard-gnome toggle-clipboard-gnome
	// Let's attempt to set it via gsettings
	formattedKey := "['" + keybinding + "']"
	cmd := exec.Command("gsettings", "set", "org.gnome.shell.extensions.clipboard-gnome", "toggle-clipboard-gnome", formattedKey)
	err := cmd.Run()
	if err != nil {
		logger.Warn("Failed to update gsettings keybinding: %v (May require schema compilation)", err)
	} else {
		logger.Info("Successfully updated gsettings keybinding to %s", formattedKey)
	}
}
