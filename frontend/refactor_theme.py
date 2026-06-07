import os
import re

mappings = [
    (re.compile(r'\btext-slate-200\b'), 'text-slate-700 dark:text-slate-200'),
    (re.compile(r'\btext-slate-300\b'), 'text-slate-600 dark:text-slate-300'),
    (re.compile(r'\btext-slate-400\b'), 'text-slate-500 dark:text-slate-400'),
    (re.compile(r'\btext-slate-500\b'), 'text-slate-500 dark:text-slate-400'),
    (re.compile(r'\bbg-slate-800/50\b'), 'bg-slate-100 dark:bg-slate-800/50'),
    (re.compile(r'\bbg-slate-800/60\b'), 'bg-slate-100 dark:bg-slate-800/60'),
    (re.compile(r'\bbg-slate-800\b'), 'bg-slate-100 dark:bg-slate-800'),
    (re.compile(r'\bbg-slate-900\b'), 'bg-slate-50 dark:bg-slate-900'),
    (re.compile(r'\bbg-slate-700\b'), 'bg-slate-200 dark:bg-slate-700'),
    (re.compile(r'\bbg-slate-700/50\b'), 'bg-slate-200 dark:bg-slate-700/50'),
    (re.compile(r'\bborder-slate-800\b'), 'border-slate-200 dark:border-slate-800'),
    (re.compile(r'\bborder-slate-700\b'), 'border-slate-300 dark:border-slate-700'),
    (re.compile(r'\bborder-slate-700/50\b'), 'border-slate-200 dark:border-slate-700/50'),
    (re.compile(r'\bborder-slate-700/60\b'), 'border-slate-200 dark:border-slate-700/60'),
    (re.compile(r'\bborder-slate-600\b'), 'border-slate-300 dark:border-slate-600'),
    (re.compile(r'\bborder-slate-600/50\b'), 'border-slate-300 dark:border-slate-600/50'),
    (re.compile(r'\bhover:bg-slate-800\b'), 'hover:bg-slate-200 dark:hover:bg-slate-800'),
    (re.compile(r'\bhover:bg-slate-700\b'), 'hover:bg-slate-300 dark:hover:bg-slate-700'),
    (re.compile(r'\bhover:bg-slate-600\b'), 'hover:bg-slate-300 dark:hover:bg-slate-600'),
    (re.compile(r'\bhover:text-slate-200\b'), 'hover:text-slate-900 dark:hover:text-slate-200'),
    (re.compile(r'\bhover:text-slate-300\b'), 'hover:text-slate-800 dark:hover:text-slate-300'),
]

def process_file(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()
        
    new_lines = []
    for line in lines:
        original = line
        # Handle text-white carefully (don't replace if there's a colored bg on the same line)
        if 'text-white' in line and not any(bg in line for bg in ['bg-sky-', 'bg-red-', 'bg-green-', 'bg-amber-', 'bg-purple-']):
            # Special case for "text-white"
            line = re.sub(r'\btext-white\b', 'text-slate-900 dark:text-white', line)
            
        for pattern, replacement in mappings:
            # Avoid replacing already replaced ones
            if replacement in line: continue
            line = pattern.sub(replacement, line)
            
        new_lines.append(line)
        
    if new_lines != lines:
        with open(filepath, 'w') as f:
            f.writelines(new_lines)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.jsx'):
            process_file(os.path.join(root, file))
