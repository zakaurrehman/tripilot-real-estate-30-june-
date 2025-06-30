# 


from flask import Flask, request, jsonify
import pytesseract
from PIL import Image
import pdf2image
import io
import base64
import tempfile
import os

app = Flask(__name__)

# Configure Tesseract path if needed
# pytesseract.pytesseract.tesseract_cmd = r'/usr/bin/tesseract'

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'ocr'})

@app.route('/ocr', methods=['POST'])
def perform_ocr():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        file_content = file.read()
        mime_type = file.content_type
        
        # Extract text based on file type
        if mime_type == 'application/pdf':
            text = extract_text_from_pdf(file_content)
        elif mime_type.startswith('image/'):
            text = extract_text_from_image(file_content)
        else:
            return jsonify({'error': 'Unsupported file type'}), 400
        
        # Clean up text
        text = clean_extracted_text(text)
        
        return jsonify({
            'text': text,
            'pages': len(text.split('\n\n')) if '\n\n' in text else 1,
            'confidence': 0.95  # Placeholder confidence score
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def extract_text_from_pdf(pdf_content):
    """Extract text from PDF using OCR"""
    text_parts = []
    
    with tempfile.TemporaryDirectory() as temp_dir:
        # Save PDF temporarily
        pdf_path = os.path.join(temp_dir, 'temp.pdf')
        with open(pdf_path, 'wb') as f:
            f.write(pdf_content)
        
        # Convert PDF to images
        images = pdf2image.convert_from_path(pdf_path, dpi=300)
        
        # OCR each page
        for i, image in enumerate(images):
            page_text = pytesseract.image_to_string(image, lang='eng')
            text_parts.append(f"--- Page {i+1} ---\n{page_text}")
    
    return '\n\n'.join(text_parts)

def extract_text_from_image(image_content):
    """Extract text from image using OCR"""
    image = Image.open(io.BytesIO(image_content))
    
    # Convert to RGB if necessary
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Perform OCR
    text = pytesseract.image_to_string(image, lang='eng')
    
    return text

def clean_extracted_text(text):
    """Clean and normalize extracted text"""
    # Remove extra whitespace
    lines = [line.strip() for line in text.split('\n')]
    lines = [line for line in lines if line]
    
    # Join lines
    cleaned_text = '\n'.join(lines)
    
    # Remove common OCR artifacts
    replacements = {
        '|': 'I',  # Common OCR mistake
        '0': 'O',  # For text that should be letters
        '—': '-',
        '"': '"',
        '"': '"',
    }
    
    # Apply replacements carefully
    # This is simplified - in production, use more sophisticated cleaning
    
    return cleaned_text

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)