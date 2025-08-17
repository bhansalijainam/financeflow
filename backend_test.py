import requests
import sys
import json
from datetime import datetime
import time

class FinancialSaaSAPITester:
    def __init__(self, base_url="https://fintech-advisor-6.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.session_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)

            print(f"   Status Code: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )
        return success

    def test_signup(self, email, password):
        """Test user signup"""
        success, response = self.run_test(
            "User Signup",
            "POST",
            "auth/signup",
            200,
            data={"email": email, "password": password}
        )
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user_id']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_login(self, email, password):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user_id']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_create_checkout_session(self):
        """Test Stripe checkout session creation"""
        success, response = self.run_test(
            "Create Checkout Session",
            "POST",
            "subscription/checkout",
            200,
            data={
                "package_id": "monthly",
                "origin_url": "https://fintech-advisor-6.preview.emergentagent.com"
            }
        )
        if success and 'session_id' in response:
            self.session_id = response['session_id']
            print(f"   Session ID: {self.session_id}")
            return True
        return False

    def test_subscription_status(self):
        """Test subscription status check"""
        if not self.session_id:
            print("❌ No session ID available for status check")
            return False
            
        success, response = self.run_test(
            "Check Subscription Status",
            "GET",
            f"subscription/status/{self.session_id}",
            200
        )
        return success

    def test_user_setup(self):
        """Test user setup"""
        setup_data = {
            "bank_accounts": ["Chase Checking", "Wells Fargo Savings"],
            "credit_cards": ["Chase Sapphire", "American Express Gold"],
            "cash_balance": 5000.00,
            "savings_balance": 15000.00
        }
        
        success, response = self.run_test(
            "User Setup",
            "POST",
            "user/setup",
            200,
            data=setup_data
        )
        return success

    def test_get_user_setup(self):
        """Test get user setup"""
        success, response = self.run_test(
            "Get User Setup",
            "GET",
            "user/setup",
            200
        )
        return success

    def test_create_expense(self):
        """Test expense creation"""
        expense_data = {
            "date": "2024-01-15",
            "category": "Groceries",
            "amount": 125.50,
            "payment_method": "Credit Card",
            "notes": "Weekly grocery shopping"
        }
        
        success, response = self.run_test(
            "Create Expense",
            "POST",
            "expenses",
            200,
            data=expense_data
        )
        return success

    def test_get_expenses(self):
        """Test get expenses"""
        success, response = self.run_test(
            "Get Expenses",
            "GET",
            "expenses",
            200
        )
        return success

    def test_financial_recommendations(self):
        """Test LLM-powered financial recommendations"""
        print("\n🤖 Testing LLM Financial Recommendations (may take 10-15 seconds)...")
        success, response = self.run_test(
            "Financial Recommendations",
            "POST",
            "recommendations",
            200
        )
        if success and 'recommendations' in response:
            print(f"   Recommendations received: {len(response['recommendations'])} characters")
        return success

    def test_ai_chat(self):
        """Test AI chat functionality"""
        print("\n🤖 Testing AI Chat (may take 10-15 seconds)...")
        success, response = self.run_test(
            "AI Chat",
            "POST",
            "chat",
            200,
            data={"message": "What are some good investment strategies for beginners?"}
        )
        if success and 'response' in response:
            print(f"   Chat response received: {len(response['response'])} characters")
        return success

    def test_chat_history(self):
        """Test chat history retrieval"""
        success, response = self.run_test(
            "Chat History",
            "GET",
            "chat/history",
            200
        )
        return success

    def test_dashboard_data(self):
        """Test dashboard data"""
        success, response = self.run_test(
            "Dashboard Data",
            "GET",
            "dashboard",
            200
        )
        return success

    def test_export_expenses(self):
        """Test expense export"""
        success, response = self.run_test(
            "Export Expenses",
            "GET",
            "expenses/export",
            200
        )
        return success

def main():
    print("🚀 Starting Financial SaaS API Testing...")
    print("=" * 60)
    
    # Setup
    tester = FinancialSaaSAPITester()
    test_email = f"test_user_{datetime.now().strftime('%H%M%S')}@example.com"
    test_password = "TestPass123!"

    # Test sequence
    tests = [
        ("Health Check", tester.test_health_check),
        ("User Signup", lambda: tester.test_signup(test_email, test_password)),
        ("Create Checkout Session", tester.test_create_checkout_session),
        ("Check Subscription Status", tester.test_subscription_status),
        ("User Setup", tester.test_user_setup),
        ("Get User Setup", tester.test_get_user_setup),
        ("Create Expense", tester.test_create_expense),
        ("Get Expenses", tester.test_get_expenses),
        ("Dashboard Data", tester.test_dashboard_data),
        ("Export Expenses", tester.test_export_expenses),
        ("Financial Recommendations", tester.test_financial_recommendations),
        ("AI Chat", tester.test_ai_chat),
        ("Chat History", tester.test_chat_history),
    ]

    # Run tests
    failed_tests = []
    for test_name, test_func in tests:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            failed_tests.append(test_name)

    # Print results
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS")
    print("=" * 60)
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed tests: {', '.join(failed_tests)}")
    else:
        print("\n✅ All tests passed!")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())