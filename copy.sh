set -e

APP_DIR="/var/www/membership-system"
APP_USER="membership"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}
    # Clone or copy application files
    if [ -d ".git" ]; then
        log "Copying application files from current directory..."
        sudo cp -r . $APP_DIR/
        sudo chown -R $APP_USER:$APP_USER $APP_DIR
    else
        error "No git repository found. Please run this script from your project directory or provide a git repository URL."
    fi