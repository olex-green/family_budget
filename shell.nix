{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  nativeBuildInputs = with pkgs; [
    pkg-config
    wrapGAppsHook4
    cargo
    rustc
    nodejs
  ];

  buildInputs = with pkgs; [
    # Python & ML packages
    python3
    python3Packages.pip
    python3Packages.virtualenv
    python3Packages.setuptools
    
    # Common libraries required by precompiled Python wheels (PyTorch, ONNX Runtime)
    stdenv.cc.cc.lib
    zlib
    glib
    libglvnd

    # Tauri v2 native system dependencies
    librsvg
    webkitgtk_4_1
    glib-networking
    openssl
    dbus
    onnxruntime
  ];

  shellHook = ''
    # 1. Setup Python Virtual Environment
    if [ ! -d ".venv" ]; then
      echo "Creating Python virtual environment in .venv..."
      python3 -m venv .venv
    fi
    source .venv/bin/activate

    # 2. Set up LD_LIBRARY_PATH for compiled Python packages (PyTorch, ONNX, etc.)
    export LD_LIBRARY_PATH="${pkgs.stdenv.cc.cc.lib}/lib:${pkgs.zlib}/lib:${pkgs.glib.out}/lib:${pkgs.libglvnd}/lib:$LD_LIBRARY_PATH"

    # 2b. Set up ONNX Runtime library path for the Rust 'ort' crate
    export ORT_DYLIB_PATH="${pkgs.onnxruntime}/lib/libonnxruntime.so"

    # 3. Set up environment variables for WebKitGTK and Tauri
    export XDG_DATA_DIRS="$GSETTINGS_SCHEMAS_PATH:$XDG_DATA_DIRS"
    
    echo "=========================================================="
    echo "🟢 NixOS Full Development Environment Active!"
    echo "=========================================================="
    echo "• Python 3, Pip, Virtualenv activated (.venv)"
    echo "• Rust (Cargo/Rustc) and Tauri v2 (WebKitGTK 4.1) enabled"
    echo "• Node.js & npm enabled for React frontend"
    echo ""
    echo "You can now run:"
    echo "  1. pip install -r scripts/requirements.txt"
    echo "  2. python3 scripts/export_onnx.py"
    echo "  3. npm run tauri dev"
    echo "=========================================================="
  '';
}
