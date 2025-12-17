
import zipfile
import re
import os

# Configuration for decks
DECKS = [
    # Visual Command Center is manually maintained now

    {
        "pptx": "demo/slides/MCP_Visual_Control.pptx",
        "output": "demo/slides/visual-control.html",
        "title": "Visual Control",
        "theme_css": "https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.0.4/theme/white.min.css",
        "custom_css": """
            :root { --corp-blue: #0047AB; }
            .reveal h2 { color: var(--corp-blue); }
            .reveal ul { background: rgba(0, 71, 171, 0.05); padding: 20px; border-radius: 8px; }
        """
    },
    {
        "pptx": "demo/slides/mcp_config_manager_16x9_light.pptx",
        "output": "demo/slides/light-mode.html",
        "title": "Light Mode",
        "theme_css": "https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.0.4/theme/simple.min.css",
        "custom_css": ""
    },
    {
        "pptx": "demo/slides/MCP_Config_Manager_The_AI_Command_Center.pptx",
        "output": "demo/slides/ai-command-center.html",
        "title": "AI Command Center",
        "theme_css": "https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.0.4/theme/black.min.css",
        "custom_css": """
            :root { --neon: #39ff14; }
            .reveal h2 { color: var(--neon); text-shadow: 0 0 10px var(--neon); }
            .reveal section { border: 1px solid var(--neon); box-shadow: 0 0 5px var(--neon); padding: 20px; }
        """
    },
    {
        "pptx": "demo/slides/MCP_Toolchain_Command_Center.pptx",
        "output": "demo/slides/toolchain.html",
        "title": "Toolchain Center",
        "theme_css": "https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.0.4/theme/league.min.css",
        "custom_css": """
            .reveal { font-family: monospace; }
            .reveal h2 { color: #4facfe; }
        """
    },
    {
        "pptx": "demo/slides/MCP_Config_Manager.pptx",
        "output": "demo/slides/full-deck.html",
        "title": "Full Config Manager",
        "theme_css": "https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.0.4/theme/dracula.min.css",
        "custom_css": ""
    }
]

HTML_TEMPLATE = """<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{title}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.0.4/reset.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.0.4/reveal.min.css">
    <link rel="stylesheet" href="{theme_css}" id="theme">
    <style>
        {custom_css}
        .reveal .slides section {{ text-align: left; }}
        .reveal h2 {{ font-size: 1.5em; margin-bottom: 0.5em; }}
        .reveal p {{ font-size: 0.8em; }}
        .reveal ul {{ font-size: 0.8em; }}
    </style>
</head>
<body>
    <div class="reveal">
        <div class="slides">
{slides_html}
        </div>
    </div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.0.4/reveal.min.js"></script>
    <script>
        Reveal.initialize({{
            hash: true,
            slideNumber: true,
            width: 1200,
            height: 900
        }});
    </script>
</body>
</html>
"""

def extract_slides(pptx_path):
    if not os.path.exists(pptx_path):
        print(f"Skipping {pptx_path}, not found.")
        return []
        
    slides_data = []
    try:
        with zipfile.ZipFile(pptx_path, 'r') as z:
            slide_files = [f for f in z.namelist() if f.startswith('ppt/slides/slide') and f.endswith('.xml')]
            
            def get_slide_number(filename):
                match = re.search(r'slide(\d+)\.xml', filename)
                return int(match.group(1)) if match else 0
            
            slide_files.sort(key=get_slide_number)
            
            for slide_file in slide_files:
                xml = z.read(slide_file).decode('utf-8')
                
                # Extract Paragraphs (robust regex)
                # We use a non-greedy patch to find <a:p>...<a:p> or <a:p ...>...</a:p>
                paragraphs = re.findall(r'<a:p(?: [^>]*)?>(.*?)</a:p>', xml, re.DOTALL)
                slide_lines = []
                
                for p_content in paragraphs:
                    # Find all text runs within this paragraph
                    texts = re.findall(r'<a:t(?: [^>]*)?>(.*?)</a:t>', p_content, re.DOTALL)
                    if texts:
                        # Join all text parts in the paragraph to form one line/bullet
                        full_line = "".join(texts).strip()
                        if full_line:
                            slide_lines.append(full_line)
                            
                if slide_lines:
                    slides_data.append(slide_lines)
                else:
                    slides_data.append([])
                    
    except Exception as e:
        print(f"Error reading {pptx_path}: {e}")
        
    return slides_data

def generate_html(deck_config):
    print(f"Generating {deck_config['title']} from {deck_config['pptx']}...")
    raw_slides = extract_slides(deck_config['pptx'])
    
    slides_html = ""
    for i, slide_lines in enumerate(raw_slides):
        # Always create a slide, even if empty (matches PPTX count)
        
        # Heuristic: First line is title, rest are bullets
        if slide_lines:
            title = slide_lines[0]
            body = slide_lines[1:]
            
            body_html = ""
            if body:
                body_html = "<ul>" + "".join([f"<li>{line}</li>" for line in body]) + "</ul>"
            
            slide_block = f"""
                <section>
                    <h2>{title}</h2>
                    {body_html}
                </section>
            """
        else:
            # Fallback for empty/image-only slides
            slide_block = f"""
                <section>
                    <h2>Slide {i+1}</h2>
                    <p class="text-muted">[Content/Image Slide]</p>
                </section>
            """
            
        slides_html += slide_block

    final_html = HTML_TEMPLATE.format(
        title=deck_config['title'],
        theme_css=deck_config['theme_css'],
        custom_css=deck_config['custom_css'],
        slides_html=slides_html
    )
    
    with open(deck_config['output'], 'w') as f:
        f.write(final_html)
    
    print(f"Written {len(raw_slides)} slides to {deck_config['output']}")

if __name__ == "__main__":
    for deck in DECKS:
        generate_html(deck)
