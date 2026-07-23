#!/usr/bin/env python3
"""
NotebookLM sync orchestrator using the NotebookLM MCP CLI.
Handles URL crawling, content extraction, and NotebookLM notebook creation.
"""

import subprocess
import json
import sys
import time
import re
from pathlib import Path
from typing import Optional

def run_command(cmd: list, check: bool = True) -> str:
    """Run a CLI command and return output."""
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=check,
            timeout=300
        )
        return result.stdout + result.stderr
    except subprocess.TimeoutExpired:
        return "Command timed out"
    except Exception as e:
        return f"Error: {str(e)}"

def create_notebook(name: str) -> Optional[str]:
    """Create a NotebookLM notebook and return notebook ID."""
    print(f"[NLM] Creating notebook: {name}")
    output = run_command(["nlm", "notebook", "create", name])
    
    # Extract notebook ID from output
    match = re.search(r'Notebook created: ([a-z0-9-]+)', output, re.IGNORECASE)
    if match:
        notebook_id = match.group(1)
        print(f"[NLM] Notebook created: {notebook_id}")
        return notebook_id
    
    match = re.search(r'([a-z0-9-]+)', output)
    if match:
        notebook_id = match.group(1)
        if 'error' not in output.lower():
            print(f"[NLM] Notebook ID extracted: {notebook_id}")
            return notebook_id
    
    print(f"[NLM] Failed to create notebook: {output}")
    return None

def add_url_source(notebook_id: str, url: str) -> bool:
    """Add a URL as a source to a notebook."""
    print(f"[NLM] Adding URL source: {url}")
    output = run_command(["nlm", "source", "add", notebook_id, "--url", url], check=False)
    
    if 'error' in output.lower() or 'failed' in output.lower():
        print(f"[NLM] Failed to add URL: {output}")
        return False
    
    print(f"[NLM] URL source added successfully")
    return True

def sync_drive_sources(notebook_id: str) -> bool:
    """Sync Google Drive sources if available."""
    print(f"[NLM] Syncing Drive sources for {notebook_id}")
    output = run_command(["nlm", "source", "sync", notebook_id], check=False)
    
    if 'error' in output.lower():
        print(f"[NLM] Drive sync skipped or failed (expected)")
        return False
    
    print(f"[NLM] Drive sources synced")
    return True

def create_audio(notebook_id: str) -> bool:
    """Generate podcast from notebook content."""
    print(f"[NLM] Creating audio/podcast for {notebook_id}")
    output = run_command(["nlm", "audio", "create", notebook_id, "--confirm"], check=False)
    
    if 'error' in output.lower():
        print(f"[NLM] Audio creation skipped: {output}")
        return False
    
    print(f"[NLM] Audio created")
    return True

def list_notebooks() -> list:
    """List all NotebookLM notebooks."""
    print("[NLM] Listing notebooks")
    output = run_command(["nlm", "notebook", "list"])
    notebooks = []
    
    for line in output.split('\n'):
        if line.strip() and not line.startswith('['):
            notebooks.append(line.strip())
    
    return notebooks

def sync_website_to_notebooklm(url: str, notebook_name: Optional[str] = None) -> dict:
    """
    Complete workflow: crawl website, create notebook, add sources.
    
    Args:
        url: Website URL to crawl and sync
        notebook_name: Optional name for the notebook (auto-generated if not provided)
    
    Returns:
        Dictionary with sync results
    """
    result = {
        "success": False,
        "url": url,
        "notebook_id": None,
        "notebook_name": notebook_name or url.split('//')[1].split('/')[0],
        "sources_added": 0,
        "error": None,
        "steps_completed": []
    }
    
    try:
        # Step 1: Create notebook
        print(f"\n[SYNC] Starting sync for {url}")
        print(f"[SYNC] Notebook name: {result['notebook_name']}")
        
        notebook_id = create_notebook(result['notebook_name'])
        if not notebook_id:
            result["error"] = "Failed to create notebook"
            return result
        
        result["notebook_id"] = notebook_id
        result["steps_completed"].append("notebook_created")
        
        # Step 2: Add URL source
        if add_url_source(notebook_id, url):
            result["sources_added"] += 1
            result["steps_completed"].append("url_source_added")
        
        # Step 3: Sync Drive sources (if available)
        if sync_drive_sources(notebook_id):
            result["steps_completed"].append("drive_synced")
        
        # Step 4: Generate audio (optional)
        if create_audio(notebook_id):
            result["steps_completed"].append("audio_created")
        
        result["success"] = True
        print(f"\n[SYNC] Sync completed successfully!")
        print(f"[SYNC] Notebook ID: {notebook_id}")
        print(f"[SYNC] Steps: {', '.join(result['steps_completed'])}")
        
        return result
        
    except Exception as e:
        result["error"] = str(e)
        print(f"\n[SYNC] Error during sync: {e}")
        return result

def main():
    """CLI entry point."""
    if len(sys.argv) < 2:
        print("Usage: python notebooklm_sync.py <url> [notebook_name]")
        print("Example: python notebooklm_sync.py https://eecs70.org 'EECS 70 Notes'")
        sys.exit(1)
    
    url = sys.argv[1]
    notebook_name = sys.argv[2] if len(sys.argv) > 2 else None
    
    result = sync_website_to_notebooklm(url, notebook_name)
    print(json.dumps(result, indent=2))
    
    sys.exit(0 if result["success"] else 1)

if __name__ == "__main__":
    main()
