#!/usr/bin/env python3
import sys
import subprocess
import os

def get_staged_files():
    try:
        output = subprocess.check_output(['git', 'diff', '--cached', '--name-only'], text=True)
        return [line.strip() for line in output.split('\n') if line.strip()]
    except Exception as e:
        print(f"Error getting staged files: {e}")
        return []

def check_no_alerts(files):
    alert_pattern = "alert("
    violations = []
    
    for f in files:
        if f.startswith('apps/frontend/') and (f.endswith('.ts') or f.endswith('.html')):
            # Skip testing spec files
            if f.endswith('.spec.ts'):
                continue
                
            if os.path.exists(f):
                with open(f, 'r', encoding='utf-8') as file_obj:
                    content = file_obj.read()
                    if alert_pattern in content:
                        # Double check if it's commented out
                        for line_num, line in enumerate(content.split('\n'), 1):
                            if alert_pattern in line and not line.strip().startswith('//') and not line.strip().startswith('*'):
                                violations.append(f"{f}:{line_num} -> {line.strip()}")
                                
    if violations:
        print("\n❌ GIT COMMIT BLOCKED: Browser alert() popup detected in frontend code:")
        for v in violations:
            print(f"  {v}")
        print("Please replace raw alert() calls with ToastService.show() before committing.\n")
        return False
    return True

def check_version_bump(files):
    frontend_changed = False
    version_changed = False
    
    for f in files:
        if f.startswith('apps/frontend/') and not f.startswith('apps/frontend/src/app/version.ts'):
            # Only trigger for actual app source files, skip package.json or config assets
            if any(ext in f for ext in ['.ts', '.html', '.css']):
                frontend_changed = True
        elif f == 'apps/frontend/src/app/version.ts':
            version_changed = True
            
    if frontend_changed and not version_changed:
        print("\n⚠️ GIT COMMIT WARNING: Frontend files modified but apps/frontend/src/app/version.ts was not bumped.")
        print("It is standard rule to increment the patch version.ts whenever frontend features are updated.")
        # We can make it block or just warning, let's keep it as warning to allow minor cosmetic/documentation commits
        # print("Please update version.ts before committing.\n")
        # return False
    return True

def main():
    staged_files = get_staged_files()
    if not staged_files:
        sys.exit(0)
        
    print("=== RUNNING PRE-COMMIT COMPLIANCE CHECK ===")
    
    # 1. Check for alerts
    alerts_ok = check_no_alerts(staged_files)
    if not alerts_ok:
        sys.exit(1)
        
    # 2. Check for version bump
    check_version_bump(staged_files)
    
    print("✅ PRE-COMMIT COMPLIANCE VERIFICATION PASSED!")
    sys.exit(0)

if __name__ == '__main__':
    main()
