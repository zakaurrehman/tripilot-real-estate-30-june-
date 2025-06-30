# backend/python-services/field_extractor.py

from flask import Flask, request, jsonify
import re
import json
from typing import Dict, Any, List, Optional
import dateutil.parser

app = Flask(__name__)

class FieldExtractor:
    """Extract structured fields from OCR text"""
    
    def __init__(self):
        # Common patterns for real estate documents
        self.patterns = {
            'address': [
                r'(?:Property Address|Address|Property|Located at)[:\s]+([^\n]+)',
                r'(\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Way|Boulevard|Blvd)[^\n]*)',
            ],
            'price': [
                r'(?:List Price|Listing Price|Price|Asking Price)[:\s]+\$?([0-9,]+)',
                r'\$([0-9,]+)\s*(?:asking|list|price)',
            ],
            'beds': [
                r'(\d+)\s*(?:Bed|Bedroom|BR|Bdrm)s?',
                r'(?:Bedrooms?|Beds?)[:\s]+(\d+)',
            ],
            'baths': [
                r'(\d+(?:\.\d)?)\s*(?:Bath|Bathroom|BA)s?',
                r'(?:Bathrooms?|Baths?)[:\s]+(\d+(?:\.\d)?)',
            ],
            'sqft': [
                r'(\d+[,\d]*)\s*(?:sq\.?\s*ft\.?|square feet|sqft)',
                r'(?:Square Footage|Living Area|Total Area)[:\s]+(\d+[,\d]*)',
            ],
            'year_built': [
                r'(?:Year Built|Built|Construction Year)[:\s]+(\d{4})',
                r'(?:Built in|Constructed)\s+(\d{4})',
            ],
            'lot_size': [
                r'(?:Lot Size|Lot)[:\s]+([0-9,]+)\s*(?:sq\.?\s*ft\.?|square feet|acres?)',
                r'([0-9,]+)\s*(?:sq\.?\s*ft\.?|square feet)\s*lot',
            ],
            'property_type': [
                r'(?:Property Type|Type)[:\s]+([A-Za-z\s]+?)(?:\n|$)',
                r'(Single Family|Condo|Townhouse|Multi-Family|Commercial|Land)',
            ],
            'mls_number': [
                r'(?:MLS|Listing)\s*#?[:\s]+([A-Z0-9-]+)',
                r'MLS\s*(?:Number|No\.?|#)[:\s]+([A-Z0-9-]+)',
            ]
        }
        
        # Condition keywords
        self.condition_keywords = {
            'excellent': ['excellent', 'pristine', 'like new', 'renovated', 'updated'],
            'good': ['good', 'well maintained', 'move-in ready', 'clean'],
            'fair': ['fair', 'needs work', 'handyman special', 'tlc needed'],
            'poor': ['poor', 'needs renovation', 'fixer', 'distressed']
        }

    def extract_fields(self, text: str, doc_type: str = 'general') -> Dict[str, Any]:
        """Extract fields from text based on document type"""
        
        fields = {}
        text_lower = text.lower()
        
        # Extract using patterns
        for field, patterns in self.patterns.items():
            for pattern in patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    value = match.group(1).strip()
                    fields[field] = self._clean_value(field, value)
                    break
        
        # Extract additional fields based on document type
        if doc_type == 'mls':
            fields.update(self._extract_mls_fields(text))
        elif doc_type == 'inspection':
            fields.update(self._extract_inspection_fields(text))
        elif doc_type == 'deed':
            fields.update(self._extract_deed_fields(text))
        
        # Calculate derived fields
        fields['infrastructure_score'] = self._calculate_infrastructure_score(text, fields)
        
        return fields
    
    def _extract_mls_fields(self, text: str) -> Dict[str, Any]:
        """Extract MLS-specific fields"""
        fields = {}
        
        # Tax assessment
        tax_match = re.search(r'(?:Tax Assessment|Assessed Value)[:\s]+\$?([0-9,]+)', text, re.IGNORECASE)
        if tax_match:
            fields['tax_assessment'] = self._parse_number(tax_match.group(1))
        
        # HOA fees
        hoa_match = re.search(r'(?:HOA|HOA Fee|Association Fee)[:\s]+\$?([0-9,]+)', text, re.IGNORECASE)
        if hoa_match:
            fields['hoa_fee'] = self._parse_number(hoa_match.group(1))
        
        # Days on market
        dom_match = re.search(r'(?:Days on Market|DOM)[:\s]+(\d+)', text, re.IGNORECASE)
        if dom_match:
            fields['days_on_market'] = int(dom_match.group(1))
        
        return fields
    
    def _extract_inspection_fields(self, text: str) -> Dict[str, Any]:
        """Extract inspection report fields"""
        fields = {}
        text_lower = text.lower()
        
        # Roof condition and age
        roof_section = self._extract_section(text, 'roof')
        if roof_section:
            age_match = re.search(r'(\d+)\s*years?\s*old', roof_section, re.IGNORECASE)
            if age_match:
                fields['roof_age'] = int(age_match.group(1))
            
            fields['roof_condition'] = self._assess_condition(roof_section)
        
        # HVAC
        hvac_section = self._extract_section(text, 'hvac|heating|cooling|air conditioning')
        if hvac_section:
            fields['hvac_condition'] = self._assess_condition(hvac_section)
        
        # Kitchen
        kitchen_section = self._extract_section(text, 'kitchen')
        if kitchen_section:
            fields['kitchen_condition'] = self._assess_condition(kitchen_section)
        
        # Bathrooms
        bathroom_section = self._extract_section(text, 'bathroom|bath')
        if bathroom_section:
            fields['bathroom_condition'] = self._assess_condition(bathroom_section)
        
        # Foundation
        foundation_section = self._extract_section(text, 'foundation|structural')
        if foundation_section:
            fields['foundation_condition'] = self._assess_condition(foundation_section)
        
        return fields
    
    def _extract_deed_fields(self, text: str) -> Dict[str, Any]:
        """Extract deed-specific fields"""
        fields = {}
        
        # Grantor/Grantee
        grantor_match = re.search(r'(?:Grantor|Seller)[:\s]+([^\n]+)', text, re.IGNORECASE)
        if grantor_match:
            fields['grantor'] = grantor_match.group(1).strip()
        
        grantee_match = re.search(r'(?:Grantee|Buyer)[:\s]+([^\n]+)', text, re.IGNORECASE)
        if grantee_match:
            fields['grantee'] = grantee_match.group(1).strip()
        
        # Recording information
        recording_match = re.search(r'(?:Recording Date|Recorded)[:\s]+([^\n]+)', text, re.IGNORECASE)
        if recording_match:
            try:
                fields['recording_date'] = dateutil.parser.parse(recording_match.group(1)).isoformat()
            except:
                pass
        
        # Legal description
        legal_match = re.search(r'(?:Legal Description)[:\s]+([^\n]+(?:\n[^\n]+)*)', text, re.IGNORECASE)
        if legal_match:
            fields['legal_description'] = legal_match.group(1).strip()
        
        # Liens
        if 'lien' in text.lower():
            if 'no lien' in text.lower() or 'free and clear' in text.lower():
                fields['lien_status'] = 'Clear'
            else:
                fields['lien_status'] = 'Liens Present'
        
        return fields
    
    def _extract_section(self, text: str, section_pattern: str) -> Optional[str]:
        """Extract a specific section from the text"""
        pattern = rf'({section_pattern})[:\s]*\n?([\s\S]*?)(?=\n[A-Z][a-z]*:|$)'
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(2)[:500]  # Limit section length
        return None
    
    def _assess_condition(self, text: str) -> str:
        """Assess condition based on keywords in text"""
        text_lower = text.lower()
        
        for condition, keywords in self.condition_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                return condition
        
        # Check for specific issues
        if any(word in text_lower for word in ['leak', 'damage', 'crack', 'broken', 'failed']):
            return 'poor'
        elif any(word in text_lower for word in ['wear', 'aged', 'older']):
            return 'fair'
        
        return 'unknown'
    
    def _calculate_infrastructure_score(self, text: str, fields: Dict[str, Any]) -> int:
        """Calculate infrastructure score (0-100)"""
        score = 70  # Base score
        
        # Age factor
        if 'year_built' in fields:
            age = 2025 - fields['year_built']
            if age < 10:
                score += 20
            elif age < 20:
                score += 10
            elif age > 50:
                score -= 20
        
        # Condition factors
        conditions = ['roof_condition', 'hvac_condition', 'foundation_condition', 
                     'kitchen_condition', 'bathroom_condition']
        
        for condition_field in conditions:
            if condition_field in fields:
                condition = fields[condition_field]
                if condition == 'excellent':
                    score += 5
                elif condition == 'good':
                    score += 2
                elif condition == 'fair':
                    score -= 2
                elif condition == 'poor':
                    score -= 5
        
        # Keywords in text
        text_lower = text.lower()
        if 'updated' in text_lower or 'renovated' in text_lower:
            score += 5
        if 'new roof' in text_lower:
            score += 5
        if 'new hvac' in text_lower:
            score += 5
        
        return max(0, min(100, score))
    
    def _clean_value(self, field: str, value: str) -> Any:
        """Clean and parse field values"""
        if field in ['price', 'tax_assessment', 'hoa_fee']:
            return self._parse_number(value)
        elif field in ['beds', 'year_built']:
            return int(re.sub(r'[^\d]', '', value))
        elif field == 'baths':
            return float(re.sub(r'[^\d.]', '', value))
        elif field == 'sqft':
            return self._parse_number(value)
        else:
            return value.strip()
    
    def _parse_number(self, value: str) -> int:
        """Parse number from string, handling commas"""
        return int(re.sub(r'[^\d]', '', value))

# Flask routes
field_extractor = FieldExtractor()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'field_extractor'})

@app.route('/extract', methods=['POST'])
def extract_fields():
    try:
        data = request.json
        text = data.get('text', '')
        doc_type = data.get('doc_type', 'general')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        fields = field_extractor.extract_fields(text, doc_type)
        
        # Add confidence scores
        confidence = {}
        for field in fields:
            if field in ['infrastructure_score']:
                confidence[field] = 0.7  # Calculated fields have lower confidence
            else:
                confidence[field] = 0.9  # Pattern-matched fields have high confidence
        
        return jsonify({
            'fields': fields,
            'confidence': confidence,
            'doc_type': doc_type
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/extract_batch', methods=['POST'])
def extract_batch():
    try:
        data = request.json
        documents = data.get('documents', [])
        
        results = []
        for doc in documents:
            fields = field_extractor.extract_fields(
                doc.get('text', ''),
                doc.get('doc_type', 'general')
            )
            results.append({
                'id': doc.get('id'),
                'fields': fields
            })
        
        return jsonify({'results': results})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)