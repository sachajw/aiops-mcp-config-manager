#!/bin/bash

# Claude Code MCP Server Manager
# Finds, lists, backs up, and removes MCP servers across all scopes

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration file locations
USER_CONFIG="$HOME/.claude.json"
PROJECT_CONFIG="$(pwd)/.mcp.json"
LOCAL_CONFIG="$(pwd)/.claude/settings.local.json"
USER_LOCAL_CONFIG="$HOME/.claude/settings.local.json"

# Global variables
declare -a MCP_SERVERS=()
declare -a MCP_PATHS=()
declare -a MCP_SCOPES=()
declare -a MCP_PROJECTS=()

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

log_error() {
    echo -e "${RED}❌${NC} $1"
}

log_header() {
    echo -e "\n${CYAN}=== $1 ===${NC}\n"
}

# Check if jq is available
check_dependencies() {
    if ! command -v jq &> /dev/null; then
        log_error "jq is required but not installed. Please install jq first:"
        echo "  macOS: brew install jq"
        echo "  Ubuntu/Debian: sudo apt-get install jq"
        echo "  CentOS/RHEL: sudo yum install jq"
        exit 1
    fi
    
    if ! command -v python3 &> /dev/null; then
        log_error "python3 is required but not installed."
        exit 1
    fi
}

# Validate JSON file
validate_json() {
    local file="$1"
    if [[ -f "$file" ]]; then
        if python3 -m json.tool "$file" >/dev/null 2>&1; then
            return 0
        else
            return 1
        fi
    fi
    return 1
}

# Get file size in human readable format
get_file_size() {
    local file="$1"
    if [[ -f "$file" ]]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            stat -f%z "$file" | awk '{
                if($1 >= 1073741824) printf "%.1fGB", $1/1073741824
                else if($1 >= 1048576) printf "%.1fMB", $1/1048576  
                else if($1 >= 1024) printf "%.1fKB", $1/1024
                else printf "%dB", $1
            }'
        else
            stat -c%s "$file" | awk '{
                if($1 >= 1073741824) printf "%.1fGB", $1/1073741824
                else if($1 >= 1048576) printf "%.1fMB", $1/1048576
                else if($1 >= 1024) printf "%.1fKB", $1/1024  
                else printf "%dB", $1
            }'
        fi
    else
        echo "N/A"
    fi
}

# Scan for MCP servers in a JSON file
scan_mcp_servers() {
    local file="$1"
    local scope="$2"
    local index=0
    
    if [[ ! -f "$file" ]]; then
        return 0
    fi
    
    if ! validate_json "$file"; then
        log_warning "Invalid JSON in $file ($(get_file_size "$file")) - skipping"
        return 0
    fi
    
    log_info "Scanning $scope: $file ($(get_file_size "$file"))"
    
    # Check for simple structure: { "mcpServers": { ... } }
    local simple_servers
    simple_servers=$(jq -r '.mcpServers // {} | keys[]?' "$file" 2>/dev/null || echo "")
    
    if [[ -n "$simple_servers" ]]; then
        while IFS= read -r server; do
            [[ -z "$server" ]] && continue
            MCP_SERVERS+=("$server")
            MCP_PATHS+=("$file")
            MCP_SCOPES+=("$scope")
            MCP_PROJECTS+=("(global)")
            ((index++))
        done <<< "$simple_servers"
    fi
    
    # Check for project-based structure: { "projects": { "/path": { "mcpServers": { ... } } } }
    local projects
    projects=$(jq -r '.projects // {} | keys[]?' "$file" 2>/dev/null || echo "")
    
    if [[ -n "$projects" ]]; then
        while IFS= read -r project_path; do
            [[ -z "$project_path" ]] && continue
            local project_servers
            project_servers=$(jq -r --arg proj "$project_path" '.projects[$proj].mcpServers // {} | keys[]?' "$file" 2>/dev/null || echo "")
            
            while IFS= read -r server; do
                [[ -z "$server" ]] && continue
                MCP_SERVERS+=("$server")
                MCP_PATHS+=("$file")
                MCP_SCOPES+=("$scope")
                MCP_PROJECTS+=("$project_path")
                ((index++))
            done <<< "$project_servers"
        done <<< "$projects"
    fi
    
    return $index
}

# Discover all MCP servers
discover_mcp_servers() {
    log_header "Discovering MCP Servers Across All Scopes"
    
    MCP_SERVERS=()
    MCP_PATHS=()
    MCP_SCOPES=()
    MCP_PROJECTS=()
    
    # Scan all configuration locations
    scan_mcp_servers "$USER_CONFIG" "User Global"
    scan_mcp_servers "$PROJECT_CONFIG" "Project Shared"
    scan_mcp_servers "$LOCAL_CONFIG" "Project Local"
    scan_mcp_servers "$USER_LOCAL_CONFIG" "User Local"
    
    if [[ ${#MCP_SERVERS[@]} -eq 0 ]]; then
        log_warning "No MCP servers found in any configuration files"
        return 1
    fi
    
    return 0
}

# Display discovered MCP servers
display_mcp_servers() {
    log_header "Found MCP Server Configurations"
    
    printf "${CYAN}%-4s %-25s %-15s %-20s %s${NC}\n" "No." "Server Name" "Scope" "Project/Path" "File"
    printf "${CYAN}%-4s %-25s %-15s %-20s %s${NC}\n" "----" "-------------------------" "---------------" "--------------------" "----"
    
    for i in "${!MCP_SERVERS[@]}"; do
        local num=$((i + 1))
        local server="${MCP_SERVERS[$i]}"
        local scope="${MCP_SCOPES[$i]}"
        local project="${MCP_PROJECTS[$i]}"
        local file="${MCP_PATHS[$i]}"
        local basename_file
        basename_file=$(basename "$file")
        
        # Truncate long names for display
        if [[ ${#server} -gt 24 ]]; then
            server="${server:0:21}..."
        fi
        if [[ ${#project} -gt 19 ]]; then
            project="${project:0:16}..."
        fi
        
        printf "%-4d %-25s %-15s %-20s %s\n" "$num" "$server" "$scope" "$project" "$basename_file"
    done
    
    echo ""
    log_info "Total: ${#MCP_SERVERS[@]} MCP server(s) found"
}

# Backup a configuration file
backup_file() {
    local file="$1"
    local timestamp
    timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_file="${file}.backup_${timestamp}"
    
    if [[ -f "$file" ]]; then
        cp "$file" "$backup_file"
        log_success "Backed up $file to $backup_file"
        return 0
    else
        log_error "File $file does not exist"
        return 1
    fi
}

# Remove MCP server from configuration
remove_mcp_server() {
    local server_name="$1"
    local file_path="$2"
    local project_path="$3"
    
    if [[ ! -f "$file_path" ]]; then
        log_error "Configuration file $file_path does not exist"
        return 1
    fi
    
    local temp_file
    temp_file=$(mktemp)
    
    if [[ "$project_path" == "(global)" ]]; then
        # Remove from simple structure
        jq --arg server "$server_name" 'del(.mcpServers[$server])' "$file_path" > "$temp_file"
    else
        # Remove from project-based structure
        jq --arg proj "$project_path" --arg server "$server_name" 'del(.projects[$proj].mcpServers[$server])' "$file_path" > "$temp_file"
    fi
    
    if validate_json "$temp_file"; then
        mv "$temp_file" "$file_path"
        log_success "Removed MCP server '$server_name' from $file_path"
        
        if [[ "$project_path" != "(global)" ]]; then
            log_info "  Project: $project_path"
        fi
        
        return 0
    else
        log_error "Failed to remove MCP server - invalid JSON would result"
        rm -f "$temp_file"
        return 1
    fi
}

# Interactive server removal
interactive_removal() {
    log_header "Interactive MCP Server Removal"
    
    while true; do
        echo "Options:"
        echo "  1-${#MCP_SERVERS[@]}: Remove specific server by number"
        echo "  b: Backup all configuration files"
        echo "  r: Refresh/re-scan servers"
        echo "  q: Quit"
        echo ""
        
        read -p "Enter your choice: " choice
        
        case "$choice" in
            [1-9]*)
                if [[ "$choice" =~ ^[0-9]+$ ]] && [[ "$choice" -ge 1 ]] && [[ "$choice" -le ${#MCP_SERVERS[@]} ]]; then
                    local index=$((choice - 1))
                    local server="${MCP_SERVERS[$index]}"
                    local file="${MCP_PATHS[$index]}"
                    local project="${MCP_PROJECTS[$index]}"
                    local scope="${MCP_SCOPES[$index]}"
                    
                    echo ""
                    log_warning "About to remove:"
                    echo "  Server: $server"
                    echo "  Scope: $scope"
                    echo "  File: $file"
                    if [[ "$project" != "(global)" ]]; then
                        echo "  Project: $project"
                    fi
                    echo ""
                    
                    read -p "Are you sure? (y/N): " confirm
                    if [[ "$confirm" =~ ^[Yy]$ ]]; then
                        if remove_mcp_server "$server" "$file" "$project"; then
                            # Remove from our arrays
                            unset MCP_SERVERS[$index]
                            unset MCP_PATHS[$index]
                            unset MCP_SCOPES[$index]
                            unset MCP_PROJECTS[$index]
                            
                            # Rebuild arrays to remove gaps
                            MCP_SERVERS=("${MCP_SERVERS[@]}")
                            MCP_PATHS=("${MCP_PATHS[@]}")
                            MCP_SCOPES=("${MCP_SCOPES[@]}")
                            MCP_PROJECTS=("${MCP_PROJECTS[@]}")
                            
                            echo ""
                            display_mcp_servers
                        fi
                    else
                        log_info "Removal cancelled"
                    fi
                else
                    log_error "Invalid selection. Please enter a number between 1 and ${#MCP_SERVERS[@]}"
                fi
                ;;
            b|B)
                log_header "Backing Up Configuration Files"
                
                for config_file in "$USER_CONFIG" "$PROJECT_CONFIG" "$LOCAL_CONFIG" "$USER_LOCAL_CONFIG"; do
                    if [[ -f "$config_file" ]]; then
                        backup_file "$config_file"
                    fi
                done
                ;;
            r|R)
                if discover_mcp_servers; then
                    display_mcp_servers
                else
                    echo "No MCP servers found after refresh."
                    break
                fi
                ;;
            q|Q)
                log_info "Exiting..."
                break
                ;;
            *)
                log_error "Invalid choice. Please try again."
                ;;
        esac
        
        echo ""
    done
}

# Main function
main() {
    log_header "Claude Code MCP Server Manager"
    
    # Check dependencies
    check_dependencies
    
    # Discover MCP servers
    if ! discover_mcp_servers; then
        exit 1
    fi
    
    # Display found servers
    display_mcp_servers
    
    # Start interactive removal
    interactive_removal
    
    log_success "Done! You may want to restart Claude Code to see changes."
    log_info "Verify with: claude mcp list"
}

# Run main function
main "$@"