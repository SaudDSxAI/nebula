# AI Prompts Directory

This directory contains all AI prompts used by the TRM Platform services.

## Files

### CV Evaluator Prompts
- **`cv_selector.txt`** - LLM 1: Detects if input is a CV and generates a summary
- **`cv_evaluator.txt`** - LLM 2: Checks CV completeness and returns missing fields as JSON
- **`cv_json_converter.txt`** - LLM 3: Converts complete CV summary to structured JSON

### Company Assistant Prompt
- **`company_assistant.txt`** - AI assistant prompt for answering company-related questions
  - Uses `{company_name}` placeholder which is replaced at runtime

## Usage

Prompts are automatically loaded when the service modules are imported. To modify a prompt:

1. Edit the corresponding `.txt` file
2. Restart the backend server for changes to take effect

## Notes

- All prompts use UTF-8 encoding
- The `{company_name}` placeholder in `company_assistant.txt` is dynamically replaced with the actual company name
- Prompts are loaded once at module import time for performance
