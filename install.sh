#!/bin/bash
echo "Clipboard-Gnome Installation Script"
echo "--------------------------------"

# Check and install dependencies
deps=(go npm sqlite3 zip unzip curl)
missing=0
for dep in "${deps[@]}"; do
    if ! command -v $dep &> /dev/null; then
        echo "$dep could not be found. Please install it."
        missing=1
    fi
done

if [ $missing -eq 1 ]; then
    echo "Please install the missing dependencies and run the script again."
    exit 1
fi

echo "Dependencies satisfied."

# Note about startup application
echo ""
echo "NOTE: Clipboard-Gnome will automatically add itself to your startup applications upon first launch."
echo "An autostart entry will be created at ~/.config/autostart/clipboard-gnome.desktop."
echo ""

# Build
echo "Building Clipboard-Gnome..."
make build

# Install Extension
echo "Installing GNOME Extension..."
make install

# Copy binary to path
echo "Installing binary to ~/.local/bin..."
mkdir -p ~/.local/bin
cp build/bin/clipboard-gnome ~/.local/bin/clipboard-gnome

echo "Starting Clipboard-Gnome..."
nohup ~/.local/bin/clipboard-gnome > /dev/null 2>&1 &

echo "Installation Complete!"
echo "Please restart GNOME Shell (Alt+F2, r, Enter or logout/login) and enable the extension."
