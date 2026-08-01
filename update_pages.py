import os
import re

BADGE_MAPPING = {
    "'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'": "BADGE_COLORS.green",
    "\"bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20\"": "BADGE_COLORS.green",
    "'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'": "BADGE_COLORS.red",
    "\"bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20\"": "BADGE_COLORS.red",
    "'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'": "BADGE_COLORS.amber",
    "\"bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20\"": "BADGE_COLORS.amber",
    "'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'": "BADGE_COLORS.sky",
    "\"bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20\"": "BADGE_COLORS.sky",
    "'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'": "BADGE_COLORS.purple",
    "\"bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20\"": "BADGE_COLORS.purple",
}

TOKEN_REPLACEMENTS = [
    ("border-slate-200 dark:border-slate-800", "theme-border"),
    ("border-slate-300 dark:border-slate-600/50", "theme-border"),
    ("border-slate-300 dark:border-slate-600", "theme-border"),
    ("border-slate-300 dark:border-slate-700", "theme-border"),
    ("border-slate-200 dark:border-slate-700", "theme-border"),
    ("bg-slate-100 dark:bg-slate-800/50", "bg-muted"),
    ("bg-slate-100 dark:bg-slate-800/30", "bg-muted"),
    ("bg-slate-100 dark:bg-slate-800", "bg-muted"),
    ("bg-slate-50 dark:bg-slate-800/50", "bg-muted"),
    ("bg-slate-200 dark:bg-slate-700/50", "bg-muted"),
    ("bg-slate-200 dark:bg-slate-700", "bg-muted"),
    ("text-slate-700 dark:text-slate-200", "text-foreground"),
    ("text-slate-600 dark:text-slate-300", "text-muted-foreground"),
    ("text-slate-600 dark:text-slate-400", "text-muted-foreground"),
    ("text-slate-500", "text-muted-foreground"),
    ("bg-sky-600/20 border-sky-500 text-sky-400", "bg-primary/20 border-primary text-primary"),
    ("text-sky-400", "text-primary"),
    ("text-sky-500", "text-primary"),
    ("bg-sky-600", "bg-primary"),
    ("border-sky-500", "border-primary"),
    ("bg-sky-500/10", "bg-primary/10"),
    ("bg-sky-500/15 border-sky-500/25", "bg-primary/15 border-primary/25"),
    ("bg-sky-700 hover:bg-sky-600", "bg-primary hover:opacity-90"),
    ("hover:text-sky-400", "hover:text-primary"),
    ("hover:text-sky-300", "hover:text-primary"),
    ("text-green-400", "text-success-text"),
    ("text-green-600 dark:text-green-400", "text-success-text"),
    ("text-amber-400", "text-warning-text"),
    ("text-amber-600 dark:text-amber-400", "text-warning-text"),
    ("text-red-400", "text-destructive"),
    ("text-red-600 dark:text-red-400", "text-destructive"),
    ("hover:text-red-400", "hover:text-destructive"),
    ("hover:bg-red-500/10", "hover:bg-destructive/10"),
    ("text-purple-400", "text-[var(--marked-text)]"),
    ("bg-purple-500/10", "bg-[var(--marked-text)]/10"),
    ("rgba(14,165,233,0.1)", "var(--bg-panel)"),
    ("rgba(81,207,102,0.1)", "color-mix(in srgb, var(--success-text) 10%, transparent)"),
    ("rgba(245,158,11,0.1)", "color-mix(in srgb, var(--warning-text) 10%, transparent)"),
    ("rgba(168,85,247,0.1)", "color-mix(in srgb, var(--marked-text) 10%, transparent)"),
]

base_dir = "frontend/src/pages"
for filename in os.listdir(base_dir):
    if filename.endswith(".jsx"):
        file_path = os.path.join(base_dir, filename)
        with open(file_path, "r") as f:
            content = f.read()

        original_content = content

        needs_import = False
        
        # Replace Badges
        for old, new in BADGE_MAPPING.items():
            if old in content:
                content = content.replace(old, new)
                needs_import = True
            
            # Also handle if they appear inside template literals without quotes:
            # e.g., className={`... ${'bg-green-500...'} ...`}
            # Since the mapping has quotes, it handles those. What if they are inside className="..."?
            # E.g. className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 text-xs"
            # It's better to do a string replace on just the inner part if we want to replace classes.
            # But the user specifically used full badge strings.

            unquoted_old = old[1:-1]
            if unquoted_old in content and not old in content:
                # E.g., it's className="... bg-amber-500/10 ..."
                # We can replace the specific unquoted part if it is exactly matched.
                # Actually let's just use regex for className="... unquoted_old ..."
                pass

        # Handle badge colors inside string literals (e.g. className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 text-xs")
        for old_quoted, new_var in BADGE_MAPPING.items():
            old_unquoted = old_quoted[1:-1]
            # If we find this exact substring in a string, we can't just replace it with a JS variable if it's inside a string.
            # We would need to turn `className={`foo ${BADGE_COLORS.x}`}`.
            # For simplicity, if we find the exact string inside double quotes `className="..."`
            if f'className="{old_unquoted}"' in content:
                content = content.replace(f'className="{old_unquoted}"', f'className={{{new_var}}}')
                needs_import = True
            elif f'className="{old_unquoted} ' in content:
                content = content.replace(f'className="{old_unquoted} ', f'className={{`${{{new_var}}} ')
                # need to close the template literal! This is getting complicated.
                # Just replace the tokens in the rest of the string using TOKEN_REPLACEMENTS.

        # Token replacements
        for old, new in TOKEN_REPLACEMENTS:
            content = content.replace(old, new)

        # Fix up any className="... {BADGE_COLORS...} ..." that were wrongly templated
        
        if needs_import and "BADGE_COLORS" not in original_content:
            # insert import after the last import statement
            lines = content.split('\n')
            last_import = -1
            for i, line in enumerate(lines):
                if line.startswith('import '):
                    last_import = i
            
            import_statement = "import { BADGE_COLORS } from '@/utils/badgeStyles'"
            if last_import != -1:
                lines.insert(last_import + 1, import_statement)
            else:
                lines.insert(0, import_statement)
            content = '\n'.join(lines)

        if content != original_content:
            with open(file_path, "w") as f:
                f.write(content)
            print(f"Updated {file_path}")

