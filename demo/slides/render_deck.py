
import os
import re
import sys
import argparse

def parse_slides_md(md_path):
    with open(md_path, 'r') as f:
        lines = f.readlines()
        
    slides = []
    current_slide = None
    section = None # 'images' or 'content'
    
    # Calculate relative image path base
    # md_path is like demo/slides/staging/deck_name/slides.md
    # html output is usually demo/slides/deck.html
    # so we need path from demo/slides/ to demo/slides/staging/deck_name/images/
    
    # We assume md_path is relative to CWD or absolute. 
    # Let's assume we run from project root.
    # If md_path is "demo/slides/staging/foo/slides.md"
    # images are "demo/slides/staging/foo/images/..."
    # relative to "demo/slides/" this is "staging/foo/images/..."
    
    md_dir = os.path.dirname(md_path) # demo/slides/staging/foo
    # We want "staging/foo" if we are in demo/slides/ directory context for HTML
    # But usually we link relative to the HTML file? 
    # Let's assume the HTML and staging dir share a common ancestor 'demo/slides'
    
    # Quick hack: split by 'demo/slides/' if present
    if "demo/slides/" in md_dir:
        rel_base = md_dir.split("demo/slides/")[1] # staging/foo
    else:
        # fallback, strict relative
        rel_base = md_dir 

    for line in lines:
        line = line.strip()
        if not line or line == "---":
            continue
            
        if line.startswith("# Slide"):
            if current_slide:
                slides.append(current_slide)
            current_slide = {"images": [], "content": []}
            section = None
            
        elif line.startswith("## Images"):
            section = "images"
            
        elif line.startswith("## Content"):
            section = "content"
            
        elif line.startswith("- ![]("):
            if current_slide and section == "images":
                img_path = line[6:-1] # images/image1.jpg
                full_rel_path = os.path.join(rel_base, img_path)
                current_slide["images"].append(full_rel_path)
                
        elif line.startswith("- "):
            if current_slide and section == "content":
                text = line[2:]
                current_slide["content"].append(text)
                
    if current_slide:
        slides.append(current_slide)
        
    return slides

def get_theme_css(theme):
    themes = {
        "cyberpunk": """
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;500;700&display=swap');
            :root { --accent: #00f3ff; --accent-2: #bc13fe; --bg-dark: #050a14; --glass-bg: rgba(10, 20, 40, 0.85); --border-color: rgba(0, 243, 255, 0.3); }
            .reveal { font-family: 'Rajdhani', sans-serif; background-color: var(--bg-dark); color: #d1d5db; }
            .reveal h1, .reveal h2, .reveal h3 { font-family: 'Orbitron', sans-serif; text-transform: uppercase; color: var(--accent); text-shadow: 0 0 10px var(--accent); }
            .reveal ul li { border-left: 2px solid var(--accent-2); }
            body::before { content: " "; display: block; position: absolute; top: 0; left: 0; bottom: 0; right: 0; background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06)); z-index: 2; background-size: 100% 2px, 3px 100%; pointer-events: none; }
        """,
        "blue": """
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
            :root { --accent: #3b82f6; --accent-2: #2563eb; --bg-dark: #1e293b; --glass-bg: rgba(30, 41, 59, 0.9); --border-color: rgba(59, 130, 246, 0.3); }
            .reveal { font-family: 'Inter', sans-serif; background-color: var(--bg-dark); color: #f8fafc; }
            .reveal h1, .reveal h2, .reveal h3 { font-family: 'Inter', sans-serif; font-weight: 800; color: var(--accent); }
            .reveal ul li { border-left: 4px solid var(--accent); }
        """,
        "light": """
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
            :root { --accent: #2563eb; --accent-2: #475569; --bg-dark: #ffffff; --glass-bg: rgba(241, 245, 249, 0.9); --border-color: #cbd5e1; }
            .reveal { font-family: 'Roboto', sans-serif; background-color: var(--bg-dark); color: #1e293b; }
            .reveal h1, .reveal h2, .reveal h3 { font-family: 'Roboto', sans-serif; color: #0f172a; }
            .glass-panel { background: #f8fafc !important; border: 1px solid #e2e8f0 !important; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important; color: #334155; }
            .reveal ul li { border-left: 3px solid var(--accent); color: #334155; }
            .home-button { color: #475569 !important; border-color: #cbd5e1 !important; background: #f1f5f9 !important; }
            .home-button:hover { background: #e2e8f0 !important; color: #1e293b !important; }
        """,
        "blueprint": """
            @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
            :root { --accent: #60a5fa; --accent-2: #93c5fd; --bg-dark: #172554; --glass-bg: rgba(23, 37, 84, 0.8); --border-color: #60a5fa; }
            .reveal { font-family: 'Share+Tech+Mono', monospace; background-color: var(--bg-dark); color: #dbeafe; background-image: radial-gradient(#60a5fa 1px, transparent 1px); background-size: 20px 20px; }
            .reveal h1, .reveal h2, .reveal h3 { font-family: 'Share+Tech+Mono', monospace; color: var(--accent); text-transform: uppercase; border-bottom: 2px solid var(--accent); display: inline-block; }
            .glass-panel { border: 2px solid var(--accent) !important; border-radius: 0 !important; box-shadow: none !important; background: rgba(30, 58, 138, 0.9) !important; }
            .reveal ul li { list-style-type: square; border-left: none; }
        """,
        "dracula": """
            @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&display=swap');
            :root { --accent: #ff79c6; --accent-2: #bd93f9; --bg-dark: #282a36; --glass-bg: rgba(68, 71, 90, 0.9); --border-color: #6272a4; }
            .reveal { font-family: 'Fira Code', monospace; background-color: var(--bg-dark); color: #f8f8f2; }
            .reveal h1, .reveal h2, .reveal h3 { font-family: 'Fira Code', monospace; color: var(--accent); }
            .glass-panel { background: var(--glass-bg) !important; border: 1px solid var(--border-color) !important; }
            .reveal ul li { border-left: 2px solid var(--accent-2); }
        """,
        "christmas": """
            @import url('https://fonts.googleapis.com/css2?family=Mountains+of+Christmas:wght@400;700&family=Lato:wght@400;700&display=swap');
            :root { --accent: #ff0000; --accent-2: #00ff00; --bg-dark: #0f172a; --glass-bg: rgba(255, 255, 255, 0.95); --border-color: #ff0000; }
            .reveal { font-family: 'Lato', sans-serif; color: #1e293b; }
            .reveal h1, .reveal h2, .reveal h3 { font-family: 'Mountains of Christmas', cursive; color: #d60000; text-shadow: 2px 2px 4px rgba(255, 255, 255, 0.8); }
            .glass-panel { background: var(--glass-bg) !important; border: 2px solid #d60000 !important; box-shadow: 0 0 15px rgba(255, 0, 0, 0.3) !important; border-radius: 16px !important; color: #0f172a; }
            .reveal ul li { border-left: 4px solid #008000; padding-left: 10px; color: #0f172a; }
            
            /* Snow Effect */
            .snow-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; overflow: hidden; }
            .snow { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-image: radial-gradient(4px 4px at 50% 50%, white, transparent), radial-gradient(6px 6px at 100% 50%, white, transparent), radial-gradient(3px 3px at 50% 100%, white, transparent); background-size: 200px 200px; animation: snow 10s linear infinite; opacity: 0.8; }
            @keyframes snow { 0% { background-position: 0px 0px, 0px 0px, 0px 0px; } 100% { background-position: 500px 1000px, 400px 400px, 300px 300px; } }
        """
    }
    return themes.get(theme, themes["cyberpunk"])

def generate_html(slides, output_file, theme="cyberpunk", deck_title="Presentation"):
    
    slides_html = ""
    
    for i, slide in enumerate(slides):
        content_html = ""
        images = slide["images"]
        content = slide["content"]
        
        # Scenario 1: Only Images (Visual Slide)
        if images and not content:
            if len(images) == 1:
                img_src = images[0]
                bg_color = "var(--bg-dark)"
                if theme == "christmas":
                    bg_color = "transparent" # let the bg image show through
                
                content_html = f"""
                <section data-background-image="{img_src}" data-background-size="contain" data-background-color="{bg_color}">
                </section>
                """
            else:
                # Multiple Images - Grid Layout
                img_grid = ""
                for img in images:
                    img_grid += f'<div class="grid-item"><img src="{img}"></div>'
                
                content_html = f"""
                <section>
                    <div class="image-grid">
                        {img_grid}
                    </div>
                </section>
                """

            
        # Scenario 2: Text Only (Information)
        elif content and not images:
            title_text = content[0] if content else f"Slide {i+1}"
            body_content = content[1:] if len(content) > 1 else []
            text_lines = "".join([f'<li class="fragment fade-up">{c}</li>' for c in body_content])
            
            content_html = f"""
            <section>
                <h2 class="r-fit-text">{title_text}</h2>
                <div class="glass-panel">
                    <ul style="list-style: none;">{text_lines}</ul>
                </div>
            </section>
            """
            
        # Scenario 3: Mixed
        else:
            title_text = content[0] if content else ""
            body_content = content[1:] if len(content) > 1 else []
            text_lines = "".join([f'<li>{c}</li>' for c in body_content])
            
            title_html = f'<h3 style="color: var(--accent); margin-bottom: 20px;">{title_text}</h3>' if title_text else ""
            
            # Image handling for mixed content
            if images:
                if len(images) > 1:
                    # Multi-image: use a sub-grid in the left pane
                    img_subgrid = ""
                    for img in images:
                        img_subgrid += f'<div style="text-align: center;"><img src="{img}" style="border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); max-height: 25vh; max-width: 100%;"></div>'
                    
                    visual_html = f"""
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; max-height: 60vh; overflow-y: auto;">
                        {img_subgrid}
                    </div>
                    """
                else:
                    # Single image
                    img_src = images[0]
                    visual_html = f'<img src="{img_src}" style="border-radius: 12px; box-shadow: 0 0 20px rgba(0,0,0,0.5); max-height: 60vh;">'
            else:
                visual_html = "" # No images
            
            content_html = f"""
            <section>
                {title_html}
                <div class="split-layout">
                    <div style="flex: 1;">
                        {visual_html}
                    </div>
                    <div style="flex: 1;" class="glass-panel">
                        <ul>{text_lines}</ul>
                    </div>
                </div>
            </section>
            """
            
        slides_html += content_html

    theme_css = get_theme_css(theme)
    base_theme = "white" if theme in ["light", "christmas"] else "black"
    
    christmas_bg_html = ""
    if theme == "christmas":
        christmas_bg_html = """
        <div id="snow-layer" class="snow-container"><div class="snow"></div></div>
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: url('christmas_bg.png') no-repeat center center fixed; background-size: cover; z-index: -1;"></div>
        <button id="snow-toggle" style="position: fixed; top: 20px; right: 20px; z-index: 1001; background: transparent; border: none; font-size: 24px; cursor: pointer; opacity: 0.7; transition: opacity 0.3s;" title="Toggle Snow">❄️</button>
        <script>
            document.getElementById('snow-toggle').addEventListener('click', function() {
                var snow = document.getElementById('snow-layer');
                if (snow.style.opacity === '0') {
                    snow.style.opacity = '1';
                    this.style.opacity = '0.7';
                } else {
                    snow.style.opacity = '0';
                    this.style.opacity = '0.3';
                }
            });
            document.getElementById('snow-toggle').addEventListener('mouseenter', function() {
                this.style.opacity = '1';
            });
            document.getElementById('snow-toggle').addEventListener('mouseleave', function() {
                if (document.getElementById('snow-layer').style.opacity !== '0') {
                    this.style.opacity = '0.7';
                } else {
                    this.style.opacity = '0.3';
                }
            });
        </script>
        """

    html_template = f"""
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{deck_title}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.0.4/reset.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.0.4/reveal.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.0.4/theme/{base_theme}.min.css">
    
    <style>
        {theme_css}
        
        .glass-panel {{
            background: var(--glass-bg);
            border: 1px solid var(--border-color);
            backdrop-filter: blur(5px);
            padding: 2rem;
            border-radius: 8px;
        }}
        
        .split-layout {{
            display: flex;
            gap: 2rem;
            align-items: center;
        }}
        
        .reveal ul li {{
            margin-bottom: 1rem;
            padding-left: 1rem;
        }}

        /* Home Button */
        .home-button {{
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 1000;
            padding: 10px 20px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid var(--accent);
            color: var(--accent);
            text-decoration: none;
            font-size: 14px;
            border-radius: 4px;
            transition: all 0.3s ease;
            text-transform: uppercase;
            backdrop-filter: blur(5px);
            font-weight: bold;
        }}

        .home-button:hover {{
            background: var(--accent);
            color: var(--bg-dark);
            box-shadow: 0 0 15px var(--accent);
        }}
    </style>
</head>
<body>
    {christmas_bg_html}
    <a href="index.html" class="home-button">Esc: Home</a>

    <div class="reveal">
        <div class="slides">
            <section>
                <h1 class="r-fit-text">{deck_title}</h1>
            </section>
            
            {slides_html}
            
        </div>
    </div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.0.4/reveal.min.js"></script>
    <script>
        Reveal.initialize({{
            hash: true,
            transition: 'slide',
            backgroundTransition: 'fade',
        }});
    </script>
</body>
</html>
    """
    
    with open(output_file, "w") as f:
        f.write(html_template.replace("{slides_content}", slides_html))
        
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Render Reveal.js deck from Staging MD")
    parser.add_argument("md_path", help="Path to slides.md")
    parser.add_argument("output_path", help="Path to output HTML")
    parser.add_argument("--theme", default="cyberpunk", choices=["cyberpunk", "blue", "light", "blueprint", "dracula", "christmas"], help="Theme to apply")
    parser.add_argument("--title", default="Presentation", help="Deck Title")
    
    args = parser.parse_args()
    
    slides = parse_slides_md(args.md_path)
    generate_html(slides, args.output_path, args.theme, args.title)
    print(f"Generated {args.output_path} with {len(slides)} slides using theme {args.theme}.")
