#!/bin/bash
echo "Clipboard-Go Installation Script"
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
echo "NOTE: Clipboard-Go will automatically add itself to your startup applications upon first launch."
echo "An autostart entry will be created at ~/.config/autostart/clipboard-go.desktop."
echo ""

# Build
echo "Building Clipboard-Go..."
make build

# Install Extension
echo "Installing GNOME Extension..."
make install

# Copy binary to path
echo "Installing binary to ~/.local/bin..."
mkdir -p ~/.local/bin
cp build/bin/clipboard-go ~/.local/bin/clipboard-go

echo "Installation Complete!"
echo "Please restart GNOME Shell (Alt+F2, r, Enter or logout/login) and enable the extension."
