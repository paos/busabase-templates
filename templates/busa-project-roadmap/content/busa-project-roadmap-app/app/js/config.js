export const appConfig = {
  "appId": "busa-project-roadmap",
  "name": "Project Roadmap",
  "binding": "runtime",
  "schemaVersion": 1,
  "folder": {
    "slug": "busa-project-roadmap",
    "name": "Project Roadmap",
    "description": "Projects and milestones on a clear weekly roadmap.",
    "agentPrompts": [
      {
        "key": "review-plan",
        "label": "Review this roadmap",
        "body": "Read the `busa-project-roadmap` skill in this folder, then review the projects and milestones I name, highlighting blocked work and dates that need a decision.",
        "intent": "read-only"
      },
      {
        "key": "add-project",
        "label": "Add a project to the roadmap",
        "body": "Read the `busa-project-roadmap` skill in this folder, then add the project I describe and its milestones, using plain descriptions of what must be delivered.",
        "intent": "change"
      }
    ]
  },
  "bases": [
    {
      "key": "projects",
      "slug": "busa-project-roadmap-projects",
      "name": "Projects",
      "description": "The overall efforts on the roadmap.",
      "readLimit": 50,
      "primary": "title",
      "fields": [
        {
          "slug": "title",
          "name": "Name",
          "type": "text",
          "required": true,
          "options": {}
        },
        {
          "slug": "brief",
          "name": "Purpose, risks and decisions",
          "type": "longtext",
          "required": false,
          "options": {}
        },
        {
          "slug": "owner",
          "name": "Responsible person",
          "type": "text",
          "required": false,
          "options": {}
        },
        {
          "slug": "lane",
          "name": "Planning lane",
          "type": "select",
          "required": false,
          "options": {
            "choices": [
              {
                "id": "now",
                "name": "Now"
              },
              {
                "id": "next",
                "name": "Next"
              },
              {
                "id": "later",
                "name": "Later"
              }
            ]
          }
        },
        {
          "slug": "status",
          "name": "Status",
          "type": "select",
          "required": false,
          "options": {
            "choices": [
              {
                "id": "planned",
                "name": "Planned"
              },
              {
                "id": "active",
                "name": "In progress"
              },
              {
                "id": "paused",
                "name": "Paused"
              },
              {
                "id": "done",
                "name": "Done"
              }
            ]
          }
        },
        {
          "slug": "start-date",
          "name": "Start date",
          "type": "date",
          "required": false,
          "options": {}
        },
        {
          "slug": "end-date",
          "name": "Finish date",
          "type": "date",
          "required": false,
          "options": {}
        },
        {
          "slug": "depends-on",
          "name": "Depends on",
          "type": "relation",
          "required": false,
          "options": {
            "targetBaseSlug": "busa-project-roadmap-projects",
            "multiple": true
          }
        }
      ],
      "views": [
        {
          "slug": "projects",
          "name": "Projects",
          "type": "table",
          "config": {
            "visibleFieldSlugs": [
              "title",
              "brief",
              "owner",
              "lane",
              "status",
              "start-date"
            ]
          }
        }
      ],
      "agentPrompts": [
        {
          "key": "plan-project",
          "label": "Plan a project and its milestones",
          "body": "Read the `busa-project-roadmap` skill in this folder, then turn the project I describe into a clear purpose, responsible person, planning lane and dated milestones. Check for an existing project first.",
          "intent": "change"
        },
        {
          "key": "roadmap-check",
          "label": "What could delay our roadmap?",
          "body": "Read the `busa-project-roadmap` skill in this folder, then summarise the projects I name, their unfinished milestones and dependency conflicts. State which records were checked.",
          "intent": "read-only"
        }
      ]
    },
    {
      "key": "milestones",
      "slug": "busa-project-roadmap-milestones",
      "name": "Milestones",
      "description": "What must be delivered, when, and what done means.",
      "readLimit": 50,
      "primary": "title",
      "fields": [
        {
          "slug": "title",
          "name": "Name",
          "type": "text",
          "required": true,
          "options": {}
        },
        {
          "slug": "project",
          "name": "Project",
          "type": "relation",
          "required": true,
          "options": {
            "targetBaseSlug": "busa-project-roadmap-projects",
            "multiple": false
          }
        },
        {
          "slug": "description",
          "name": "What done means",
          "type": "longtext",
          "required": false,
          "options": {}
        },
        {
          "slug": "owner",
          "name": "Responsible person",
          "type": "text",
          "required": false,
          "options": {}
        },
        {
          "slug": "start-date",
          "name": "Start date",
          "type": "date",
          "required": false,
          "options": {}
        },
        {
          "slug": "end-date",
          "name": "Finish date",
          "type": "date",
          "required": false,
          "options": {}
        },
        {
          "slug": "done",
          "name": "Done",
          "type": "checkbox",
          "required": false,
          "options": {}
        },
        {
          "slug": "depends-on",
          "name": "Depends on",
          "type": "relation",
          "required": false,
          "options": {
            "targetBaseSlug": "busa-project-roadmap-milestones",
            "multiple": true
          }
        }
      ],
      "views": [
        {
          "slug": "milestones",
          "name": "Milestones",
          "type": "table",
          "config": {
            "visibleFieldSlugs": [
              "title",
              "project",
              "description",
              "owner",
              "start-date",
              "end-date"
            ]
          }
        }
      ],
      "agentPrompts": [
        {
          "key": "record-completion",
          "label": "Mark a milestone done",
          "body": "Read the `busa-project-roadmap` skill in this folder, then mark the milestone I name done and preserve its definition of done. Anyone with edit access can complete it; no acceptance step is required.",
          "intent": "change"
        },
        {
          "key": "check-dates",
          "label": "Check milestone dependencies",
          "body": "Read the `busa-project-roadmap` skill in this folder, then check the dated milestones I name for dependency conflicts and missing dates. Explain suggested date changes without applying them.",
          "intent": "read-only"
        }
      ]
    }
  ],
  "permissions": {
    "read": [
      "nodes.list",
      "nodes.get",
      "bases.get",
      "records.list",
      "records.get"
    ],
    "write": [
      "bases.createChangeRequest",
      "records.changeRequest"
    ]
  },
  "onboarding": {
    "version": 1,
    "required_fields": [],
    "completion_resource": "projects",
    "rationale": "No external integration or operator-specific configuration is required."
  }
};
