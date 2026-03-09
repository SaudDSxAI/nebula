import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request(
    'https://backend-production-6bf59.up.railway.app/api/admin/auth/login', 
    data=b'{"email": "admin@trmplatform.com", "password": "Admin123!"}', 
    headers={'Content-Type': 'application/json'},
    method='POST'
)
with urllib.request.urlopen(req, context=ctx) as response:
    token = json.loads(response.read().decode())['access_token']

req2 = urllib.request.Request(
    'https://backend-production-6bf59.up.railway.app/api/admin/clients?page=1',
    headers={'Authorization': f'Bearer {token}'}
)
try:
    with urllib.request.urlopen(req2, context=ctx) as resp:
        print(resp.status)
        print(resp.read().decode())
except Exception as e:
    print(e.read().decode() if hasattr(e, 'read') else str(e))
