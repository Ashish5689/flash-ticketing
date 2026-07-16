const links = ['About', 'Help', 'Terms', 'Privacy'];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-content flex-col gap-6 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
          <p className="font-bold text-foreground">Book My Show</p>
          <p className="text-sm text-muted">© 2026 Book My Show</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-7 gap-y-3">
          {links.map((link) => (
            <a
              className="text-sm text-muted transition duration-fast hover:text-brand"
              href="#top"
              key={link}
            >
              {link}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
