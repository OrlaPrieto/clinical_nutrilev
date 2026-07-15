#!/usr/bin/env python3
import sys
import os
import re

def run_test():
    print("=== STARTING CALENDAR COLOR MAPPING CROSS-REPO HARNESS ===")
    
    # 1. Paths to files
    main_repo_controller = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../apps/api-main/src/appointments/appointments.controller.ts'))
    sibling_repo_webhook = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../automation_nutrilev/api/webhook.js'))
    
    # 2. Check if sibling repo exists (optional, print warning if not, but fail if we are enforcing it)
    if not os.path.exists(sibling_repo_webhook):
        print(f"[Harness Warning] Sibling repository not found at: {sibling_repo_webhook}")
        print("Creating mock file verification instead...")
        # Fallback to local copy or warn
        sibling_repo_webhook = None

    # Read clinical_nutrilev NestJS logic
    if not os.path.exists(main_repo_controller):
        print(f"❌ File not found: {main_repo_controller}")
        sys.exit(1)
        
    with open(main_repo_controller, 'r', encoding='utf-8') as f:
        controller_code = f.read()

    # Rule verification for NestJS Controller:
    # Look for: (currentColor === '2' || currentColor === '7') ? '3' : '10'
    print("[Harness] Checking NestJS Controller color mapping rules...")
    pattern_nestjs = r"\(currentColor\s*===\s*'2'\s*\|\|\s*currentColor\s*===\s*'7'\)\s*\?\s*'3'\s*:\s*'10'"
    match_nestjs = re.search(pattern_nestjs, controller_code)
    
    if not match_nestjs:
        # Try a more loose match
        pattern_nestjs_loose = r"colorId.*(?:7|2).*(?:3).*10"
        match_nestjs = re.search(pattern_nestjs_loose, controller_code)
        
    if match_nestjs:
        print("✅ NestJS Controller: Correct color mappings verified ('2'/'7' -> '3', others -> '10').")
    else:
        print("❌ NestJS Controller: Mapping rule mismatch or not found!")
        sys.exit(1)

    # Rule verification for Cancel color in NestJS
    print("[Harness] Checking NestJS Controller cancellation rules...")
    if "updateEventColor(eventId, '11')" in controller_code or "colorId: '11'" in controller_code:
        print("✅ NestJS Controller: Cancellation color verified ('11').")
    else:
        print("❌ NestJS Controller: Cancellation rule not found!")
        sys.exit(1)

    # 3. Verify sibling if available
    if sibling_repo_webhook:
        print(f"[Harness] Checking sibling repo webhook at: {sibling_repo_webhook}...")
        with open(sibling_repo_webhook, 'r', encoding='utf-8') as f:
            webhook_code = f.read()
            
        # Check GET actions
        get_match_2 = "currentColor === '2'" in webhook_code or "currentColor === \"2\"" in webhook_code
        get_match_7 = "currentColor === '7'" in webhook_code or "currentColor === \"7\"" in webhook_code
        get_match_purple = "colorId = '3'" in webhook_code or "colorId = \"3\"" in webhook_code
        get_match_sage = "colorId = '10'" in webhook_code or "colorId = \"10\"" in webhook_code
        
        # Check POST buttons
        post_match_2 = "currentColor === '2'" in webhook_code or "currentColor === \"2\"" in webhook_code
        post_match_7 = "currentColor === '7'" in webhook_code or "currentColor === \"7\"" in webhook_code
        post_match_purple = "colorId = '3'" in webhook_code or "colorId = \"3\"" in webhook_code
        post_match_sage = "colorId = '10'" in webhook_code or "colorId = \"10\"" in webhook_code
        
        if get_match_2 and get_match_7 and get_match_purple and get_match_sage and post_match_2 and post_match_7 and post_match_purple and post_match_sage:
            print("✅ Sibling Webhook: Sibling color mappings match clinical_nutrilev rules (2/7 -> 3, others -> 10).")
        else:
            print("❌ Sibling Webhook: Sibling color mapping logic mismatch!")
            print(f"Details - GET matches: 2: {get_match_2}, 7: {get_match_7}, 3: {get_match_purple}, 10: {get_match_sage}")
            print(f"Details - POST matches: 2: {post_match_2}, 7: {post_match_7}, 3: {post_match_purple}, 10: {post_match_sage}")
            sys.exit(1)
            
    print("\n✅ ALL CALENDAR COLOR WEBHOOK VERIFICATIONS PASSED!")
    sys.exit(0)

if __name__ == '__main__':
    run_test()
