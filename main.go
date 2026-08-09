package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/linux"
)

//go:embed all:frontend
var assets embed.FS

func main() {
	app := NewApp()

	err := wails.Run(&options.App{
		Title:             "Clipboard-Gnome",
		Width:             420,
		Height:            640,
		MinWidth:          360,
		MinHeight:         480,
		DisableResize:     false,
		Frameless:         true,
		AlwaysOnTop:       true,
		HideWindowOnClose: true,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 0, G: 0, B: 0, A: 0}, // Transparent background for rounded CSS container
		OnStartup:        app.startup,
		OnShutdown:       app.shutdown,
		Linux: &linux.Options{
			WindowIsTranslucent: true,
			WebviewGpuPolicy:    linux.WebviewGpuPolicyAlways,
		},
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		log.Fatalf("Error starting Clipboard-Go Wails application: %v", err)
	}
}
