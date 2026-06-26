# Finance OS

A fully offline personal finance tracker for Android. No internet needed. No servers. Your data stays on your device, encrypted.

**Package Name:** `com.aditya.financeos`

---

## What It Does

Finance OS lets you track your daily income and expenses, see where your money goes, and get a 14-day spending forecast — all without an internet connection. Your data is backed up as an encrypted file on your phone that survives app reinstalls.

---

## Features

### Add & Track Transactions
- Log expenses and income with date, amount, category, and description
- Toggle between **Cash** and **UPI** payment modes
- Mark transactions as **Essential** (rent, bills, etc.)
- Categories are fully customizable — add your own, remove the defaults

### Dashboard Overview
- See your **total balance** (Cash + UPI combined)
- **Live daily burn rate** — how much you spent today
- **Safe daily spend** — how much you can still spend today based on your remaining budget
- Animated number counters that flash green (up) or red (down)

### Budget System
- Set a **monthly budget target** (default: ₹8,000)
- **Red alert** when you exceed 100%
- **Amber warning** when you hit 80%
- Tracks your monthly spend against your budget

### Ledger (Transaction List)
- Spreadsheet-style table with all transactions
- **Search** by description or category
- **Filter** by expense/income and by category
- **Select multiple** and bulk delete
- Single delete with confirmation

### Charts & Analytics
- **Category pie chart** — see where your money goes (toggle expense vs income)
- **Monthly bar chart** — daily spending broken down by day
- **Annual view** — compare all 12 months side by side
- **14-Day Forecast** — predicts your future balance using polynomial regression on your last 30 days of spending
- **Negative balance warning** if forecast shows you'll run out

### Trash System
- Deleted transactions go to a **30-day trash** instead of being erased
- **Restore** any trashed item back to your ledger
- **Permanently delete** when you're sure
- **Empty trash** to clear everything
- Red countdown shows days until auto-purge

### Export & Reports
- Generate a **PDF report** for any month
- Report includes: income/expense summary, category breakdowns, full transaction list
- **Share** the PDF via Android share sheet (email, WhatsApp, etc.)

### Encrypted Vault Backup
- All your data is automatically encrypted and saved as `vault.enc`
- Survives app reinstalls — data is stored in your **Documents** folder
- **Restore prompt** on reinstall asks if you want your old data back
- **Import** a vault file from Settings to merge or replace data
- Old vaults are **archived** (never deleted) with timestamps

### Security
- **4-digit PIN lock** with brute-force protection (5 attempts then 30-second lockout)
- **Auto-lock** after 5 minutes of inactivity
- PIN required for: delete transactions, empty trash, erase all data, reset PIN
- SHA-256 hashed PIN storage

### Settings
- Set your monthly budget
- Adjust starting Cash and UPI balances
- Add/remove transaction categories
- Reset your PIN
- View storage usage
- **Factory reset** — wipes everything (PIN-gated)

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 18, Tailwind CSS, Framer Motion |
| Charts | Recharts |
| State | Zustand |
| Database | IndexedDB (via `idb`) |
| Encryption | CryptoJS (AES) |
| PDF | jsPDF + jspdf-autotable |
| Forecasting | Polynomial regression |
| Native | Capacitor 8 (Android) |
| Build | Vite |

---

## Screens

| Screen | What It Shows |
|---|---|
| App Lock | PIN entry / setup screen |
| Overview | Balance cards, daily burn, safe spend |
| Ledger | Transaction table with search/filter |
| Analytics | Annual charts + 14-day forecast |
| Trash | Deleted items with restore/permanent delete |
| Settings | Budget, balances, categories, PIN, backup |

---

## How Data Is Saved

1. **IndexedDB** — main database for transactions and trash (fast, local)
2. **localStorage** — settings, categories, budget, balances
3. **vault.enc** — encrypted copy of everything (Documents folder)
4. **Capacitor Preferences** — PIN data (native key-value store)

---

## How Backup Restore Works

1. App opens
2. Checks if local database is empty (fresh install or data wipe)
3. If empty and a vault file exists, shows a restore prompt
4. User taps **Restore** — vault is decrypted and data is loaded
5. User taps **Cancel** — vault is archived (renamed with timestamp), fresh start begins
6. Vault is never deleted — always archived for safety

---

## Default Categories

Morning Food, Night Food, Snacks, Petrol, Water Drinking, Internet/Light/Maintenance, Miscellaneous

---

## Building

```bash
npm install
npm run build
npx cap sync android
```

Then open `android/` in Android Studio and build the APK.

---

## Testing on Android

1. Enable **USB Debugging** on your Android device
2. Connect via USB
3. Open Chrome → `chrome://inspect` → inspect the WebView
4. Or use Android Studio's emulator/device manager

---

## License

Private — personal use only.
