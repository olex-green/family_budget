
import os
import urllib.request
import tarfile
import shutil
import sys

ORT_VERSION = "1.23.0"
ORT_URL = f"https://github.com/microsoft/onnxruntime/releases/download/v{ORT_VERSION}/onnxruntime-linux-x64-{ORT_VERSION}.tgz"
TARGET_DIR = os.path.join(os.getcwd(), "src-tauri")
DEBUG_DIR = os.path.join(TARGET_DIR, "target", "debug")

def download_and_extract():
    print(f"Downloading ONNX Runtime v{ORT_VERSION} from {ORT_URL}...")
    file_name = "ort.tgz"
    try:
        urllib.request.urlretrieve(ORT_URL, file_name)
    except Exception as e:
        print(f"Failed to download: {e}")
        sys.exit(1)

    print("Extracting...")
    with tarfile.open(file_name, "r:gz") as tar:
        tar.extractall()
    
    extracted_dir_name = f"onnxruntime-linux-x64-{ORT_VERSION}"
    lib_path = os.path.join(extracted_dir_name, "lib", f"libonnxruntime.so.{ORT_VERSION}")
    
    if not os.path.exists(lib_path):
        # Falback for some versions
        lib_path = os.path.join(extracted_dir_name, "lib", "libonnxruntime.so")

    if not os.path.exists(lib_path):
        print(f"Could not find libonnxruntime.so in {extracted_dir_name}/lib")
        sys.exit(1)

    print(f"Found library at {lib_path}")

    # Copy to src-tauri
    dest_path_1 = os.path.join(TARGET_DIR, "libonnxruntime.so")
    print(f"Copying to {dest_path_1}")
    shutil.copy2(lib_path, dest_path_1)
    
    # Copy to target/debug if it exists, or create it
    if not os.path.exists(DEBUG_DIR):
        os.makedirs(DEBUG_DIR, exist_ok=True)
        
    dest_path_2 = os.path.join(DEBUG_DIR, "libonnxruntime.so")
    print(f"Copying to {dest_path_2}")
    shutil.copy2(lib_path, dest_path_2)

    # Cleanup
    os.remove(file_name)
    shutil.rmtree(extracted_dir_name)
    
    print("Done! libonnxruntime.so is set up.")

if __name__ == "__main__":
    download_and_extract()
