from fastapi import FastAPI, HTTPException, Depends, Request, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
import os
import uuid
import datetime
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import hashlib
import jwt
from passlib.hash import bcrypt
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
)
import json

# Load environment variables
load_dotenv()

app = FastAPI(title="Financial Management SaaS")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'financial_saas')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# JWT Secret
JWT_SECRET = "your-secret-key-change-in-production"

# Subscription packages
SUBSCRIPTION_PACKAGES = {
    "monthly": 29.00,  # Monthly subscription
}

# Pydantic models
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserSetup(BaseModel):
    bank_accounts: List[str]
    credit_cards: List[str]
    cash_balance: float
    savings_balance: float

class ExpenseCreate(BaseModel):
    date: str
    category: str
    amount: float
    payment_method: str
    notes: Optional[str] = None

class ChatMessage(BaseModel):
    message: str

class CheckoutRequest(BaseModel):
    package_id: str
    origin_url: str

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.verify(password, hashed)

def create_jwt_token(user_data: dict) -> str:
    payload = {
        "user_id": user_data["user_id"],
        "email": user_data["email"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def decode_jwt_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    
    token = auth_header.split(" ")[1]
    payload = decode_jwt_token(token)
    
    user = await db.users.find_one({"user_id": payload["user_id"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

# Authentication endpoints
@app.post("/api/auth/signup")
async def signup(user: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Create user
    user_id = str(uuid.uuid4())
    hashed_password = hash_password(user.password)
    
    user_data = {
        "user_id": user_id,
        "email": user.email,
        "password": hashed_password,
        "subscription_status": "pending",
        "created_at": datetime.datetime.utcnow(),
        "setup_completed": False
    }
    
    await db.users.insert_one(user_data)
    
    # Create JWT token
    token = create_jwt_token({"user_id": user_id, "email": user.email})
    
    return {
        "message": "User created successfully",
        "token": token,
        "user_id": user_id,
        "needs_subscription": True
    }

@app.post("/api/auth/login")
async def login(user: UserLogin):
    # Find user
    existing_user = await db.users.find_one({"email": user.email})
    if not existing_user or not verify_password(user.password, existing_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create JWT token
    token = create_jwt_token({
        "user_id": existing_user["user_id"],
        "email": existing_user["email"]
    })
    
    return {
        "message": "Login successful",
        "token": token,
        "user_id": existing_user["user_id"],
        "subscription_status": existing_user.get("subscription_status", "pending"),
        "setup_completed": existing_user.get("setup_completed", False)
    }

# Subscription endpoints
@app.post("/api/subscription/checkout")
async def create_checkout_session(request: CheckoutRequest, current_user: dict = Depends(get_current_user)):
    if request.package_id not in SUBSCRIPTION_PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid package")
    
    amount = SUBSCRIPTION_PACKAGES[request.package_id]
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    # Create success and cancel URLs
    success_url = f"{request.origin_url}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{request.origin_url}/subscription/cancel"
    
    # Initialize Stripe checkout
    host_url = request.origin_url
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    # Create checkout session
    checkout_request = CheckoutSessionRequest(
        amount=amount,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": current_user["user_id"],
            "package_id": request.package_id,
            "email": current_user["email"]
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Store payment transaction
    payment_data = {
        "payment_id": str(uuid.uuid4()),
        "user_id": current_user["user_id"],
        "session_id": session.session_id,
        "amount": amount,
        "currency": "usd",
        "package_id": request.package_id,
        "payment_status": "pending",
        "status": "initiated",
        "created_at": datetime.datetime.utcnow(),
        "metadata": {
            "user_id": current_user["user_id"],
            "package_id": request.package_id,
            "email": current_user["email"]
        }
    }
    
    await db.payment_transactions.insert_one(payment_data)
    
    return {
        "url": session.url,
        "session_id": session.session_id
    }

@app.get("/api/subscription/status/{session_id}")
async def get_payment_status(session_id: str, current_user: dict = Depends(get_current_user)):
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    # Initialize Stripe checkout
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
    
    # Get checkout status
    checkout_status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update payment transaction
    transaction = await db.payment_transactions.find_one({"session_id": session_id})
    if transaction:
        update_data = {
            "payment_status": checkout_status.payment_status,
            "status": checkout_status.status,
            "updated_at": datetime.datetime.utcnow()
        }
        
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": update_data}
        )
        
        # If payment successful, update user subscription
        if checkout_status.payment_status == "paid" and transaction.get("payment_status") != "paid":
            await db.users.update_one(
                {"user_id": transaction["user_id"]},
                {"$set": {"subscription_status": "active"}}
            )
    
    return {
        "status": checkout_status.status,
        "payment_status": checkout_status.payment_status,
        "amount_total": checkout_status.amount_total,
        "currency": checkout_status.currency
    }

@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    # Initialize Stripe checkout
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        # Handle successful payment
        if webhook_response.payment_status == "paid":
            session_id = webhook_response.session_id
            
            # Update payment transaction
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "payment_status": "paid",
                    "status": "completed",
                    "updated_at": datetime.datetime.utcnow()
                }}
            )
            
            # Update user subscription status
            transaction = await db.payment_transactions.find_one({"session_id": session_id})
            if transaction:
                await db.users.update_one(
                    {"user_id": transaction["user_id"]},
                    {"$set": {"subscription_status": "active"}}
                )
        
        return {"status": "success"}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# User setup endpoints
@app.post("/api/user/setup")
async def setup_user(setup: UserSetup, current_user: dict = Depends(get_current_user)):
    # Check subscription status
    if current_user.get("subscription_status") != "active":
        raise HTTPException(status_code=403, detail="Active subscription required")
    
    setup_data = {
        "user_id": current_user["user_id"],
        "bank_accounts": setup.bank_accounts,
        "credit_cards": setup.credit_cards,
        "cash_balance": setup.cash_balance,
        "savings_balance": setup.savings_balance,
        "updated_at": datetime.datetime.utcnow()
    }
    
    # Upsert user setup
    await db.user_setups.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": setup_data},
        upsert=True
    )
    
    # Mark setup as completed
    await db.users.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": {"setup_completed": True}}
    )
    
    return {"message": "Setup completed successfully"}

@app.get("/api/user/setup")
async def get_user_setup(current_user: dict = Depends(get_current_user)):
    setup = await db.user_setups.find_one({"user_id": current_user["user_id"]})
    if not setup:
        return {"message": "Setup not found"}
    
    return {
        "bank_accounts": setup.get("bank_accounts", []),
        "credit_cards": setup.get("credit_cards", []),
        "cash_balance": setup.get("cash_balance", 0),
        "savings_balance": setup.get("savings_balance", 0)
    }

# Expense management endpoints
@app.post("/api/expenses")
async def create_expense(expense: ExpenseCreate, current_user: dict = Depends(get_current_user)):
    expense_data = {
        "expense_id": str(uuid.uuid4()),
        "user_id": current_user["user_id"],
        "date": expense.date,
        "category": expense.category,
        "amount": expense.amount,
        "payment_method": expense.payment_method,
        "notes": expense.notes,
        "created_at": datetime.datetime.utcnow()
    }
    
    await db.expenses.insert_one(expense_data)
    
    return {"message": "Expense created successfully", "expense_id": expense_data["expense_id"]}

@app.get("/api/expenses")
async def get_expenses(current_user: dict = Depends(get_current_user)):
    expenses = await db.expenses.find({"user_id": current_user["user_id"]}).to_list(100)
    
    for expense in expenses:
        expense["_id"] = str(expense["_id"])
    
    return {"expenses": expenses}

@app.post("/api/expenses/upload")
async def upload_statement(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    # Placeholder for PDF parsing
    # In real implementation, you would integrate with OCR service
    
    # Create a placeholder transaction
    expense_data = {
        "expense_id": str(uuid.uuid4()),
        "user_id": current_user["user_id"],
        "date": datetime.datetime.utcnow().strftime("%Y-%m-%d"),
        "category": "Statement Upload",
        "amount": 0.00,
        "payment_method": "Credit Card",
        "notes": f"Uploaded statement: {file.filename}",
        "created_at": datetime.datetime.utcnow(),
        "source": "pdf_upload"
    }
    
    await db.expenses.insert_one(expense_data)
    
    return {
        "message": "Statement uploaded successfully. PDF parsing will be implemented soon.",
        "filename": file.filename,
        "expense_id": expense_data["expense_id"]
    }

# LLM-powered features
@app.post("/api/recommendations")
async def get_financial_recommendations(current_user: dict = Depends(get_current_user)):
    # Get user's financial data
    setup = await db.user_setups.find_one({"user_id": current_user["user_id"]})
    expenses = await db.expenses.find({"user_id": current_user["user_id"]}).to_list(50)
    
    if not setup:
        raise HTTPException(status_code=400, detail="Please complete your financial setup first")
    
    # Prepare data for LLM
    total_expenses = sum(expense["amount"] for expense in expenses)
    categories = {}
    for expense in expenses:
        category = expense["category"]
        categories[category] = categories.get(category, 0) + expense["amount"]
    
    financial_summary = f"""
    User Financial Profile:
    - Cash Balance: ${setup.get('cash_balance', 0):.2f}
    - Savings Balance: ${setup.get('savings_balance', 0):.2f}
    - Bank Accounts: {', '.join(setup.get('bank_accounts', []))}
    - Credit Cards: {', '.join(setup.get('credit_cards', []))}
    - Total Monthly Expenses: ${total_expenses:.2f}
    - Expense Categories: {categories}
    
    Please provide personalized financial recommendations including:
    1. Areas where they can save money
    2. Best credit card to use for rewards based on their spending
    3. Where to invest excess cash for better returns
    """
    
    # Initialize LLM chat
    emergent_key = os.environ.get('EMERGENT_LLM_KEY')
    if not emergent_key:
        raise HTTPException(status_code=500, detail="LLM service not configured")
    
    chat = LlmChat(
        api_key=emergent_key,
        session_id=f"recommendations_{current_user['user_id']}",
        system_message="You are a professional financial advisor. Provide practical, actionable advice."
    ).with_model("openai", "gpt-4o-mini")
    
    user_message = UserMessage(text=financial_summary)
    response = await chat.send_message(user_message)
    
    # Store recommendation
    recommendation_data = {
        "recommendation_id": str(uuid.uuid4()),
        "user_id": current_user["user_id"],
        "recommendations": response,
        "created_at": datetime.datetime.utcnow()
    }
    
    await db.recommendations.insert_one(recommendation_data)
    
    return {"recommendations": response}

@app.post("/api/chat")
async def chat_with_ai(message: ChatMessage, current_user: dict = Depends(get_current_user)):
    emergent_key = os.environ.get('EMERGENT_LLM_KEY')
    if not emergent_key:
        raise HTTPException(status_code=500, detail="LLM service not configured")
    
    # Initialize LLM chat
    chat = LlmChat(
        api_key=emergent_key,
        session_id=f"chat_{current_user['user_id']}",
        system_message="You are a financial advisor AI assistant. Answer questions about investing, saving, budgeting, and personal finance. Provide practical advice."
    ).with_model("openai", "gpt-4o-mini")
    
    user_message = UserMessage(text=message.message)
    response = await chat.send_message(user_message)
    
    # Store chat message
    chat_data = {
        "chat_id": str(uuid.uuid4()),
        "user_id": current_user["user_id"],
        "message": message.message,
        "response": response,
        "created_at": datetime.datetime.utcnow()
    }
    
    await db.chat_history.insert_one(chat_data)
    
    return {"response": response}

@app.get("/api/chat/history")
async def get_chat_history(current_user: dict = Depends(get_current_user)):
    history = await db.chat_history.find(
        {"user_id": current_user["user_id"]}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    for item in history:
        item["_id"] = str(item["_id"])
    
    return {"history": history}

# Dashboard endpoints
@app.get("/api/dashboard")
async def get_dashboard_data(current_user: dict = Depends(get_current_user)):
    # Get expenses
    expenses = await db.expenses.find({"user_id": current_user["user_id"]}).to_list(100)
    
    # Calculate category breakdown
    categories = {}
    monthly_total = 0
    
    for expense in expenses:
        category = expense["category"]
        amount = expense["amount"]
        categories[category] = categories.get(category, 0) + amount
        monthly_total += amount
    
    # Get recent recommendations
    recent_recommendations = await db.recommendations.find(
        {"user_id": current_user["user_id"]}
    ).sort("created_at", -1).limit(3).to_list(3)
    
    # Get user setup
    setup = await db.user_setups.find_one({"user_id": current_user["user_id"]})
    
    return {
        "monthly_expenses": monthly_total,
        "category_breakdown": categories,
        "recent_recommendations": [r.get("recommendations", "") for r in recent_recommendations],
        "cash_balance": setup.get("cash_balance", 0) if setup else 0,
        "savings_balance": setup.get("savings_balance", 0) if setup else 0,
        "total_expenses": len(expenses)
    }

@app.get("/api/expenses/export")
async def export_expenses(current_user: dict = Depends(get_current_user)):
    expenses = await db.expenses.find({"user_id": current_user["user_id"]}).to_list(1000)
    
    # Create CSV data
    csv_data = "Date,Category,Amount,Payment Method,Notes\n"
    for expense in expenses:
        csv_data += f"{expense['date']},{expense['category']},{expense['amount']},{expense['payment_method']},{expense.get('notes', '')}\n"
    
    return JSONResponse(
        content={"csv_data": csv_data},
        headers={"Content-Type": "application/json"}
    )

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.datetime.utcnow()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)