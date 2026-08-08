# Inbox

Drop sources here to process later, one per line. Then run the ingester on each.

Format: `<url-or-note>  | domain:roofing|allerion|general  | (optional comment)`

```text
# example (delete me):
# https://www.youtube.com/watch?v=XXXXXXXXXXX | domain:roofing | drone measuring for takeoffs
```

To ingest a line:

```bash
npm run brain:ingest -- "https://www.youtube.com/watch?v=XXXX" --domain roofing
```
