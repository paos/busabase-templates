export const sampleRecords = {
  "projects": [
    {
      "key": "december-launch",
      "fields": {
        "title": "December launch",
        "brief": "Launch the customer-facing service with working signup, clear copy and a usable product demo. Risks and decisions: confirm launch readiness before publishing.",
        "owner": "Launch team",
        "lane": "now",
        "status": "active",
        "start-date": "2026-11-02",
        "end-date": "2026-12-18"
      }
    },
    {
      "key": "customer-portal",
      "fields": {
        "title": "Customer portal",
        "brief": "Give customers a single place to find their account and support information. Done means the pilot team can complete the agreed customer journeys.",
        "owner": "Product team",
        "lane": "next",
        "status": "planned",
        "start-date": "2026-12-07",
        "end-date": "2027-01-29"
      }
    },
    {
      "key": "operations-refresh",
      "fields": {
        "title": "Operations refresh",
        "brief": "Simplify the internal handover process. Dates will be agreed after the launch.",
        "owner": "Operations team",
        "lane": "later",
        "status": "planned"
      }
    }
  ],
  "milestones": [
    {
      "key": "launch-page",
      "fields": {
        "title": "Launch page published",
        "project": "december-launch",
        "description": "Approved copy is published and the signup link works on desktop and phone.",
        "owner": "Marketing team",
        "start-date": "2026-11-09",
        "end-date": "2026-11-20",
        "done": true
      }
    },
    {
      "key": "demo-ready",
      "fields": {
        "title": "Product demo ready",
        "project": "december-launch",
        "description": "A representative customer can complete the core workflow without developer help.",
        "owner": "Product team",
        "start-date": "2026-11-23",
        "end-date": "2026-12-11",
        "done": false,
        "depends-on": [
          "launch-page"
        ]
      }
    },
    {
      "key": "announcement",
      "fields": {
        "title": "Customer announcement sent",
        "project": "december-launch",
        "description": "The agreed customer announcement has been checked and sent to the launch audience.",
        "owner": "Marketing team",
        "start-date": "2026-12-07",
        "end-date": "2026-12-09",
        "done": false,
        "depends-on": [
          "demo-ready"
        ]
      }
    },
    {
      "key": "portal-pilot",
      "fields": {
        "title": "Portal pilot available",
        "project": "customer-portal",
        "description": "Pilot users can sign in and find their account and support information.",
        "owner": "Product team",
        "start-date": "2026-12-07",
        "end-date": "2027-01-15",
        "done": false
      }
    },
    {
      "key": "handover",
      "fields": {
        "title": "Handover checklist agreed",
        "project": "operations-refresh",
        "description": "The team has one clear checklist and knows who takes over each responsibility.",
        "owner": "Operations team",
        "done": false
      }
    },
    {
      "key": "pricing-ready",
      "fields": {
        "title": "Pricing page published",
        "project": "december-launch",
        "description": "The agreed prices and billing terms are published.",
        "owner": "Commercial team",
        "start-date": "2026-12-01",
        "end-date": "2026-12-02",
        "done": false
      }
    },
    {
      "key": "support-guide",
      "fields": {
        "title": "Support guide ready",
        "project": "december-launch",
        "description": "Support can answer the launch questions using a shared guide.",
        "owner": "Support team",
        "start-date": "2026-12-01",
        "end-date": "2026-12-03",
        "done": false
      }
    },
    {
      "key": "signup-check",
      "fields": {
        "title": "Signup flow verified",
        "project": "december-launch",
        "description": "A new customer can register and reach the product.",
        "owner": "Product team",
        "start-date": "2026-12-02",
        "end-date": "2026-12-04",
        "done": false
      }
    },
    {
      "key": "launch-emails",
      "fields": {
        "title": "Launch emails prepared",
        "project": "december-launch",
        "description": "Launch emails have final copy and working links.",
        "owner": "Marketing team",
        "start-date": "2026-12-03",
        "end-date": "2026-12-07",
        "done": false
      }
    },
    {
      "key": "billing-check",
      "fields": {
        "title": "Billing flow verified",
        "project": "december-launch",
        "description": "A test purchase creates the correct invoice and subscription.",
        "owner": "Finance team",
        "start-date": "2026-12-04",
        "end-date": "2026-12-08",
        "done": false
      }
    },
    {
      "key": "analytics-ready",
      "fields": {
        "title": "Launch reporting ready",
        "project": "december-launch",
        "description": "The team can see signups, purchases and support requests.",
        "owner": "Operations team",
        "start-date": "2026-12-07",
        "end-date": "2026-12-09",
        "done": false
      }
    },
    {
      "key": "training-ready",
      "fields": {
        "title": "Team training completed",
        "project": "december-launch",
        "description": "Customer-facing staff can demonstrate the launch workflow.",
        "owner": "Support team",
        "start-date": "2026-12-08",
        "end-date": "2026-12-10",
        "done": false
      }
    },
    {
      "key": "help-published",
      "fields": {
        "title": "Help articles published",
        "project": "december-launch",
        "description": "The essential setup and troubleshooting articles are available.",
        "owner": "Support team",
        "start-date": "2026-12-09",
        "end-date": "2026-12-11",
        "done": false
      }
    },
    {
      "key": "rollback-ready",
      "fields": {
        "title": "Rollback plan rehearsed",
        "project": "december-launch",
        "description": "The release team has rehearsed recovery and knows the decision owner.",
        "owner": "Operations team",
        "start-date": "2026-12-10",
        "end-date": "2026-12-14",
        "done": false
      }
    },
    {
      "key": "release-check",
      "fields": {
        "title": "Release checklist completed",
        "project": "december-launch",
        "description": "The release checklist has evidence for every required item.",
        "owner": "Product team",
        "start-date": "2026-12-11",
        "end-date": "2026-12-15",
        "done": false
      }
    },
    {
      "key": "launch-signoff",
      "fields": {
        "title": "Launch readiness confirmed",
        "project": "december-launch",
        "description": "The team has checked all agreed readiness criteria.",
        "owner": "Launch team",
        "start-date": "2026-12-14",
        "end-date": "2026-12-16",
        "done": false
      }
    },
    {
      "key": "launch-results",
      "fields": {
        "title": "Launch results reviewed",
        "project": "december-launch",
        "description": "The team has reviewed the first results and recorded follow-up work.",
        "owner": "Launch team",
        "start-date": "2026-12-17",
        "end-date": "2026-12-18",
        "done": false
      }
    }
  ]
};
