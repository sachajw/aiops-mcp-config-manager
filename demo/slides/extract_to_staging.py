
import zipfile
import re
import os
import sys
import shutil
import xml.etree.ElementTree as ET

def extract_pptx_to_staging(pptx_path, staging_dir):
    """
    Extracts PPTX content to a staging directory.
    - staging_dir/images/: extracted images
    - staging_dir/slides.md: markdown representation
    """
    
    if os.path.exists(staging_dir):
        shutil.rmtree(staging_dir)
    os.makedirs(os.path.join(staging_dir, "images"))
    
    # namespaces
    NS = {
        'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
        'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
        'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
    }

    with zipfile.ZipFile(pptx_path, 'r') as z:
        # 1. Extract all media first
        media_map = {} # archive_path -> new_filename
        for f in z.namelist():
            if f.startswith("ppt/media/"):
                filename = os.path.basename(f)
                target_path = os.path.join(staging_dir, "images", filename)
                with open(target_path, "wb") as img_out:
                    img_out.write(z.read(f))
                media_map[f] = filename
                
        # 2. Identify Slides
        slides = []
        for f in z.namelist():
            if re.match(r'ppt/slides/slide\d+\.xml', f):
                slides.append(f)
        
        # Sort slides by number (slide1, slide2, ..., slide10)
        slides.sort(key=lambda x: int(re.search(r'slide(\d+)', x).group(1)))
        
        md_output = []
        
        for i, slide_file in enumerate(slides):
            slide_num = i + 1
            xml_content = z.read(slide_file).decode('utf-8')
            
            # Parse XML for Text
            # We want to identify title vs body if possible, but raw paragraphs are fine for now.
            # Using regex for resilience as XML parsing namespaces can be tricky if not strict.
            
            # Find all paragraphs
            paragraphs = re.findall(r'<a:p(?: [^>]*)?>(.*?)</a:p>', xml_content, re.DOTALL)
            slide_text_lines = []
            
            for p in paragraphs:
                texts = re.findall(r'<a:t(?: [^>]*)?>(.*?)</a:t>', p, re.DOTALL)
                if texts:
                    line = "".join(texts).strip()
                    # Filter garbage: 
                    # 1. Skip if contains replacement character 
                    # 2. Skip if mostly punctuation/symbols (naive check)
                    if line and '' not in line:
                        # minimal check for "real" text: at least one alphanumeric char
                        if re.search(r'[a-zA-Z0-9]', line):
                             slide_text_lines.append(line)
            
            # Find images via Relationships
            slide_images = []
            rels_file = slide_file.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels"
            if rels_file in z.namelist():
                rels_xml = z.read(rels_file).decode('utf-8')
                # Find relationships to media/images
                # Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"
                # OR Target="media/image1.jpeg" depending on pptx version
                
                # Simple Regex for targets that look like images
                targets = re.findall(r'Target="([^"]+)"', rels_xml)
                for t in targets:
                    if "media/" in t:
                        media_filename = os.path.basename(t)
                        # Check if we extracted it
                        if os.path.exists(os.path.join(staging_dir, "images", media_filename)):
                            slide_images.append(f"images/{media_filename}")

            # Construct MD Entry
            md_output.append(f"# Slide {slide_num}")
            
            if slide_images:
                md_output.append("## Images")
                for img in slide_images:
                    md_output.append(f"- ![]({img})")
            
            md_output.append("## Content")
            for line in slide_text_lines:
                md_output.append(f"- {line}")
            
            md_output.append("\n---\n")
            
        # Write Slides.md
        with open(os.path.join(staging_dir, "slides.md"), "w") as f:
            f.write("\n".join(md_output))
            
    print(f"Extraction complete to {staging_dir}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 extract_to_staging.py <pptx_file> <output_dir>")
        sys.exit(1)
        
    pptx_path = sys.argv[1]
    output_dir = sys.argv[2]
    
    extract_pptx_to_staging(pptx_path, output_dir)
