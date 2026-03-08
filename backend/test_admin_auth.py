"""
Test script for Super Admin Authentication API
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_login():
    """Test super admin login"""
    print("\n1️⃣  Testing Super Admin Login...")
    print("=" * 60)

    response = requests.post(
        f"{BASE_URL}/api/admin/auth/login",
        json={
            "email": "admin@trmplatform.com",
            "password": "Admin123!"
        }
    )

    print(f"Status Code: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print("✅ Login successful!")
        print(f"\n🔑 Access Token (first 50 chars): {data['access_token'][:50]}...")
        print(f"🔄 Refresh Token (first 50 chars): {data['refresh_token'][:50]}...")
        print(f"👤 User: {data['user']['name']} ({data['user']['email']})")
        print(f"⏰ Expires in: {data['expires_in']} seconds ({data['expires_in']/3600} hours)")
        return data['access_token']
    else:
        print(f"❌ Login failed: {response.text}")
        return None


def test_get_me(access_token):
    """Test get current admin info"""
    print("\n2️⃣  Testing Get Current Admin Info...")
    print("=" * 60)

    response = requests.get(
        f"{BASE_URL}/api/admin/auth/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )

    print(f"Status Code: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print("✅ Successfully retrieved admin info!")
        print(f"\n👤 Name: {data['name']}")
        print(f"📧 Email: {data['email']}")
        print(f"🆔 ID: {data['id']}")
        print(f"🔐 2FA Enabled: {data['two_factor_enabled']}")
        print(f"📅 Created: {data['created_at']}")
    else:
        print(f"❌ Failed: {response.text}")


def test_invalid_login():
    """Test login with invalid credentials"""
    print("\n3️⃣  Testing Invalid Login (Wrong Password)...")
    print("=" * 60)

    response = requests.post(
        f"{BASE_URL}/api/admin/auth/login",
        json={
            "email": "admin@trmplatform.com",
            "password": "WrongPassword123!"
        }
    )

    print(f"Status Code: {response.status_code}")

    if response.status_code == 401:
        print("✅ Correctly rejected invalid credentials")
        print(f"   Message: {response.json()['detail']}")
    else:
        print(f"❌ Unexpected response: {response.text}")


def test_logout(access_token):
    """Test logout"""
    print("\n4️⃣  Testing Logout...")
    print("=" * 60)

    response = requests.post(
        f"{BASE_URL}/api/admin/auth/logout",
        headers={"Authorization": f"Bearer {access_token}"}
    )

    print(f"Status Code: {response.status_code}")

    if response.status_code == 200:
        print("✅ Logout successful!")
        print(f"   Message: {response.json()['message']}")
    else:
        print(f"❌ Logout failed: {response.text}")


def main():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("🧪 SUPER ADMIN AUTHENTICATION API TESTS")
    print("=" * 60)

    try:
        # Test 1: Valid login
        access_token = test_login()

        if access_token:
            # Test 2: Get current admin info
            test_get_me(access_token)

            # Test 3: Invalid login
            test_invalid_login()

            # Test 4: Logout
            test_logout(access_token)

        print("\n" + "=" * 60)
        print("✅ ALL TESTS COMPLETED")
        print("=" * 60 + "\n")

    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Cannot connect to the API server")
        print("   Make sure the backend is running at http://localhost:8000")
        print("   Run: cd backend && source venv/bin/activate && uvicorn app.main:app --reload\n")


if __name__ == "__main__":
    main()
