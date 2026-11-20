# Live Public Demo Setup Guide

This guide explains how to set up the **AgentFuse Live Demo** on your public-facing marketing site.

## Security Model

The live demo uses the dashboard's built-in "View Live Public Demo" button on the login screen. This button authenticates with a hardcoded demo viewer key **programmatically** — the key never appears in a URL, query string, iframe `src`, or page source.

**Never embed an API key in a URL parameter or iframe `src` attribute.** Tokens in URLs are logged by reverse proxies, CDNs, and browser history, and are trivially scrapeable from page source.

## Embedding the Dashboard

The marketing site links to the dashboard login page. Visitors click the "View Live Public Demo" button to enter the read-only demo view. No iframe embedding with tokens is used.

```html
<a href="https://app.YOURDOMAIN.com"
   target="_blank" rel="noreferrer"
   class="cta-button">
  Launch Live Ops Dashboard
</a>
```

The demo button on the login screen handles authentication without exposing credentials.

## Keeping Data Fresh (Cron Runner)

If you deployed using `docker-compose.prod.yml`, the `demo-runner` container is already active. It continuously runs demo scenarios (Stuck Loop, Budget Overrun) to feed live data into the dashboard so visitors always see real activity.

Do not run the demo script manually as an unsupervised process.
