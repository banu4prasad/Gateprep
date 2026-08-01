import os

REPLACEMENTS = {
    'components/test/Calculator.jsx': [
        ("bg-sky-600", "bg-primary"),
        ("text-slate-700 dark:text-slate-200", "text-foreground")
    ],
    'components/test/ConfirmSubmitModal.jsx': [
        ("text-amber-400", "text-warning-text")
    ],
    'components/test/EmptyQuestionsScreen.jsx': [
        ("text-amber-400", "text-warning-text")
    ],
    'components/test/FullscreenWarning.jsx': [
        ("border-red-500/40", "border-destructive/40"),
        ("text-red-400", "text-destructive")
    ],
    'components/test/LoadingScreen.jsx': [
        ("text-sky-500", "text-primary")
    ],
    'components/test/QuestionView.jsx': [
        ("text-green-400", "text-success-text"),
        ("text-red-400", "text-destructive"),
        ("bg-slate-50 dark:bg-slate-800/50", "bg-muted"),
        ("ring-sky-500", "ring-ring"),
        ("border-sky-500 bg-sky-500", "border-primary bg-primary"),
        ("border-slate-500", "border-muted-foreground"),
        ("text-amber-400", "text-warning-text"),
        ("border-amber-500 bg-amber-500", "border-[var(--accent-indigo)] bg-[var(--accent-indigo)]"),
        ("text-purple-400", "text-[var(--marked-text)]"),
        ("bg-sky-700 hover:bg-sky-600 text-white", "bg-primary hover:opacity-90 text-primary-foreground")
    ],
    'components/test/TestHeader.jsx': [
        ("bg-sky-600", "bg-primary"),
        ("text-red-400", "text-destructive"),
        ("border-sky-500", "border-primary"),
        ("border-slate-300 dark:border-slate-700", "theme-border"),
        ("bg-sky-700 hover:bg-sky-600 text-white", "bg-primary hover:opacity-90 text-primary-foreground")
    ],
    'components/test/TestSidebar.jsx': [
        ("bg-sky-700", "bg-primary")
    ],
    'components/test/TimerDisplay.jsx': [
        ("bg-red-500/20 border-red-500/50 text-red-400", "bg-destructive/20 border-destructive/50 text-destructive"),
        ("bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200", "bg-muted theme-border text-foreground")
    ]
}

base_dir = "frontend/src"
for rel_path, pairs in REPLACEMENTS.items():
    file_path = os.path.join(base_dir, rel_path)
    if os.path.exists(file_path):
        with open(file_path, "r") as f:
            content = f.read()
        for old, new in pairs:
            content = content.replace(old, new)
        with open(file_path, "w") as f:
            f.write(content)
        print(f"Updated {file_path}")
    else:
        print(f"Not found: {file_path}")

