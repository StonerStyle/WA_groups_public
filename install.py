import subprocess
import os
import sys

def check_python_version():
    """Check if Python version is 3.8 or higher"""
    if sys.version_info < (3, 8):
        print("Error: Python 3.8 or higher is required")
        sys.exit(1)

def check_node_version():
    """Check if Node.js is installed and version is 16 or higher"""
    try:
        node_version = subprocess.check_output(['node', '--version']).decode().strip()
        version_num = int(node_version.split('.')[0].replace('v', ''))
        if version_num < 16:
            print("Error: Node.js 16 or higher is required")
            sys.exit(1)
    except:
        print("Error: Node.js is not installed")
        sys.exit(1)

def create_venv():
    """Create and activate virtual environment"""
    if not os.path.exists('venv'):
        subprocess.run([sys.executable, '-m', 'venv', 'venv'], check=True)
    
    # Activate venv in the current process
    if sys.platform == 'win32':
        activate_script = os.path.join('venv', 'Scripts', 'activate')
    else:
        activate_script = os.path.join('venv', 'bin', 'activate')
    
    print(f"To activate the virtual environment, run:")
    if sys.platform == 'win32':
        print(f"    .\\venv\\Scripts\\activate")
    else:
        print(f"    source ./venv/bin/activate")

def install_dependencies():
    """Install all required dependencies"""
    commands = [
        "pip install -r requirements.txt",  # Install Python dependencies
        "npm init -y",  # Initialize npm
        "npm install @whiskeysockets/baileys@6.5.0",  # Install specific version of baileys
        "npm install qrcode-terminal@0.12.0",  # QR code generation
        "npm install googleapis@129.0.0 dotenv@16.3.1",  # Google Sheets and env
        "npm install openai@4.28.0",  # OpenAI for AI features
        "npm install electron@28.2.0 --save-dev",  # Electron for UI
    ]

    print("\nInstalling dependencies...")
    for command in commands:
        print(f"\nRunning: {command}")
        try:
            subprocess.run(command, shell=True, check=True)
        except subprocess.CalledProcessError as e:
            print(f"Error running command: {command}")
            print(f"Error details: {str(e)}")
            sys.exit(1)

def main():
    """Main installation process"""
    print("Starting installation process...")
    
    # Check versions
    check_python_version()
    check_node_version()
    
    # Create virtual environment
    create_venv()
    
    # Install dependencies
    install_dependencies()
    
    print("\nInstallation completed successfully!")
    print("\nNext steps:")
    print("1. Activate the virtual environment (see instructions above)")
    print("2. Create a .env file with your configuration")
    print("3. Place your service-account.json file in the project root")
    print("4. Run 'npm start' to launch the application")

if __name__ == "__main__":
    main()
