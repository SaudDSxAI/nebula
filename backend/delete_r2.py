import asyncio
from app.services.r2_storage import list_objects, delete_object

def delete_all_r2_contents():
    print("Fetching files to delete...")
    objects = list_objects(prefix="clients/")
    
    if not objects:
        print("No files to delete!")
        return
        
    for obj in objects:
        key = obj['object_key']
        print(f"Deleting {key}...")
        success = delete_object(key)
        if success:
            print(f"✅ Deleted {key}")
        else:
            print(f"❌ Failed to delete {key}")
            
    print("\nAll done!")

if __name__ == "__main__":
    delete_all_r2_contents()
