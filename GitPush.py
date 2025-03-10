import os
import subprocess
import re
import sys
import traceback

# Start with more verbose output
print("=== GitPush Script Starting ===")
print(f"Python version: {sys.version}")
print(f"Current working directory: {os.getcwd()}")

# Set the repository folder name (adjust if necessary)
REPO_NAME = "WA_Group_Scrape"

# Use the current directory instead of a hardcoded path
REPO_PATH = os.getcwd()

print(f"Working with repository at: {REPO_PATH}")

if not os.path.isdir(REPO_PATH):
    print(f"Error: Repository folder '{REPO_NAME}' not found at {REPO_PATH}.")
    exit(1)

# Change working directory to the repo
os.chdir(REPO_PATH)

def check_and_init_git():
    """Check if the directory is a Git repository and initialize it if necessary."""
    if not os.path.isdir(".git"):
        print("No Git repository found in this directory. Initializing the repository...")
        subprocess.run(["git", "init"], check=True)
        print("Git repository initialized.")
    else:
        print("Git repository already initialized.")
        
    # Ensure git knows who we are (required for commits)
    try:
        # Check if user name is configured
        user_name = subprocess.run(["git", "config", "user.name"], capture_output=True, text=True).stdout.strip()
        user_email = subprocess.run(["git", "config", "user.email"], capture_output=True, text=True).stdout.strip()
        
        if not user_name or not user_email:
            print("Git user identity not fully configured. Setting default values...")
            if not user_name:
                subprocess.run(["git", "config", "user.name", "WA_Group_Scrape_User"], check=True)
            if not user_email:
                subprocess.run(["git", "config", "user.email", "wa_script@example.com"], check=True)
            print("Git user identity configured.")
    except Exception as e:
        print(f"Warning: Could not check git user identity: {str(e)}")

def set_remote_url():
    """Set the new remote URL to the GitHub repository."""
    new_remote_url = "https://github.com/StonerStyle/WA_Group_Scrape"
    
    # Check if the remote already exists and update it if necessary
    try:
        subprocess.run(["git", "remote", "set-url", "origin", new_remote_url], check=True)
        print(f"Remote repository URL set to: {new_remote_url}")
    except subprocess.CalledProcessError:
        # If the remote doesn't exist, add it
        subprocess.run(["git", "remote", "add", "origin", new_remote_url], check=True)
        print(f"Remote repository URL added: {new_remote_url}")

def get_branches():
    """Retrieve the list of available remote Git branches."""
    result = subprocess.run(["git", "branch", "-r"], capture_output=True, text=True)
    if not result.stdout.strip():
        print("No remote branches found. Have you pushed to the remote repository yet?")
        return []
    
    branches = result.stdout.strip().split("\n")
    # Remove 'origin/' prefix and filter out HEAD references
    branches = [b.strip().replace("origin/", "") for b in branches if "->" not in b and b.strip()]
    return list(set(branches))  # Remove duplicates

def select_branch(branches):
    """Prompt user to select a branch by number."""
    print("\nAvailable remote branches:")
    for i, branch in enumerate(branches, 1):
        print(f"{i}. {branch}")
    
    print(f"\nCurrent local branch: {get_current_branch()}")
    print("\nOptions:")
    print("1-N. Select a remote branch")
    print("C. Use current branch")
    print("N. Enter a new branch name")
    
    choice = input("\nEnter your choice (1-N/C/N): ").strip()
    
    if choice.lower() == 'c':
        return get_current_branch()
    elif choice.lower() == 'n':
        new_branch = input("Enter new branch name: ").strip()
        if new_branch:
            return new_branch
        else:
            print("Invalid branch name.")
            return select_branch(branches)
    else:
        try:
            choice_num = int(choice)
            if 1 <= choice_num <= len(branches):
                return branches[choice_num - 1]
            else:
                print("Invalid choice. Please enter a number from the list or C/N.")
                return select_branch(branches)
        except ValueError:
            print("Invalid input. Please enter a number or C/N.")
            return select_branch(branches)

def get_current_branch():
    """Get the name of the current branch."""
    result = subprocess.run(["git", "branch", "--show-current"], capture_output=True, text=True)
    return result.stdout.strip()

def check_for_changes():
    """Check if there are any changes to commit, including untracked files."""
    print("\n=== Checking Git Status ===")
    
    # Get a detailed status
    status_result = subprocess.run(["git", "status"], capture_output=True, text=True)
    print(status_result.stdout)
    
    # Check for changes using porcelain format for scripting
    result = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True)
    changes = result.stdout.strip()
    
    # Also check git diff to catch any changes that might be missed
    diff_result = subprocess.run(["git", "diff", "--name-only"], capture_output=True, text=True)
    diff_changes = diff_result.stdout.strip()
    
    # Check for untracked files
    untracked_result = subprocess.run(["git", "ls-files", "--others", "--exclude-standard"], capture_output=True, text=True)
    untracked_files = untracked_result.stdout.strip()
    
    # Print diagnostic information
    print("\n=== Changes Summary ===")
    if changes:
        print("Modified/Staged files detected:")
        print(changes)
    if diff_changes:
        print("\nChanged files in working directory:")
        print(diff_changes)
    if untracked_files:
        print("\nUntracked files detected:")
        print(untracked_files)
    
    # Return True if any changes detected by any method
    return bool(changes or diff_changes or untracked_files)

def handle_uncommitted_changes():
    """Handle uncommitted changes before switching branches"""
    if check_for_changes():
        print("\nYou have uncommitted changes that need to be handled before switching branches.")
        print("1. Commit changes to current branch")
        print("2. Stash changes (save them for later)")
        print("3. Discard changes")
        print("4. Cancel operation")
        
        choice = input("\nHow would you like to handle these changes? (1/2/3/4): ")
        
        if choice == "1":
            commit_message = input("Enter a commit message: ")
            subprocess.run(["git", "add", "-A"], check=True)
            subprocess.run(["git", "commit", "-m", commit_message], check=True)
            print("Changes committed.")
            return True
        elif choice == "2":
            stash_message = input("Enter a stash message (optional): ")
            if stash_message:
                subprocess.run(["git", "stash", "save", stash_message], check=True)
            else:
                subprocess.run(["git", "stash"], check=True)
            print("Changes stashed.")
            return True
        elif choice == "3":
            confirm = input("Are you sure you want to discard all changes? This cannot be undone. (y/n): ").lower()
            if confirm == 'y':
                subprocess.run(["git", "reset", "--hard"], check=True)
                subprocess.run(["git", "clean", "-fd"], check=True)
                print("Changes discarded.")
                return True
            else:
                print("Operation cancelled.")
                return False
        elif choice == "4":
            print("Operation cancelled.")
            return False
        else:
            print("Invalid choice.")
            return False
    return True  # No changes to handle

def ensure_gitignore():
    """Ensure the .gitignore file exists and has all necessary entries"""
    if not os.path.exists('.gitignore'):
        print("Creating .gitignore file with standard exclusions")
        with open('.gitignore', 'w') as f:
            f.write("""# Python virtual environments
venv/
env/
ENV/
.venv/
.env/
.virtualenv/
virtualenv/
.pytest_cache/
__pycache__/
*.py[cod]
*$py.class

# Node.js dependencies
node_modules/
jspm_packages/

# Build output
dist/
build/
out/

# Authentication information (sensitive)
auth_info/
modules/auth_info/
whatsapp_auth/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
*.env
.env example

# Generated files
*.exe
*.dll
*.so
*.dylib
*.pak
*.dat
*.pyc

# Log files
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
logs/

# OS specific
.DS_Store
Thumbs.db
ehthumbs.db
Desktop.ini

# IDE files
.idea/
.vscode/
*.swp
*.swo

# Electron distribution files
*.asar
""")
        print(".gitignore file created.")
    else:
        print(".gitignore file already exists.")

def push_to_git():
    """Automate Git add, commit, and push with user input."""
    # Make sure .gitignore is present and properly configured
    ensure_gitignore()
    
    # Make sure git respects the .gitignore file
    subprocess.run(["git", "config", "core.excludesfile", ".gitignore"], check=True)
    
    # Refresh the ignore list
    if os.path.exists('.git/info/exclude'):
        with open('.git/info/exclude', 'r+') as f:
            content = f.read()
            f.seek(0, 0)
            f.write("# Force ignored patterns\n")
            f.write("venv/\ndist/\nnode_modules/\nauth_info/\nservice-account.json\n")
            f.write(content)
    
    # Get available branches
    branches = get_branches()
    
    # Let user select which branch to work with
    selected_branch = select_branch(branches)
    if not selected_branch:
        return
    
    print(f"\n=== Selected branch: {selected_branch} ===")
    
    # Get current branch
    current_branch = get_current_branch()
    
    # Check if the selected branch exists remotely
    remote_branches = [b for b in branches if b == selected_branch]
    branch_exists_remotely = len(remote_branches) > 0
    
    # Check if we're already on the selected branch
    if current_branch != selected_branch:
        print(f"Current branch is '{current_branch}', switching to '{selected_branch}'...")
        
        # Handle uncommitted changes before switching
        if not handle_uncommitted_changes():
            print("Branch switch cancelled. Please handle your uncommitted changes first.")
            return
    
        # Check if the selected branch exists locally
        result = subprocess.run(["git", "branch", "--list", selected_branch], capture_output=True, text=True)
        local_branch_exists = bool(result.stdout.strip())
        
        if not local_branch_exists:
            if branch_exists_remotely:
                print(f"Local branch '{selected_branch}' doesn't exist. Creating and tracking the remote branch.")
                try:
                    subprocess.run(["git", "checkout", "-b", selected_branch, f"origin/{selected_branch}"], check=True)
                    print(f"Created and switched to local branch '{selected_branch}'.")
                except subprocess.CalledProcessError:
                    # Fallback if remote tracking fails
                    print(f"Error tracking remote branch. Creating local branch '{selected_branch}' instead.")
                    subprocess.run(["git", "checkout", "-b", selected_branch], check=True)
                    print(f"Created new local branch '{selected_branch}'.")
            else:
                print(f"Creating new local branch '{selected_branch}'...")
                subprocess.run(["git", "checkout", "-b", selected_branch], check=True)
                print(f"Created new local branch '{selected_branch}'.")
        else:
            # Make sure we're on the selected branch
            print(f"Checking out local branch '{selected_branch}'...")
            subprocess.run(["git", "checkout", selected_branch], check=True)
            print(f"Switched to branch '{selected_branch}'")
    else:
        print(f"Already on branch '{selected_branch}'")
    
    # Try to pull latest changes from remote if the branch exists remotely
    if branch_exists_remotely:
        try:
            print(f"Pulling latest changes from origin/{selected_branch}...")
            subprocess.run(["git", "pull", "origin", selected_branch], check=True)
        except subprocess.CalledProcessError:
            print(f"Warning: Could not pull latest changes from origin/{selected_branch}.")

    print(f"\nDo you want to push updates to '{selected_branch}' or overwrite this folder with the branch's files?")
    print("1. Push updates to the branch")
    print("2. Overwrite content in the folder with the selected branch")
    
    choice = input("\nEnter your choice (1 or 2): ")
    
    if choice == "1":
        # Check for changes before attempting to commit
        has_changes = check_for_changes()
        
        if not has_changes:
            # Even if no changes detected, give user option to force commit
            force_commit = input("\nNo significant changes detected by Git. Force commit anyway? (y/n): ").lower()
            if force_commit != 'y':
                return
                
        print("\n=== Files to be included in commit ===")
        # Show all tracked files that will be included
        subprocess.run(["git", "ls-files"], check=True)
        
        # Ask if user wants to exclude large binary files (like dist folder)
        exclude_large_files = input("\nExclude large binary files from commit (recommended)? (y/n): ").lower() == 'y'
        
        if exclude_large_files:
            print("\nExcluding large binary files as specified in .gitignore...")
            # Make git respect the .gitignore file
            subprocess.run(["git", "config", "core.excludesfile", ".gitignore"], check=True)
            
            # Explicitly exclude common large directories/files
            try:
                subprocess.run(["git", "rm", "-r", "--cached", "dist/"], check=False)
                print("Removed dist/ folder from git tracking.")
            except:
                pass
                
            try:
                subprocess.run(["git", "rm", "-r", "--cached", "venv/"], check=False)
                print("Removed venv/ folder from git tracking.")
            except:
                pass
                
            try:
                subprocess.run(["git", "rm", "-r", "--cached", "node_modules/"], check=False)
                print("Removed node_modules/ folder from git tracking.")
            except:
                pass
                
            try:
                subprocess.run(["git", "rm", "-r", "--cached", "modules/auth_info/"], check=False)
                print("Removed auth_info folder from git tracking.")
            except:
                pass

        # Push local changes to the selected branch
        commit_message = input("\nEnter commit message: ")
        print(f"\nYou selected to push updates to branch: {selected_branch}")
        print(f"Commit message: {commit_message}")
        
        # Use -A to include ALL changes including untracked files (except those in .gitignore)
        if exclude_large_files:
            # Add only non-ignored files (respecting .gitignore)
            subprocess.run(["git", "add", "-A", "."], check=True)
        else:
            # Add everything including potentially large files
            subprocess.run(["git", "add", "-A", "."], check=True)
            
        # Show what's actually staged for commit
        print("\n=== Files staged for commit ===")
        subprocess.run(["git", "diff", "--name-only", "--cached"], check=True)
            
        # Only commit if there are staged changes
        commit_result = subprocess.run(["git", "commit", "-m", commit_message], capture_output=True, text=True)
        print(commit_result.stdout)
        
        if "nothing to commit" in commit_result.stdout:
            print("No changes to commit. Make sure you've added files to the repository.")
            return
            
        # For a new branch, set upstream
        push_cmd = ["git", "push"]
        if not branch_exists_remotely:
            print(f"This is a new branch. Setting upstream to origin/{selected_branch}")
            push_cmd.extend(["--set-upstream", "origin", selected_branch])
        else:
            push_cmd.extend(["origin", selected_branch])
        
        # Try pushing with a size limit
        try:
            print("\nAttempting to push to remote repository...")
            subprocess.run(push_cmd, check=True)
            print(f"\nUpdates successfully pushed to {selected_branch}!")
        except subprocess.CalledProcessError:
            print("\nPush failed - likely due to large files. Trying with a single commit...")
            try:
                # Try pushing with --no-thin option which can help with large pushes
                if not branch_exists_remotely:
                    push_cmd = ["git", "push", "--no-thin", "--set-upstream", "origin", selected_branch]
                else:
                    push_cmd = ["git", "push", "--no-thin", "origin", selected_branch]
                    
                subprocess.run(push_cmd, check=True)
                print(f"\nUpdates successfully pushed to {selected_branch}!")
            except subprocess.CalledProcessError:
                print("\nPush still failed. Please manually push or check your repository settings.")
                print("You may need to use Git LFS for large files or increase server limits.")
                print("\nYour changes are committed locally and can be pushed later.")
                print("Try using a smaller number of files or running this command:")
                if not branch_exists_remotely:
                    print(f"git push --set-upstream origin {selected_branch}")
                else:
                    print(f"git push origin {selected_branch}")

    elif choice == "2" and branch_exists_remotely:
        # Overwrite local folder with remote branch content
        print(f"\nYou selected to overwrite the folder content with files from '{selected_branch}'...")

        # Ensure local changes are safely discarded
        subprocess.run(["git", "reset", "--hard"], check=True)
        subprocess.run(["git", "clean", "-fd"], check=True)

        # Fetch latest branch data
        subprocess.run(["git", "fetch", "origin"], check=True)

        # Force checkout the selected branch
        subprocess.run(["git", "checkout", "-B", selected_branch, f"origin/{selected_branch}"], check=True)

        print(f"\nContent from 'origin/{selected_branch}' successfully overwritten locally!")
    elif choice == "2" and not branch_exists_remotely:
        print(f"Cannot overwrite with remote branch because '{selected_branch}' doesn't exist remotely yet.")
    else:
        print("Invalid choice. Exiting...")

if __name__ == "__main__":
    try:
        # Initialize the Git repository if necessary
        check_and_init_git()
        
        # Ensure the remote URL is correctly set
        set_remote_url()
        
        # Fetch the latest branches from the remote repository
        print("Fetching remote branches...")
        fetch_result = subprocess.run(["git", "fetch", "origin"], capture_output=True, text=True)
        if fetch_result.stdout:
            print(fetch_result.stdout)
        
        # Start the main function
        push_to_git()
        
    except Exception as e:
        print(f"\n=== ERROR ===\n{str(e)}\n")
        traceback.print_exc()
