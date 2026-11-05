---
name: busa-project-roadmap
description: Plan projects and milestones across weeks and quarters. Use to add a project, define concrete outcomes, check dependencies, propose revised dates, or mark milestones done.
metadata:
  category: platform
  tags:
    - surface:busabase
    - workflow:project-management
    - risk:gated-write
  busabase:
    template: true
    folderSlug: busa-project-roadmap
    resources:
      - projects
      - milestones
    risk: gated-write
---

# Project Roadmap

Read the Busabase connection skill and the Space instructions before accessing this app.
Use the current user's permissions and ChangeRequests for every write. Never switch
credentials to get around a pending review.

## Find this installation

Resolve the installed Folder by metadata `appId: busa-project-roadmap` and
`resourceKey: app-root`. Resolve its child Bases by resource keys `projects` and
`milestones`. Use these stamped identities, not a name match. If more than one
installation exists, ask which one the user means before writing.

## Two entities

**Projects** are overall efforts, such as a December launch. Their brief records the
purpose, important risks and decisions. Owner means responsible person, not exclusive
editor. Horizon (`now`, `next`, `later`) expresses priority; start and finish dates
place the plan on the calendar. Status is `planned`, `active`, `paused` or `done`.
Projects may depend on other projects.

Use **Now** for current active work, **Next** for agreed next priorities awaiting
capacity or prerequisites, and **Later** for worthwhile future work without a near-term
commitment. Move Next to Now when the team is ready to begin. These horizons do not
represent fixed weeks or quarters; changing a horizon never changes planned dates.

**Milestones** are concrete outcomes within a project. A milestone must have a name
and project. `description` explains what done means, with enough detail to identify
the finished result. `owner` names the responsible person or team. Start and finish
are optional planned dates. Milestones can depend on other milestones. The `done`
checkbox records completion: anyone with edit access can mark it Done, and Done is
complete without an acceptance step. A team member with edit access may reopen it.
There is no reviewer or acceptance status for completion.

Do not introduce Products, Goals, Initiatives or Deliverables tables. A project may
involve several products; describe them in the brief and milestones as needed.

## Common jobs

- **Plan a project:** capture its purpose and clear milestones, responsible people,
  horizon and dates that the user actually supplied. Do not invent commitments.
- **Update progress:** preserve the definition of done. Mark a milestone done when
  requested; do not require its owner to do it. Normal edits leave `autoMerge` unset
  and follow the viewer's permission.
- **Review the roadmap:** read one bounded page per Base (at most 50 records), with
  relevant server-side filters when available. Preserve cursors; load another page
  only when the user requests more. Say which records are included in the review.
- **Check dependencies:** a predecessor must finish before dependent work starts.
  Flag missing dates, unloaded dependencies and dependency loops. Never interpret
  incomplete data as an all-clear.
- **Propose dates:** explain the conflict and preserve the work's calendar duration
  when suggesting a later start and finish. The user explicitly requires schedule
  changes to await review: submit that specific date change with `autoMerge: false`.
  Do not approve or merge the proposal. Leave current dates visible until reviewed.

## App and sample data

The AirApp offers Roadmap, Projects, Milestones and Help. Its twelve-week timeline
shows ISO week years and quarters. Undated work stays visibly unscheduled. Read
errors are shown; live mode never falls back to demo data.

Installation includes three fictional projects and seventeen milestones. One dependency
conflict illustrates the review flow. Replace samples only when explicitly asked;
do not delete somebody else's records while adding a real plan.

The reusable package binds resources at install time. It contains no workspace IDs,
credentials or outside integrations. No Vault setup is required. All persistent
workflow data belongs to the two native Bases.

## Interactive scheduling

Drag the middle of a milestone bar to move its dates, or drag an end to resize
the interval. Changes snap to calendar days. Release opens the schedule editor;
nothing is written until Submit proposal. Escape or Cancel discards the preview.
Clicking any milestone name or bar opens **Overview**. The same popup keeps the milestone name and project visible across **Overview**, **Edit details**, and **Dates & dependencies**. Cancel returns to Overview; Close exits the popup. Unsaved changes require an explicit discard before navigation. Save or Submit proposal returns to Overview with the result. Arrow keys move a focused
bar or edge by one day; Shift changes the step to a week.

The schedule editor shows start, finish, duration and selected dependency names.
Search to add prerequisites or remove a named chip. Start after dependencies keeps
the duration and proposes the day after the latest known prerequisite finish.
Unknown prerequisites and missing dates are flagged; never infer their dates.
Cycles block submission. Warnings identify downstream conflicts; dependent
milestones are never moved automatically. Date and dependency changes made here
are submitted together with explicit review, preserving the current plan.

On Busa versions where Restart only reattaches to a server-side run, use Stop
then Run after an app update to load the new source.
