    # Clone or copy application files
    if [ -d ".git" ]; then
        log "Copying application files from current directory..."
        sudo cp -r . $APP_DIR/
        sudo chown -R $APP_USER:$APP_USER $APP_DIR
    else
        error "No git repository found. Please run this script from your project directory or provide a git repository URL."
    fi