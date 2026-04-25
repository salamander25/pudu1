CREATE TABLE leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  consent BOOLEAN NOT NULL,
  timestamp TEXT NOT NULL,
  lead_score TEXT DEFAULT 'cold',
  status TEXT DEFAULT 'new',
  source TEXT NOT NULL DEFAULT 'website'
);
