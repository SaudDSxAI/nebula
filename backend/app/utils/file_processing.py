
import os
import aiofiles
import asyncio
import io
from pathlib import Path
from typing import Dict, Any, Optional

import pdfplumber
from docx import Document

MIN_TEXT_THRESHOLD = 50

async def read_file_async(file_path: str) -> Dict[str, Any]:
    """
    Read text from TXT, PDF, DOCX files - async version.
    Returns dict with success status, content, and error type.
    """
    path = Path(file_path)
    suffix = path.suffix.lower()
    
    # Check for unsupported formats
    if suffix not in {".txt", ".pdf", ".docx", ".doc"}:
        return {
            "success": False,
            "content": "",
            "error": "unsupported_format"
        }
    
    extracted_text = ""
    
    try:
        if suffix == ".txt":
            async with aiofiles.open(path, 'r', encoding='utf-8') as f:
                extracted_text = await f.read()
            
        elif suffix == ".pdf":
            # PDF reading is CPU-bound, run in thread pool
            def read_pdf():
                text_parts = []
                with pdfplumber.open(path) as pdf:
                    for page in pdf.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text_parts.append(page_text)
                return "\n".join(text_parts)
            
            extracted_text = await asyncio.to_thread(read_pdf)
            
        elif suffix in {".docx", ".doc"}:
            # DOCX reading is CPU-bound, run in thread pool
            def read_docx():
                return "\n".join(p.text for p in Document(path).paragraphs)
            
            extracted_text = await asyncio.to_thread(read_docx)
        
        # Check if extracted text is sufficient
        if not extracted_text or len(extracted_text.strip()) < MIN_TEXT_THRESHOLD:
            return {
                "success": False,
                "content": extracted_text,
                "error": "scanned_cv"
            }
        
        # Success - text extracted properly
        return {
            "success": True,
            "content": extracted_text,
            "error": None
        }
            
    except Exception as e:
        print(f"Error reading {path.name}: {e}")
        return {
            "success": False,
            "content": "",
            "error": "read_error"
        }
