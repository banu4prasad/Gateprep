import os

REPLACEMENTS = {
    'components/admin/UserMobileCard.jsx': [
        ('bg-sky-500/20', 'bg-primary/20'),
        ('border-sky-500/20', 'border-primary/20'),
        ('text-sky-400', 'text-primary')
    ],
    'components/admin/UserRow.jsx': [
        ('bg-sky-500/20', 'bg-primary/20'),
        ('border-sky-500/20', 'border-primary/20'),
        ('text-sky-400', 'text-primary'),
        ('hover:bg-slate-100 dark:hover:bg-slate-800/30', 'hover:bg-muted')
    ],
    'components/test/TestHeader.jsx': [
        ('hover:border-slate-500', 'hover:border-muted-foreground'),
        ('bg-sky-700', 'bg-primary')
    ],
    'pages/AdminTests.jsx': [
        ('hover:border-slate-500', 'hover:border-muted-foreground')
    ],
    'pages/Bookmarks.jsx': [
        ('text-slate-600', 'text-muted-foreground'),
        ('text-slate-700', 'text-foreground'),
        ('bg-green-500/10 border border-green-500/20 text-green-300', 'result-stat-correct text-success-text'),
        ('bg-green-500/10', 'bg-[var(--success-text)]/10'),
        ('border-green-500/20', 'border-[var(--success-text)]/20'),
        ('text-green-300', 'text-success-text'),
        ('bg-slate-200', 'bg-muted'),
        ('hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600', 'hover:bg-muted/80 text-muted-foreground'),
        ('text-slate-400', 'text-muted-foreground')
    ],
    'pages/Dashboard.jsx': [
        ('bg-green-500/10', 'bg-[var(--success-text)]/10'),
        ('border-green-500/20', 'border-[var(--success-text)]/20'),
        ('text-green-600', 'text-success-text'),
        ('bg-amber-500/10', 'bg-[var(--warning-text)]/10'),
        ('border-amber-500/20', 'border-[var(--warning-text)]/20'),
        ('text-amber-600', 'text-warning-text'),
        ('bg-red-500/10', 'bg-[var(--destructive)]/10'),
        ('border-red-500/20', 'border-[var(--destructive)]/20'),
        ('text-red-600', 'text-destructive'),
        ('text-sky-600', 'text-primary'),
    ],
    'pages/ForgotPassword.jsx': [
        ('bg-sky-500/15', 'bg-primary/15')
    ],
    'pages/Leaderboard.jsx': [
        ('bg-amber-500/20 border-amber-500/40', 'bg-[var(--warning-text)]/20 border-[var(--warning-text)]/40'),
        ('bg-slate-400/10 border-slate-400/30', 'bg-muted border-border'),
        ('bg-orange-600/10 border-orange-600/30', 'bg-[#ea580c]/10 border-[#ea580c]/30'),
        ('text-orange-400', 'text-[#fb923c]'),
        ('text-orange-500', 'text-[#f97316]'),
        ('bg-amber-500/10 border border-amber-500/20', 'bg-[var(--warning-text)]/10 border-[var(--warning-text)]/20'),
        ('bg-slate-200 dark:bg-slate-800', 'bg-muted'),
        ('bg-sky-500/5', 'bg-primary/5'),
        ('text-sky-300', 'text-primary'),
        ('text-slate-600', 'text-muted-foreground'),
    ],
    'pages/MyResults.jsx': [
        ('bg-slate-200 dark:bg-slate-800', 'bg-muted')
    ],
    'pages/Pending.jsx': [
        ('bg-amber-500/10', 'bg-[var(--warning-text)]/10'),
        ('border-amber-500/20', 'border-[var(--warning-text)]/20')
    ],
    'pages/Result.jsx': [
        ('ring-sky-500', 'ring-ring'),
        ('text-slate-600', 'text-muted-foreground'),
        ('bg-green-500/10 border border-green-500/20 text-green-300', 'result-stat-correct text-success-text'),
        ('bg-red-500/10 border border-red-500/20 text-red-300', 'result-stat-incorrect text-destructive'),
        ('text-green-300', 'text-success-text')
    ],
    'pages/Tests.jsx': [
        ('bg-green-500/10', 'bg-[var(--success-text)]/10'),
        ('text-green-600', 'text-success-text'),
        ('bg-amber-500/10', 'bg-[var(--warning-text)]/10'),
        ('text-amber-600', 'text-warning-text'),
        ('bg-red-500/10', 'bg-[var(--destructive)]/10'),
        ('text-red-600', 'text-destructive'),
        ('text-sky-600', 'text-primary')
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

