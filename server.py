from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from login import validate_user
from database import supabase
import os

app = FastAPI()

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
def home():
    return FileResponse("index.html")


@app.get("/principal-dashboard.html")
def principal_dashboard():
    return FileResponse("principal-dashboard.html")


@app.get("/teacher/dashboard.html")
def teacher_dashboard():
    return FileResponse("teacher/dashboard.html")


@app.get("/teacher/students.html")
def teacher_students():
    return FileResponse("teacher/students.html")


@app.get("/teacher/library.html")
def teacher_library():
    return FileResponse("teacher/library.html")


@app.get("/teacher/assessments.html")
def teacher_assessments():
    return FileResponse("teacher/assessments.html")


@app.get("/teacher/reports.html")
def teacher_reports():
    return FileResponse("teacher/reports.html")


@app.get("/principal/teachers.html")
def principal_teachers():
    return FileResponse("principal/teachers.html")


@app.get("/principal/students.html")
def principal_students():
    return FileResponse("principal/students.html")


@app.get("/principal/library.html")
def principal_library():
    return FileResponse("principal/library.html")


@app.get("/principal/assessments.html")
def principal_assessments():
    return FileResponse("principal/assessments.html")


@app.get("/principal/reports.html")
def principal_reports():
    return FileResponse("principal/reports.html")


@app.get("/student-dashboard.html")
def student_dashboard():
    return FileResponse("student-dashboard.html")


@app.get("/student-progress.html")
def student_progress():
    return FileResponse("student-progress.html")


@app.post("/api/logout")
async def logout():
    """Handle logout requests"""
    return {
        "success": True,
        "message": "Logout successful"
    }


@app.get("/api/logout")
async def logout_get():
    """Handle logout requests (GET for compatibility)"""
    return {
        "success": True,
        "message": "Logout successful"
    }


@app.get("/api/session")
async def get_session():
    """Return session/user info (using localStorage on client side)"""
    # For now, return success but expect client to use localStorage
    # In a real implementation, you'd use session cookies or JWT
    return {
        "success": True,
        "user": None  # Client will handle user from localStorage
    }


@app.get("/api/students")
async def list_students():
    """Fetch students from Supabase"""
    try:
        response = supabase.table('student').select('*').execute()
        return {
            "success": True,
            "students": response.data if response.data else []
        }
    except Exception as e:
        return {
            "success": False,
            "message": str(e),
            "students": []
        }


@app.get("/api/students/{student_id}")
async def get_student(student_id: int):
    """Get a specific student"""
    try:
        response = supabase.table('student').select('*').eq('student_id', student_id).execute()
        if response.data and len(response.data) > 0:
            return {
                "success": True,
                "student": response.data[0]
            }
        return {
            "success": False,
            "message": "Student not found"
        }
    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }


@app.get("/api/materials")
async def list_materials():
    """Fetch reading materials from Supabase"""
    try:
        response = supabase.table('reading_material').select('*').execute()
        return {
            "success": True,
            "materials": response.data if response.data else []
        }
    except Exception as e:
        return {
            "success": False,
            "message": str(e),
            "materials": []
        }


@app.get("/api/materials/{material_id}")
async def get_material(material_id: int):
    """Get a specific reading material"""
    try:
        response = supabase.table('reading_material').select('*').eq('material_id', material_id).execute()
        if response.data and len(response.data) > 0:
            return {
                "success": True,
                "material": response.data[0]
            }
        return {
            "success": False,
            "message": "Material not found"
        }
    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }


@app.get("/api/teachers")
async def list_teachers():
    """Fetch teachers from Supabase"""
    try:
        response = supabase.table('teacher').select('*').execute()
        return {
            "success": True,
            "teachers": response.data if response.data else []
        }
    except Exception as e:
        return {
            "success": False,
            "message": str(e),
            "teachers": []
        }


@app.get("/api/reports")
async def get_reports():
    """Fetch report data from Supabase"""
    try:
        # For now, return a basic response
        return {
            "success": True,
            "grade_statistics": [],
            "top_performers": [],
            "intervention_needed": [],
            "material_usage": []
        }
    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }


@app.get("/api/assessment")
async def get_assessment_history(student_id: int = None):
    """Get assessment history"""
    try:
        if student_id:
            response = supabase.table('assessment').select('*').eq('student_id', student_id).execute()
        else:
            response = supabase.table('assessment').select('*').execute()
        return {
            "success": True,
            "history": response.data if response.data else []
        }
    except Exception as e:
        return {
            "success": False,
            "message": str(e),
            "history": []
        }


@app.post("/api/login")
async def login(data: dict):
    """Handle login requests"""
    username = data.get("username", "")
    password = data.get("password", "")
    
    # Validate credentials using database
    result = validate_user(username, password)
    
    if result["success"]:
        return {
            "success": True,
            "message": "Login successful",
            "user": result["user"]
        }
    else:
        return {
            "success": False,
            "message": result["message"]
        }



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
