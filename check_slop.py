import os
import re

patterns = {
    'forbidden_colors': re.compile(r'\b(indigo|purple|violet|fuchsia)-[a-z0-9]+', re.IGNORECASE),
    'gradient': re.compile(r'\bgradient\b|bg-gradient', re.IGNORECASE),
    'backdrop_blur': re.compile(r'backdrop-blur', re.IGNORECASE),
    'rounded_large': re.compile(r'rounded-(2xl|3xl)', re.IGNORECASE),
    'shadow_large': re.compile(r'shadow-(xl|2xl)', re.IGNORECASE),
    'hype_words': re.compile(r'\b(revolutionize|seamless|unlock|supercharge|cutting-edge)\b', re.IGNORECASE),
    'lorem': re.compile(r'\blorem\b', re.IGNORECASE),
}

# Emoji detection regex
emoji_pattern = re.compile(
    r'[\U0001F000-\U0001FAFF]|[\U00002600-\U000027BF]|[\U00002300-\U000023FF]'
)

targets = ['frontend', 'site', 'design']
hits = []

for target in targets:
    for root, dirs, files in os.walk(target):
        if any(skip in root for skip in ['node_modules', 'dist', '.git', '.venv', '__pycache__']):
            continue
        for f in files:
            if f.endswith(('.tsx', '.ts', '.css', '.html')):
                filepath = os.path.join(root, f)
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as fp:
                    for line_num, line in enumerate(fp, 1):
                        for name, pat in patterns.items():
                            m = pat.search(line)
                            if m:
                                hits.append((name, filepath, line_num, m.group(0), line.strip()))
                        em = emoji_pattern.search(line)
                        if em:
                            hits.append(('emoji', filepath, line_num, em.group(0), line.strip()))

print(f"TOTAL SLOP HITS: {len(hits)}")
for name, filepath, line_num, match_str, line in hits:
    print(f"[{name}] {filepath}:{line_num} -> {match_str} :: {line[:100]}")
