import asyncio
from app.services.r2_storage import list_objects
import json

def check_r2_contents():
    print("Fetching files from R2 bucket 'nebula' under the 'clients/' prefix...")
    objects = list_objects(prefix="clients/")
    
    if not objects:
        print("\nNo client files found in Cloudflare R2 (bucket 'nebula'). It is completely empty!")
        return
        
    print(f"\nFound {len(objects)} files in Cloudflare R2:")
    print("-" * 50)
    for obj in objects:
        print(f"- {obj['object_key']} (Size: {obj['size']} bytes)")
    print("-" * 50)
    print("\nPlease confirm if you want to permanently delete all of these files.")

if __name__ == "__main__":
    check_r2_contents()
