
import zipfile
import re
import os
import sys

def extract_pptx_content(filepath):
    """
    Extracts text from a PPTX file, grouped by slide.
    Returns a list of strings, where each string is the text of a slide.
    """
    if not os.path.exists(filepath):
        return f"Error: File not found: {filepath}"

    try:
        with zipfile.ZipFile(filepath, 'r') as z:
            # excessive filtering for slide XMLs
            slide_files = [f for f in z.namelist() if f.startswith('ppt/slides/slide') and f.endswith('.xml')]
            
            # Sort by number (slide1.xml, slide2.xml, ..., slide10.xml)
            # otherwise slide10 comes before slide2
            def get_slide_number(filename):
                match = re.search(r'slide(\d+)\.xml', filename)
                return int(match.group(1)) if match else 0
            
            slide_files.sort(key=get_slide_number)

            print(f"File: {os.path.basename(filepath)}")
            print(f"Found {len(slide_files)} slides.")

            slides_content = []
            
            for slide_file in slide_files:
                xml_content = z.read(slide_file).decode('utf-8')
                # Extract text using basic regex for <a:t> tags
                # This misses some formatting but gets the raw text
                text_matches = re.findall(r'<a:t[^>]*>(.*?)</a:t>', xml_content)
                slide_text = " ".join(text_matches)
                slides_content.append(slide_text)
                print(f"  Slide {get_slide_number(slide_file)}: {slide_text[:100]}...") # Preview

            return slides_content

    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return []

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extract_pptx.py <pptx_file>")
        sys.exit(1)
        
    extract_pptx_content(sys.argv[1])
