# Phase 7: Trade Journal And PnL Summary

Phase 7 adds the first durable trade journal. It is intentionally simple JSON storage so the bot remains easy to inspect on a VPS.

What was added:

- `JsonJournalStore`
  - reads and appends trade journal entries
  - stores data in `JOURNAL_FILE`
- Journal entry helpers:
  - planned/blocked entries from execution plans
  - submitted/confirmed/failed entries from execution results
- Summary calculations:
  - entries by status
  - buy/sell USDT totals
  - realized PnL
  - per-market/per-token position summaries
- API endpoint:
  - `GET /journal`
- Dashboard section:
  - journal totals
  - latest trade entries
  - position/PnL summaries

## Verification

Commands run:

```bash
npm run verify
```

Focused journal tests cover:

- position/PnL summary
- blocked entries from non-ready plans
- submitted entries from execution results
- JSON persistence

## Still Blocked Before Real Money

- Live execution is still not exposed through API/dashboard.
- Journal append is not yet wired to an operator-confirmed live execution command.
- Position quantity accounting is still USDT-level only; outcome-token quantity tracking should be added before automated exits.
