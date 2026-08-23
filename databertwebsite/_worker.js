/**
 * Databert site worker (Cloudflare Pages "advanced mode").
 *
 * A single self-contained module at the root of the upload. Pages runs this
 * for every request: /api/contact is handled here, everything else is served
 * from the uploaded static files via the ASSETS binding.
 *
 * Why this file instead of a functions/ directory: Pages only compiles a
 * functions/ directory during a build (git integration or wrangler). A plain
 * drag and drop upload in the dashboard uploads files as they are, so the
 * directory is ignored and /api/contact returns an empty 405. A root
 * _worker.js is picked up by that same upload path, so the form works
 * without a build step.
 *
 * Email goes out through Resend (https://resend.com). Set RESEND_API_KEY as a
 * secret in the Pages project (Settings, then Variables and Secrets). Never
 * hardcode it here: Cloudflare injects it into `env` at request time.
 */

const RECIPIENT_EMAIL = "admin@databert.co.uk";

// Must be a domain you have verified in Resend. Until databert.co.uk is
// verified there, set this to "onboarding@resend.dev", which Resend allows
// for testing without any DNS setup.
const FROM_EMAIL = "admin@databert.co.uk";

const SITE_NAME = "Databert";
const MAX_FIELD_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5000;

const SERVICE_LABELS = {
  "power-bi": "Power BI Consulting & Development",
  fabric: "Microsoft Fabric Implementation",
  strategy: "Data & BI Strategy",
  reporting: "Reporting Modernization",
  "data-warehousing": "Data Warehousing & Pipelines",
  training: "Training & Enablement",
  "not-sure": "Not sure yet",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function cleanField(value) {
  return String(value ?? "")
    .trim()
    .replace(/[\r\n]+/g, " ")
    .slice(0, MAX_FIELD_LENGTH);
}

/**
 * GET /api/contact
 *
 * A deployment check you can open in a browser. It confirms the worker is
 * live and whether the Resend key is visible to it, without ever revealing
 * the key itself.
 */
function handleDiagnostic(env) {
  return json({
    ok: true,
    worker: "deployed",
    resendKeyConfigured: Boolean(env.RESEND_API_KEY),
    recipient: RECIPIENT_EMAIL,
    from: FROM_EMAIL,
    note: "This endpoint accepts POST from the contact form. If resendKeyConfigured is false, add RESEND_API_KEY as a secret in the Pages project and redeploy.",
  });
}

async function handleContact(request, env) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: "Could not read the form submission." }, 400);
  }

  // Honeypot: real visitors never fill this hidden field in. Report success
  // so bots cannot tell they were caught.
  if (form.get("website")) {
    return json({ ok: true });
  }

  const name = cleanField(form.get("name"));
  const email = cleanField(form.get("email"));
  const company = cleanField(form.get("company"));
  const service = cleanField(form.get("service")) || "not-sure";
  const message = String(form.get("message") ?? "").trim().slice(0, MAX_MESSAGE_LENGTH);

  if (!name || !email || !message) {
    return json({ ok: false, error: "Please fill in your name, email, and a short message." }, 422);
  }

  if (!EMAIL_PATTERN.test(email)) {
    return json({ ok: false, error: "That email address doesn't look right, please double check it." }, 422);
  }

  if (!env.RESEND_API_KEY) {
    return json(
      {
        ok: false,
        error:
          "Email sending is not configured yet. Add RESEND_API_KEY as a secret in the Cloudflare Pages project, then redeploy.",
      },
      500
    );
  }

  const bodyText = [
    "New enquiry from the Databert website contact form.",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Company: ${company || "(not provided)"}`,
    `Service: ${SERVICE_LABELS[service] || "Not sure yet"}`,
    "",
    "Message:",
    message,
  ].join("\n");

  let resendRes;
  let resendBody = "";
  try {
    resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${SITE_NAME} Website <${FROM_EMAIL}>`,
        to: [RECIPIENT_EMAIL],
        reply_to: email,
        subject: `[${SITE_NAME}] New enquiry from ${name}`,
        text: bodyText,
      }),
    });
    resendBody = await resendRes.text();
  } catch {
    return json(
      { ok: false, error: "The message could not be sent right now. Please try again shortly, or email us directly." },
      502
    );
  }

  if (!resendRes.ok) {
    // Surface Resend's own reason. It is the difference between "domain not
    // verified" and "invalid API key", which is otherwise invisible.
    let detail = "";
    try {
      const parsed = JSON.parse(resendBody);
      detail = parsed?.message || parsed?.error?.message || "";
    } catch {
      detail = resendBody.slice(0, 200);
    }
    return json(
      {
        ok: false,
        error: detail
          ? `The email service rejected the message: ${detail}`
          : "The message could not be sent right now. Please try again shortly, or email us directly.",
      },
      502
    );
  }

  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/api/contact") {
      if (request.method === "POST") {
        return handleContact(request, env);
      }
      if (request.method === "GET") {
        return handleDiagnostic(env);
      }
      return json({ ok: false, error: "This endpoint accepts GET or POST." }, 405);
    }

    // Everything else: serve the uploaded static files, including the
    // custom 404 page.
    return env.ASSETS.fetch(request);
  },
};
