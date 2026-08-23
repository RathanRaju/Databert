# Databert

The Databert marketing site, a data analytics and reporting consultancy specialising in Microsoft Power BI and Microsoft Fabric.

Plain HTML/CSS/JS, deployed on **Cloudflare Pages**, with a small serverless worker handling the contact form. No build step, no framework, no `npm install`.

## What's in here

```
index.html             Home page
services.html          Full service breakdown (Power BI, Fabric, strategy, reporting, warehousing, training)
work.html              Example projects, with illustrative report mockups
about.html             Story, values, founder bio (placeholder, see below)
contact.html           Contact form and Calendly link
404.html               Custom "page not found" page
css/style.css          All styling
js/main.js             Nav, form handling, small interactions
assets/favicon.svg     Logo mark / favicon
_worker.js             Handles /api/contact and emails you via Resend; serves everything else
robots.txt, sitemap.xml
```

> **`_worker.js` must stay at the top level**, right next to `index.html`. That is
> what makes the contact form work on a drag and drop upload. A `functions/`
> directory only gets compiled during a real build (git integration or
> wrangler), which is why the form previously returned an empty 405.

## Before you launch, a short checklist

1. ~~Contact email~~ done. `RECIPIENT_EMAIL`/`FROM_EMAIL` in `_worker.js`, the footer on every page, and `contact.html` all point to `admin@databert.co.uk`.
2. ~~About page bio~~ done. `about.html` introduces Rathan Raju as Founder and Principal Consultant, with LinkedIn and email links underneath.
   - **Headshot:** drop a square image (about 400x400) into `assets/`, then in `about.html` delete the `.founder__avatar` line and uncomment the `.founder__photo` line directly below it.
   - **More links:** the `.founder__links` block has a commented example for adding your MentorCruise profile or anything else.
   - Add any Microsoft certifications you hold if you want them listed.
3. ~~Domain references~~ done. Canonical and OG URLs, `sitemap.xml`, and `robots.txt` all point to `databert.co.uk`.
4. **Example projects.** `work.html` holds four representative engagements with mockup report views, each labelled as illustrative rather than client work. Swap them for real case studies as projects complete and clients agree to be named. The teaser on `index.html` mirrors the first three, so update both.
5. **Phone and location**, if you want them. Right now the site lists email, Calendly, and "Remote first, worldwide."

### A note on the voice

The copy is written in the first person singular ("I build", "I will say so"), which suits an independent consultancy and reads warmer than the corporate "we". If Databert grows into a team, search for `I ` and `me ` across the HTML files and switch back to "we"/"us".

## Deploying to Cloudflare Pages

### Option A, direct upload (fastest, no GitHub needed)

1. In the **Cloudflare dashboard**, go to **Workers & Pages → Create → Pages → Upload assets**.
2. Give the project a name (e.g. `databert`), then upload the **contents** of this folder. Select `index.html`, `_worker.js`, `css`, `js`, `assets` and the rest together, not the enclosing folder, so everything lands at the top level.
3. Cloudflare deploys it to a `*.pages.dev` URL. From there you can attach your custom domain.
4. For future updates, re-upload through the same flow.

### Option B, connect a git repository (auto-deploys on every push)

1. **Workers & Pages → Create → Pages → Connect to Git**, pick the repository.
2. Build settings: leave the **build command** empty and set the **output directory** to `/`.
3. Every push to the connected branch redeploys automatically.

### Attaching your domain

Since the domain is registered at Cloudflare too, this is a couple of clicks: open the Pages project → **Custom domains → Add a custom domain**, enter `databert.co.uk` (and `www.databert.co.uk` if you want both). Cloudflare wires up the DNS itself, and SSL is automatic.

## The contact form

The form posts to `/api/contact`, handled by `_worker.js`, which sends the email through [Resend](https://resend.com).

**One-time setup:**

1. Sign up for a free Resend account (free tier: 3,000 emails/month, generous for a contact form).
2. Create an API key in Resend.
3. In the Cloudflare Pages project → **Settings → Variables and Secrets**, add a **secret** named `RESEND_API_KEY` with that key. Do this for Production and Preview if you use both.
   - The key never goes in the code or in git. Cloudflare injects it at request time and `_worker.js` reads it as `env.RESEND_API_KEY`.
4. **Redeploy.** Environment variables are baked in at deploy time, so an existing deployment will not pick up a newly added secret on its own.
5. To send *from* `admin@databert.co.uk`, add and verify `databert.co.uk` in Resend. It gives you SPF/DKIM records to add, and DNS already lives at Cloudflare. Until that is verified, set `FROM_EMAIL` in `_worker.js` to `onboarding@resend.dev`, which Resend allows with no DNS setup. The recipient stays `admin@databert.co.uk` either way.

### Checking it works

Open `https://databert.co.uk/api/contact` in a browser. You should get JSON like:

```json
{"ok":true,"worker":"deployed","resendKeyConfigured":true, ...}
```

- **Cloudflare's 404 page instead of JSON** means `_worker.js` did not deploy. Check it sits at the top level of what you uploaded.
- **`"resendKeyConfigured": false`** means the secret is missing, or you added it without redeploying.

The form has a honeypot field and length limits, so it is reasonably spam resistant without a CAPTCHA. When a send fails, the page shows Resend's actual reason rather than a generic message.

## Email for the domain

A domain doesn't come with a mailbox. Since DNS is on Cloudflare, the simplest free option is **Cloudflare → Email Routing**: it forwards `admin@databert.co.uk` (or a catch-all) into your existing inbox, with no separate mailbox to manage.

## Previewing changes locally

```bash
npx wrangler pages dev .
```

This runs the site including the `/api/contact` worker, closely matching production. Plain `python3 -m http.server` also works for browsing the pages, but won't run the contact form.

## Customizing further

- **Colors and fonts** are CSS custom properties at the top of `css/style.css` (`:root`). Change them once and they apply everywhere.
- **Services** appear in three places that need to stay in sync: the ledger on `index.html`, the detail sections in `services.html`, and the `<select>` options in `contact.html` (whose values map to `SERVICE_LABELS` in `_worker.js`).
- **Fonts** (Playfair Display) load from Google Fonts via a `<link>` tag in each page's `<head>`. No local font files to manage.
- **Report mockups** on `work.html` are plain HTML and inline SVG styled by the `.mock-*` classes in `css/style.css`. No charting library involved, so editing a number means editing the markup.
