import subprocess
print("Starting Uvicorn test...")
p = subprocess.Popen(["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"],
                     cwd="/Users/saudahmad/Desktop/new app/backend",
                     stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
try:
    stdout, stderr = p.communicate(timeout=5)
except subprocess.TimeoutExpired:
    print("Uvicorn started successfully and stayed alive for 5 seconds.")
    p.kill()
    exit(0)

print(f"Uvicorn crashed!\nSTDOUT: {stdout}\nSTDERR: {stderr}")
