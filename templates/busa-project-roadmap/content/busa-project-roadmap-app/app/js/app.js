import { airAppWriteMessage } from "../vendor/busabase-airapp.js";
import { getRuntime, shouldUseLocalGateway } from "./runtime.js";
import { createAirAppConnectGate } from "../vendor/busabase-airapp-gate.js";
import { createLiveProvider } from "./providers/live.js";
import { createDemoProvider } from "./providers/demo.js";
import {
  date,
  iso,
  addDays,
  weeks,
  refs,
  dependencyIssues,
  validateDates,
  escapeHtml as e,
  DAY,
} from "./model.js";
const root = document.querySelector("#app"),
  dialog = document.querySelector("#editor");
const demo = new URLSearchParams(location.search).get("demo") === "1";
const provider = demo ? createDemoProvider() : createLiveProvider();
const state = {
  projects: [],
  milestones: [],
  cursors: {},
  screen: "roadmap",
  lane: "all",
  start: iso(Date.now()),
  project: null,
  busy: false,
};
const title = (r) => r.fields.title || "Untitled";
const projectOf = (r) =>
  state.projects.find((p) => refs(r.fields.project).includes(p.id));
const issues = () => [
  ...dependencyIssues(state.projects),
  ...dependencyIssues(state.milestones),
];
const notify = (message) => {
  document.querySelector("#notice").textContent = message;
};
async function load() {
  const pages = await Promise.all(
    ["projects", "milestones"].map((key) => provider.page(key)),
  );
  ["projects", "milestones"].forEach((key, i) => {
    state[key] = pages[i].records;
    state.cursors[key] = pages[i].nextCursor;
  });
}
function shell(content) {
  root.innerHTML = `<header><div class="top"><div class="brand"><span class="mark" aria-hidden="true">↗</span><div><h1>Project Roadmap</h1><small>${e(provider.name)}</small></div></div><div class="actions"><span class="muted">A clear path from plans to done</span><button data-action="refresh" ${state.busy ? "disabled" : ""}>Refresh</button></div></div><nav aria-label="Sections">${["roadmap", "projects", "milestones", "help"].map((screen) => `<button data-screen="${screen}" class="${state.screen === screen ? "active" : ""}" ${state.screen === screen ? 'aria-current="page"' : ""}>${screen[0].toUpperCase() + screen.slice(1)}</button>`).join("")}</nav></header><main>${content}<p class="budget">${state.projects.length} projects · ${state.milestones.length} milestones loaded. Filters and dependency checks apply to loaded records.</p>${Object.entries(
    state.cursors,
  )
    .filter(([, cursor]) => cursor)
    .map(([key]) => `<button data-more="${key}">Load 50 more ${key}</button>`)
    .join("")}</main>`;
}
function intro(heading, description) {
  return `<div class="intro"><div><div class="eyebrow">Team planning</div><h2>${heading}</h2><p class="muted">${description}</p></div><div class="actions"><button data-new="milestones">+ Milestone</button><button class="primary" data-new="projects">+ Project</button></div></div>`;
}
function render() {
  if (state.screen === "roadmap") shell(roadmap());
  else if (state.screen === "projects")
    shell(state.project ? projectDetail() : projects());
  else if (state.screen === "milestones") shell(milestones());
  else shell(help());
}
function bar(row, kind, first) {
  const f = row.fields,
    start = date(f["start-date"]),
    end = date(f["end-date"]);
  if (!start || !end) return '<span class="undated">Unscheduled</span>';
  const offset = (start - date(first)) / DAY,
    duration = (end - start) / DAY + 1;
  const left = Math.max(0, offset),
    right = Math.min(84, offset + duration);
  if (right <= left) return '<span class="undated">Outside this window</span>';
  const conflict = issues().some(
    (i) => i.row.id === row.id && i.kind === "conflict",
  );
  return `<button class="bar ${f.done ? "done" : ""} ${conflict ? "conflict" : ""}" style="left:${(left / 84) * 100}%;width:${((right - left) / 84) * 100}%" data-open="${e(row.id)}" data-kind="${kind}" title="${e(title(row))}: ${e(f["start-date"])} to ${e(f["end-date"])}">${f.done ? "✓ " : ""}${e(title(row))}</button>`;
}
function roadmap() {
  const columns = weeks(state.start);
  const first = columns[0].day;
  const visible = state.projects
    .filter((p) => state.lane === "all" || p.fields.lane === state.lane)
    .toSorted(
      (a, b) =>
        ["now", "next", "later"].indexOf(a.fields.lane || "later") -
        ["now", "next", "later"].indexOf(b.fields.lane || "later"),
    );
  const conflicts = issues().filter((i) => i.kind === "conflict");
  return (
    intro(
      "See what’s coming",
      "Projects and milestones, across weeks and quarters.",
    ) +
    `<div class="toolbar"><div class="actions"><label for="lane" class="sr-only">Roadmap horizon</label><select id="lane"><option value="all">Now, Next & Later</option>${["now", "next", "later"].map((l) => `<option ${state.lane === l ? "selected" : ""} value="${l}">${l[0].toUpperCase() + l.slice(1)}</option>`).join("")}</select></div><div class="actions"><button data-shift="-84" aria-label="Previous twelve weeks">←</button><button data-action="today">Today</button><button data-shift="84" aria-label="Next twelve weeks">→</button><small>${e(first)} — ${addDays(first, 83)}</small></div></div>${conflicts.length ? `<div class="warning"><b>${conflicts.length} dependency conflict${conflicts.length === 1 ? "" : "s"} need attention.</b> Review the impact before moving dates. <button class="text-button" data-action="conflicts">View conflicts →</button></div>` : ""}<div class="timeline"><div class="timeline-inner"><div class="timeline-row"><div class="row-label"><b>Projects & milestones</b></div><div class="week-grid">${columns.map((w) => `<span><b>${e(w.quarter)}</b>${e(w.label)}<br>${new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(date(w.day))}</span>`).join("")}</div></div>${
      visible
        .map(
          (p) =>
            `<div class="timeline-row project-row"><div class="row-label"><button class="text-button" data-open="${e(p.id)}" data-kind="projects">${e(title(p))}</button><span class="lane">${e(p.fields.lane || "later")}</span></div><div class="track">${bar(p, "projects", first)}</div></div>${state.milestones
              .filter((m) => refs(m.fields.project).includes(p.id))
              .map(
                (m) =>
                  `<div class="timeline-row"><div class="row-label child"><span class="dot">${m.fields.done ? "✓" : "◇"}</span><button class="text-button" data-open="${e(m.id)}" data-kind="milestones">${e(title(m))}</button></div><div class="track">${bar(m, "milestones", first)}</div></div>`,
              )
              .join("")}`,
        )
        .join("") ||
      '<div class="empty">No projects in this horizon. Add a project to begin.</div>'
    }</div></div>`
  );
}
function projects() {
  return (
    intro("Projects", "The overall efforts your team is working towards.") +
    `<div class="card table-scroll"><table class="list"><thead><tr><th>Project</th><th>Owner</th><th>Horizon</th><th>Status</th><th>Planned finish</th></tr></thead><tbody>${state.projects.map((p) => `<tr><td><button class="text-button" data-open="${e(p.id)}" data-kind="projects">${e(title(p))}</button></td><td>${e(p.fields.owner || "Unassigned")}</td><td><span class="lane">${e(p.fields.lane || "later")}</span></td><td>${e(p.fields.status || "planned")}</td><td>${e(p.fields["end-date"] || "Unscheduled")}</td></tr>`).join("")}</tbody></table>${!state.projects.length ? '<p class="empty">Add your first project.</p>' : ""}</div>`
  );
}
function milestoneTable(rows) {
  return `<div class="table-scroll"><table class="list"><thead><tr><th>Milestone</th><th>Project</th><th>Owner</th><th>Finish</th><th>Completion</th></tr></thead><tbody>${rows.map((m) => `<tr><td><button class="text-button" data-open="${e(m.id)}" data-kind="milestones">${e(title(m))}</button></td><td>${e(projectOf(m) ? title(projectOf(m)) : "Project not loaded")}</td><td>${e(m.fields.owner || "Unassigned")}</td><td>${e(m.fields["end-date"] || "Unscheduled")}</td><td>${m.fields.done ? '<span class="badge-done">✓ Done</span>' : `<button data-done="${e(m.id)}" ${state.busy ? "disabled" : ""}>Mark done</button>`}</td></tr>`).join("")}</tbody></table>${!rows.length ? '<p class="empty">No milestones yet.</p>' : ""}</div>`;
}
function milestones() {
  return (
    intro(
      "Milestones",
      "Concrete outcomes. Anyone with edit access can mark them Done.",
    ) + `<div class="card">${milestoneTable(state.milestones)}</div>`
  );
}
function projectDetail() {
  const p = state.projects.find((p) => p.id === state.project);
  if (!p) {
    state.project = null;
    return projects();
  }
  return `<button class="text-button" data-action="back">← All projects</button><div class="intro"><div><h2>${e(title(p))}</h2><span class="lane">${e(p.fields.lane || "later")}</span></div><div class="actions"><button data-edit="${e(p.id)}" data-kind="projects">Edit project</button><button data-schedule="${e(p.id)}" data-kind="projects">Propose dates</button><button class="primary" data-new="milestones">+ Milestone</button></div></div><div class="project-detail"><div class="card"><h3>Purpose, risks and decisions</h3><p class="definition">${e(p.fields.brief || "Add the purpose of this project and any important risks or decisions.")}</p></div><div class="card"><p class="detail-label">Responsible person</p><p>${e(p.fields.owner || "Unassigned")}</p><p class="detail-label">Planned dates</p><p>${e(p.fields["start-date"] || "Not set")} → ${e(p.fields["end-date"] || "Not set")}</p><p class="detail-label">Status</p><p>${e(p.fields.status || "planned")}</p></div></div><div class="card"><h3>Milestones</h3>${milestoneTable(state.milestones.filter((m) => refs(m.fields.project).includes(p.id)))}</div>`;
}
function help() {
  return `<div class="card help"><h2>A small model for clear plans</h2><h3>Projects</h3><p>An overall effort, such as a launch. The brief explains its purpose, important risks and decisions. Use Now, Next or Later to show priority; dates show the planned calendar window.</p><h3>Milestones</h3><p>A concrete outcome within a project. “What done means” describes the finished result. The owner is responsible for progress; anyone with edit access can mark it Done. There is no acceptance step. If work needs revisiting, reopen it by clearing Done in Edit milestone.</p><h3>Dependencies and date proposals</h3><p>A dependency must finish before the dependent work starts. Amber bars flag conflicts among loaded records. Proposed dates preserve the task’s duration and await review in Busa; they do not move the live schedule immediately.</p><h3>Access and loading</h3><p>The app uses your existing Busa permissions. A normal edit is saved or submitted for review according to your access. Each load reads at most 50 records per table. Load more to include additional records in filters and dependency checks.</p></div>`;
}
function showDialog(html) {
  dialog.innerHTML = html;
  dialog.showModal();
  dialog.querySelector("[autofocus]")?.focus();
}
const dialogHeader = (text) =>
  `<header><h2>${e(text)}</h2><button class="close" type="button" data-close aria-label="Close">×</button></header>`;
function field(label, name, value = "", type = "text") {
  return `<label>${label}<input name="${name}" type="${type}" value="${e(value)}" ${name === "title" ? "required autofocus" : ""}></label>`;
}
function edit(kind, id) {
  const row = state[kind].find((r) => r.id === id),
    f = row?.fields || {};
  const isProject = kind === "projects";
  const options = (values, current) =>
    values
      .map(
        (v) =>
          `<option value="${v}" ${current === v ? "selected" : ""}>${v[0].toUpperCase() + v.slice(1)}</option>`,
      )
      .join("");
  showDialog(
    dialogHeader(
      row
        ? "Edit " + (isProject ? "project" : "milestone")
        : "New " + (isProject ? "project" : "milestone"),
    ) +
      `<form id="edit-form">${field("Name", "title", f.title)}${!isProject ? `<label>Project<select name="project" required>${state.projects.map((p) => `<option value="${e(p.id)}" ${refs(f.project).includes(p.id) || (!row && state.project === p.id) ? "selected" : ""}>${e(title(p))}</option>`).join("")}</select></label>` : ""}<label>${isProject ? "Purpose, risks and decisions" : "What done means"}<textarea name="${isProject ? "brief" : "description"}">${e(f[isProject ? "brief" : "description"] || "")}</textarea></label>${field("Responsible person", "owner", f.owner)}${isProject ? `<div class="form-grid"><label>Horizon<select name="lane">${options(["now", "next", "later"], f.lane || "later")}</select></label><label>Status<select name="status">${options(["planned", "active", "paused", "done"], f.status || "planned")}</select></label></div>` : `<label class="checkbox"><input name="done" type="checkbox" ${f.done ? "checked" : ""}>Done — no acceptance step</label>`}${!row ? `<div class="form-grid">${field("Planned start", "start-date", "", "date")}${field("Planned finish", "end-date", "", "date")}</div>` : '<p class="muted">Use “Propose dates” to change the schedule for review.</p>'}<label>Depends on<select name="depends-on" multiple size="3">${state[
        kind
      ]
        .filter((r) => r.id !== id)
        .map(
          (r) =>
            `<option value="${e(r.id)}" ${refs(f["depends-on"]).includes(r.id) ? "selected" : ""}>${e(title(r))}</option>`,
        )
        .join(
          "",
        )}</select><small>Select work that must finish first. Dependencies are optional.</small></label><div class="error" role="alert"></div><div class="form-footer"><button type="button" data-close>Cancel</button><button class="primary" type="submit">${row ? "Save changes" : "Create " + (isProject ? "project" : "milestone")}</button></div></form>`,
  );
  const key = crypto.randomUUID();
  dialog.querySelector("form").onsubmit = async (event) => {
    event.preventDefault();
    const form = event.target,
      values = new FormData(form),
      fields = Object.fromEntries(values);
    fields.title = String(fields.title).trim();
    if (!fields.title) return;
    fields["depends-on"] = values.getAll("depends-on");
    if (!isProject) fields.done = values.has("done");
    if (!row) {
      try {
        validateDates(fields["start-date"], fields["end-date"]);
      } catch (error) {
        form.querySelector(".error").textContent = error.message;
        return;
      }
      if (!fields["start-date"]) delete fields["start-date"];
      if (!fields["end-date"]) delete fields["end-date"];
    }
    const candidate = {
      ...(row || { id: "new" }),
      fields: { ...f, ...fields },
    };
    if (
      dependencyIssues([
        ...state[kind].filter((r) => r.id !== id),
        candidate,
      ]).some((i) => i.row.id === candidate.id && i.kind === "cycle")
    ) {
      form.querySelector(".error").textContent =
        "These dependencies form a loop. Choose different dependencies.";
      return;
    }
    await write(form, () => provider.save(kind, row, fields, key));
  };
}
function milestoneDetail(id) {
  const m = state.milestones.find((m) => m.id === id);
  showDialog(
    dialogHeader(title(m)) +
      `<p class="muted">${e(projectOf(m) ? title(projectOf(m)) : "Project not loaded")}</p><h3>What done means</h3><p class="definition">${e(m.fields.description || "Describe the finished result.")}</p><p><b>Responsible:</b> ${e(m.fields.owner || "Unassigned")}</p><p><b>Dates:</b> ${e(m.fields["start-date"] || "Not set")} → ${e(m.fields["end-date"] || "Not set")}</p><p>${m.fields.done ? "✓ Done" : "In progress"}</p><div class="actions"><button data-edit="${e(id)}" data-kind="milestones">Edit milestone</button><button data-schedule="${e(id)}" data-kind="milestones">Propose dates</button>${!m.fields.done ? `<button class="primary" data-done="${e(id)}">Mark done</button>` : ""}</div>`,
  );
}
function schedule(kind, id, suggestion) {
  const row = state[kind].find((r) => r.id === id);
  showDialog(
    dialogHeader("Propose dates") +
      `<p><b>${e(title(row))}</b></p><p class="muted">This proposal waits for review in Busa. The current schedule stays in place until approved.</p><form><div class="form-grid">${field("Start", "start-date", suggestion?.start || row.fields["start-date"] || "", "date")}${field("Finish", "end-date", suggestion?.end || row.fields["end-date"] || "", "date")}</div><div class="error" role="alert"></div><div class="form-footer"><button type="button" data-close>Cancel</button><button class="primary">Submit proposal</button></div></form>`,
  );
  dialog.querySelector("form").onsubmit = async (event) => {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.target));
    try {
      validateDates(fields["start-date"], fields["end-date"]);
      if (!fields["start-date"] || !fields["end-date"])
        throw new Error("Set both dates for the proposal.");
      await write(event.target, () => provider.propose(row, fields), true);
    } catch (error) {
      event.target.querySelector(".error").textContent = error.message;
    }
  };
}
function conflictsDialog() {
  showDialog(
    dialogHeader("Dependency attention") +
      `<p class="muted">Checks cover loaded records. No dates change until a proposal is reviewed.</p>${
        issues()
          .map(
            (i) =>
              `<div class="card"><b>${e(title(i.row))}</b><p>${e(i.message)}</p>${i.kind === "conflict" ? `<small>Suggested: ${i.start} → ${i.end}</small><br><button class="text-button" data-fix="${e(i.row.id)}">Review proposed dates →</button>` : ""}</div>`,
          )
          .join("") || "<p>No dependency issues in loaded records.</p>"
      }`,
  );
}
async function write(form, operation, scheduleProposal = false) {
  const button = form.querySelector('[type="submit"],button.primary');
  if (button) button.disabled = true;
  try {
    const outcome = await operation();
    dialog.close();
    notify(
      airAppWriteMessage(
        outcome,
        scheduleProposal
          ? {
              messages: {
                queued:
                  "Date proposal submitted for review. The current schedule stays unchanged.",
                saved: "Dates saved.",
              },
            }
          : {},
      ),
    );
    await load();
    render();
  } catch (error) {
    const target = form.querySelector(".error");
    if (target) target.textContent = error.message;
    else notify(error.message);
  } finally {
    if (button) button.disabled = false;
  }
}
async function markDone(id) {
  if (state.busy) return;
  state.busy = true;
  try {
    const row = state.milestones.find((m) => m.id === id);
    const outcome = await provider.save("milestones", row, { done: true });
    dialog.close();
    notify(airAppWriteMessage(outcome));
    await load();
  } catch (error) {
    notify(error.message);
  } finally {
    state.busy = false;
    render();
  }
}
async function click(event) {
  const b = event.target.closest("button");
  if (!b || b.disabled) return;
  if (b.hasAttribute("data-close")) {
    dialog.close();
    return;
  }
  if (b.dataset.screen) {
    state.screen = b.dataset.screen;
    state.project = null;
    render();
  } else if (b.dataset.new) {
    if (dialog.open) dialog.close();
    edit(b.dataset.new);
  } else if (b.dataset.edit) {
    if (dialog.open) dialog.close();
    edit(b.dataset.kind, b.dataset.edit);
  } else if (b.dataset.open) {
    if (b.dataset.kind === "projects") {
      state.screen = "projects";
      state.project = b.dataset.open;
      render();
    } else milestoneDetail(b.dataset.open);
  } else if (b.dataset.schedule) {
    if (dialog.open) dialog.close();
    schedule(b.dataset.kind, b.dataset.schedule);
  } else if (b.dataset.done) {
    await markDone(b.dataset.done);
  } else if (b.dataset.fix) {
    const issue = issues().find(
      (i) => i.row.id === b.dataset.fix && i.kind === "conflict",
    );
    dialog.close();
    schedule(
      state.projects.some((p) => p.id === issue.row.id)
        ? "projects"
        : "milestones",
      issue.row.id,
      issue,
    );
  } else if (b.dataset.shift) {
    state.start = addDays(state.start, Number(b.dataset.shift));
    render();
  } else if (b.dataset.more) {
    b.disabled = true;
    try {
      const key = b.dataset.more,
        page = await provider.page(key, state.cursors[key]);
      state[key] = [
        ...new Map(
          [...state[key], ...page.records].map((r) => [r.id, r]),
        ).values(),
      ];
      state.cursors[key] = page.nextCursor;
      render();
    } catch (error) {
      notify(error.message);
      b.disabled = false;
    }
  } else if (b.dataset.action === "today") {
    state.start = iso(Date.now());
    render();
  } else if (b.dataset.action === "back") {
    state.project = null;
    render();
  } else if (b.dataset.action === "conflicts") {
    conflictsDialog();
  } else if (b.dataset.action === "refresh") {
    b.disabled = true;
    try {
      await load();
      render();
    } catch (error) {
      notify(error.message);
      b.disabled = false;
    }
  }
}
document.addEventListener("click", (event) => {
  click(event).catch((error) => notify(error.message));
});
document.addEventListener("change", (event) => {
  if (event.target.id === "lane") {
    state.lane = event.target.value;
    render();
  }
});
try {
  if (!demo) {
    const runtime = await getRuntime();
    if (!runtime.determined)
      throw new Error(
        "The app runtime could not be verified. Refresh or check the app installation.",
      );
    if (shouldUseLocalGateway(runtime)) {
      const gate = createAirAppConnectGate({
        appName: "Project Roadmap",
        mount: root,
        shouldGate: () => true,
      });
      if (
        await gate.pass({
          onReady: async () => {
            await load();
            render();
          },
        })
      ) {
        await load();
        render();
      }
    } else {
      await load();
      render();
    }
  } else {
    await load();
    render();
  }
} catch (error) {
  root.innerHTML = `<div class="error-state"><h1>Project Roadmap could not load</h1><p>${e(error.message)}</p><button onclick="location.reload()">Try again</button><p>Check your Busa session and the template installation. Live failures never switch to demo data.</p></div>`;
}
