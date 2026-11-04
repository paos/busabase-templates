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
    }
  ]
};
