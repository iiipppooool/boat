# Deploying BoatXchange

Everything below has been run except the Docker image build itself, this
repository was developed in a container without a Docker daemon. What *was*
verified is the thing the image runs: the standalone server, started with the
same environment and copy layout the Dockerfile produces, serving every page,
the health check, and writing its database to `DATABASE_PATH`.

## The one architectural fact

The app uses **SQLite**, which is a single-writer database on a local disk. That
drives every decision here:

- It needs a **persistent volume**. Without one, every deploy silently resets
  the database to seed data and every real listing is gone.
- It runs on **one machine**. Two containers pointed at one volume will corrupt
  it. Scaling past one instance means moving to Postgres first.

For a few hundred listings and a handful of submissions a day, one small
instance is genuinely the right architecture, not a compromise. It is also
about £5 a month.

## Fly.io, the tested path

`fly.toml` in this repo is ready to go.

```bash
fly auth login
fly launch --no-deploy          # accept the existing fly.toml
fly volumes create boatxchange_data --size 1 --region lhr

fly secrets set \
  ANTHROPIC_API_KEY=sk-ant-… \
  STRIPE_SECRET_KEY=sk_live_… \
  STRIPE_BOATHOUSE_PRICE_ID=price_… \
  STRIPE_WEBHOOK_SECRET=whsec_…

fly deploy
```

Then point `NEXT_PUBLIC_SITE_URL` at your real domain in `fly.toml` and redeploy,
because Stripe's success, cancel and portal-return URLs are built from it.

`auto_stop_machines = "suspend"` lets the machine sleep when idle and wake on
request, which is where the £5 comes from. `min_machines_running = 1` keeps one
alive so the first visitor of the day is not waiting on a cold start.

## Railway or Render

Both detect the Dockerfile. Two things to set by hand:

1. A **persistent volume** mounted at `/data`.
2. `DATABASE_PATH=/data/boatxchange.db`.

Health check path: `/api/health`. It reads the database rather than just
confirming Node is alive, so a process that is up but cannot see its own
inventory is correctly reported as unhealthy.

## Vercel, needs work first

Vercel's filesystem is ephemeral, so SQLite cannot persist there. Making this run
on Vercel means:

1. Replacing `src/lib/db.ts` with a Postgres pool (Neon and Supabase both have
   usable free tiers).
2. Rewriting the queries in `src/lib/inventory.ts` for `pg`.
3. **Making the repository functions async**, which is the part that is easy to
   underestimate, `searchListings`, `getFacets`, `getListingBySlug` and friends
   are synchronous today, and every call site becomes an `await`. TypeScript will
   find all of them, but it is a real change, not a config toggle.

Nothing else moves. No page, component or route handler touches SQL directly,
that was the point of routing everything through the repository.

At this scale, the container path is cheaper and simpler. Vercel becomes the
better answer when you need multiple regions or more write throughput than one
small box.

## A domain

**GitHub Pages will not work.** Pages serves static files; this is a Node server
with a database and streaming API routes. A `CNAME` file in the repo does
nothing here.

Point your domain at whichever host you chose (`fly certs add boatxchange.com`
on Fly), then set `NEXT_PUBLIC_SITE_URL` to match.

## Backups, do this before you have anything to lose

```bash
npm run backup            # -> backups/boatxchange-YYYY-MM-DD-HHmm.db
```

It uses SQLite's own backup API, not a file copy. That distinction matters: the
database runs in WAL mode, so at any moment part of the committed state lives in
the `-wal` file. Copying `boatxchange.db` while the app is running gives you a
file missing recent writes, which may not open at all. This takes a consistent
snapshot with the app still serving.

On Fly, run it against the volume and pull the file down:

```bash
fly ssh console -C "npm run backup -- --out /data/backups"
fly sftp get /data/backups/boatxchange-….db
```

Your host's volume snapshots are a complement to this, not a replacement.
Restoring a snapshot is an operation; restoring one of these is a file copy.

Worth automating on a schedule the day the first real listing arrives.

## Environment variables

| | Needed for | Without it |
|---|---|---|
| `DATABASE_PATH` | Pointing at the volume | Writes to `./var`, lost on redeploy |
| `NEXT_PUBLIC_SITE_URL` | Stripe redirects, metadata | Stripe returns users to localhost |
| `ANTHROPIC_API_KEY` | The AI Concierge | Concierge runs in offline mode and says so |
| `STRIPE_SECRET_KEY` | Billing | Billing disabled, endpoints return 503 |
| `STRIPE_BOATHOUSE_PRICE_ID` | Subscriptions | As above |
| `STRIPE_WEBHOOK_SECRET` | Granting access after payment | Webhooks rejected ,  **nobody gets upgraded** |

Every one of these degrades to a clearly-stated disabled state rather than an
error. Nothing crashes because a key is missing.

### Stripe webhook

Add an endpoint in the Stripe dashboard pointing at
`https://your-domain/api/billing/webhook`, subscribed to:

```
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.payment_failed
```

Paste its signing secret into `STRIPE_WEBHOOK_SECRET`. The webhook is the only
thing that grants Boathouse access, without it, people will pay and get nothing.

## Offline builds

The build self-hosts two Google fonts, which needs outbound network *at build
time*. If your build environment has none, either pre-download the fonts and
switch `src/app/layout.tsx` to `next/font/local`, or build the image somewhere
with network and push it to your registry.

## First deploy checklist

- [ ] Volume created and mounted at `/data`
- [ ] `DATABASE_PATH=/data/boatxchange.db`
- [ ] `NEXT_PUBLIC_SITE_URL` set to the real domain
- [ ] Stripe webhook endpoint added, secret set
- [ ] `/api/health` returning `{"status":"ok"}`
- [ ] `npm run backup` run once, and the file stored off the machine
- [ ] Contact details filled into `src/lib/site.ts`, until then the site shows
      none, which is correct but not useful
- [ ] Seed listings removed: `DELETE FROM listings WHERE source = 'seed';`
