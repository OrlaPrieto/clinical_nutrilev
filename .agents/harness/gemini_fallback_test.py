#!/usr/bin/env python3
import sys
import os
import time
from unittest.mock import MagicMock, patch

# Ensure the backend python app directory is in the import path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../apps/api-python')))

def run_test():
    print("=== STARTING GEMINI RATE LIMIT FALLBACK TEST ===")
    
    # 1. Prepare inputs
    mock_url = "https://fhzoyojghnaimmczefyc.supabase.co/storage/v1/object/public/menus/test-patient-menu.docx"
    dummy_gemini_key = "test_key"
    
    # Mock docx.Document and requests.get to return a dummy file
    mock_response = MagicMock()
    mock_response.content = b"dummy content"
    mock_response.headers = {'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}
    
    mock_document = MagicMock()
    mock_paragraph = MagicMock()
    mock_paragraph.text = "Paciente: Juan Perez\nPlan de Alimentacion Semanal\nLunes:\nDesayuno: Huevo con espinaca\n1 taza"
    mock_document.paragraphs = [mock_paragraph]
    mock_document.tables = []

    # Mock the genai client response
    mock_client = MagicMock()
    
    # For model 1 (gemini-2.5-flash): raise error demanding a 50s wait
    mock_error_message = "ResourceExhausted: 429 quota exceeded. Please retry in 50.0s."
    def mock_generate_content(model, contents, config):
        if "gemini-2.5-flash" in model:
            print(f"[Harness Mock] Simulating Rate Limit 429 for {model}. Delay: 50s.")
            raise Exception(mock_error_message)
        else:
            print(f"[Harness Mock] Simulating SUCCESS for fallback {model}.")
            mock_resp = MagicMock()
            mock_resp.text = '{"paciente_nombre": "Juan Perez", "tipo_plan": "semanal", "secciones": []}'
            return mock_resp

    mock_client.models.generate_content = mock_generate_content

    # Start timing
    start_time = time.time()

    with patch('requests.get', return_value=mock_response), \
         patch('docx.Document', return_value=mock_document), \
         patch('google.genai.Client', return_value=mock_client):
         
        from services.ai_service import parse_menu_document_to_json
        
        try:
            result = parse_menu_document_to_json(mock_url, dummy_gemini_key)
            duration = time.time() - start_time
            print(f"\n[Harness Result] Result: {result}")
            print(f"[Harness Result] Execution duration: {duration:.4f} seconds")
            
            # Assert execution duration is small (did not wait 50s) and fallback worked
            if duration < 5.0 and result.get("paciente_nombre") == "Juan Perez":
                print("\n✅ TEST PASSED: Fallback to gemini-3.1-flash-lite succeeded in under 5 seconds without locking up!")
                sys.exit(0)
            else:
                print(f"\n❌ TEST FAILED: Test completed but duration was {duration:.2f}s (expected <5s) or data was incorrect.")
                sys.exit(1)
        except Exception as e:
            print(f"\n❌ TEST FAILED: Exception thrown during fallback test: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == '__main__':
    run_test()
