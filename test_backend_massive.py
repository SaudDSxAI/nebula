import json
import requests
import re
import sys

BASE_URL = "https://backend-production-6bf59.up.railway.app"
OPENAPI_FILE = "openapi.json"

def test_all_endpoints():
    try:
        with open(OPENAPI_FILE, "r") as f:
            spec = json.load(f)
    except FileNotFoundError:
        print(f"Error: {OPENAPI_FILE} not found. Ensure the file is present in the directory.")
        sys.exit(1)
    
    paths = spec.get("paths", {})
    failed_endpoints = []
    success_count = 0
    total_count = 0
    
    print(f"Starting massive test against {BASE_URL}...\n")
    
    for path, methods in paths.items():
        for method, details in methods.items():
            method = method.upper()
            if method not in ["GET", "POST", "PUT", "DELETE", "PATCH"]:
                continue
                
            total_count += 1
            # Replace path parameters (e.g. {client_id}) with dummy value "1"
            url_path = re.sub(r'\{.*?\}', '1', path)
            url = f"{BASE_URL}{url_path}"
            
            print(f"[{total_count}] Testing {method} {url}...", end=" ")
            
            try:
                if method == "GET":
                    response = requests.get(url, timeout=10)
                elif method == "POST":
                    response = requests.post(url, json={}, timeout=10)
                elif method == "PUT":
                    response = requests.put(url, json={}, timeout=10)
                elif method == "DELETE":
                    response = requests.delete(url, timeout=10)
                elif method == "PATCH":
                    response = requests.patch(url, json={}, timeout=10)
                
                # We mainly want to ensure the API doesn't crash (500 Internal Server Error)
                # 401 (Unauthorized), 403 (Forbidden), 422 (Validation error), 404 (Not Found) are acceptable responses for automated dummy requests
                if response.status_code >= 500:
                    print(f"❌ FAILED ({response.status_code})")
                    failed_endpoints.append({
                        "method": method,
                        "url": url,
                        "status": response.status_code,
                        "response": response.text[:200]
                    })
                else:
                    print(f"✅ OK ({response.status_code})")
                    success_count += 1
                    
            except requests.exceptions.RequestException as e:
                print(f"❌ TIMEOUT/ERROR")
                failed_endpoints.append({
                    "method": method,
                    "url": url,
                    "error": str(e)
                })

    print("\n" + "="*50)
    print(f"🧪 MASSIVE TEST SUMMARY")
    print(f"Total endpoints tested: {total_count}")
    print(f"Healthy (No 500s/Crashes): {success_count}")
    print(f"Failed (500s/Crashes/Timeouts): {len(failed_endpoints)}")
    print("="*50)
    
    if failed_endpoints:
        print("\nFailed Endpoints Details (Check Backend Logs for these):")
        for fail in failed_endpoints:
            if 'status' in fail:
                print(f"- {fail['method']} {fail['url']} => HTTP {fail['status']}")
            else:
                print(f"- {fail['method']} {fail['url']} => ERROR: {fail['error']}")

if __name__ == "__main__":
    test_all_endpoints()
