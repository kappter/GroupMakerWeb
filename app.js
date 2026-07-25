"use strict";

const state = {
  headers: [],
  rows: [],
  groups: [],
  fileName: "",
};

const elements = {
  fileInput: document.querySelector("#fileInput"),
  dropZone: document.querySelector("#dropZone"),
  importSummary: document.querySelector("#importSummary"),
  fileName: document.querySelector("#fileName"),
  studentCount: document.querySelector("#studentCount"),
  configuration: document.querySelector("#configuration"),
  nameColumn: document.querySelector("#nameColumn"),
  performanceColumn: document.querySelector("#performanceColumn"),
  groupRange: document.querySelector("#groupRange"),
  groupValue: document.querySelector("#groupValue"),
  rangeTitle: document.querySelector("#rangeTitle"),
  rangeMaximum: document.querySelector("#rangeMaximum"),
  strategy: document.querySelector("#strategy"),
  strategyHelp: document.querySelector("#strategyHelp"),
  generateButton: document.querySelector("#generateButton"),
  clearButton: document.querySelector("#clearButton"),
  formMessage: document.querySelector("#formMessage"),
  emptyState: document.querySelector("#emptyState"),
  resultsSummary: document.querySelector("#resultsSummary"),
  groupsGrid: document.querySelector("#groupsGrid"),
  resultActions: document.querySelector("#resultActions"),
  copyButton: document.querySelector("#copyButton"),
  printButton: document.querySelector("#printButton"),
};

const strategyDescriptions = {
  random: "Shuffles every student with no academic weighting.",
  balanced:
    "Distributes performance levels so groups have similar overall profiles.",
  "high-low":
    "Alternates higher and lower values while distributing students across groups.",
  similar:
    "Sorts students by performance, then keeps nearby readiness levels together.",
};

elements.fileInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) loadFile(file);
});

["dragenter", "dragover"].forEach((eventName) => {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.add("is-dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove("is-dragging");
  });
});

elements.dropZone.addEventListener("drop", (event) => {
  const [file] = event.dataTransfer.files;
  if (file) loadFile(file);
});

document.querySelectorAll('input[name="sizeMode"]').forEach((radio) => {
  radio.addEventListener("change", updateRange);
});

elements.groupRange.addEventListener("input", () => {
  elements.groupValue.value = elements.groupRange.value;
});

elements.strategy.addEventListener("change", () => {
  elements.strategyHelp.textContent =
    strategyDescriptions[elements.strategy.value];
});

elements.generateButton.addEventListener("click", generateGroups);
elements.clearButton.addEventListener("click", resetApp);
elements.copyButton.addEventListener("click", copyGroups);
elements.printButton.addEventListener("click", () => window.print());

async function loadFile(file) {
  setMessage("");

  if (!file.name.toLowerCase().endsWith(".csv")) {
    setMessage("Please choose a CSV file.");
    return;
  }

  try {
    const text = await file.text();
    const parsed = parseCSV(text);

    if (parsed.length < 2) {
      throw new Error("The CSV needs a header row and at least one student.");
    }

    const [rawHeaders, ...rawRows] = parsed;
    const headers = makeUniqueHeaders(rawHeaders);
    const rows = rawRows
      .filter((row) => row.some((cell) => cell.trim() !== ""))
      .map((row) =>
        Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])),
      );

    if (!rows.length) throw new Error("No student rows were found.");

    state.headers = headers;
    state.rows = rows;
    state.groups = [];
    state.fileName = file.name;

    populateColumnSelects();
    showImportedRoster();
    updateRange();
    clearResults();
  } catch (error) {
    setMessage(error.message || "That file could not be read.");
  }
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        field += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (character === "," && !insideQuotes) {
      row.push(field.trim());
      field = "";
    } else if ((character === "\n" || character === "\r") && !insideQuotes) {
      if (character === "\r" && nextCharacter === "\n") index += 1;
      row.push(field.trim());
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (insideQuotes) throw new Error("The CSV contains an unclosed quote.");
  if (field.length || row.length) {
    row.push(field.trim());
    rows.push(row);
  }

  return rows;
}

function makeUniqueHeaders(headers) {
  const counts = new Map();

  return headers.map((header, index) => {
    const base = header.trim() || `Column ${index + 1}`;
    const count = (counts.get(base) || 0) + 1;
    counts.set(base, count);
    return count === 1 ? base : `${base} (${count})`;
  });
}

function populateColumnSelects() {
  elements.nameColumn.replaceChildren();
  elements.performanceColumn.replaceChildren(
    new Option("Not used", "", true, true),
  );

  state.headers.forEach((header) => {
    elements.nameColumn.add(new Option(header, header));
    elements.performanceColumn.add(new Option(header, header));
  });

  elements.nameColumn.value = detectColumn([
    "student name",
    "name",
    "student",
    "full name",
  ]);

  const detectedPerformance = detectColumn([
    "current grade",
    "grade",
    "score",
    "average",
    "percent",
    "performance",
  ]);
  elements.performanceColumn.value = detectedPerformance || "";
}

function detectColumn(candidates) {
  const normalizedHeaders = state.headers.map((header) => header.toLowerCase());

  for (const candidate of candidates) {
    const exactIndex = normalizedHeaders.indexOf(candidate);
    if (exactIndex >= 0) return state.headers[exactIndex];
  }

  for (const candidate of candidates) {
    const partialIndex = normalizedHeaders.findIndex((header) =>
      header.includes(candidate),
    );
    if (partialIndex >= 0) return state.headers[partialIndex];
  }

  return state.headers[0] || "";
}

function showImportedRoster() {
  elements.dropZone.hidden = true;
  elements.importSummary.hidden = false;
  elements.configuration.hidden = false;
  elements.clearButton.hidden = false;
  elements.fileName.textContent = state.fileName;
  elements.studentCount.textContent = `${state.rows.length} students detected`;
}

function updateRange() {
  if (!state.rows.length) return;

  const mode = getSizeMode();
  const maximum =
    mode === "count" ? state.rows.length : Math.max(2, state.rows.length);

  elements.rangeTitle.textContent =
    mode === "count" ? "Number of groups" : "Students per group";
  elements.groupRange.max = String(maximum);
  elements.groupRange.value = String(
    Math.min(Number(elements.groupRange.value), maximum),
  );
  elements.groupValue.value = elements.groupRange.value;
  elements.rangeMaximum.textContent = maximum;
}

function getSizeMode() {
  return document.querySelector('input[name="sizeMode"]:checked').value;
}

function generateGroups() {
  setMessage("");
  const nameColumn = elements.nameColumn.value;
  const performanceColumn = elements.performanceColumn.value;
  const strategy = elements.strategy.value;
  const students = state.rows
    .map((row, index) => ({
      name: row[nameColumn]?.trim(),
      performance: parseNumericValue(row[performanceColumn]),
      originalIndex: index,
    }))
    .filter((student) => student.name);

  if (students.length < 2) {
    setMessage("Choose a name column containing at least two students.");
    return;
  }

  if (strategy !== "random") {
    if (!performanceColumn) {
      setMessage("Choose a performance column for this strategy.");
      return;
    }
    if (students.some((student) => student.performance === null)) {
      setMessage(
        "Some performance values are blank or not numeric. Choose another column or use Pure random.",
      );
      return;
    }
  }

  const selectedValue = Number(elements.groupRange.value);
  const groupCount =
    getSizeMode() === "count"
      ? Math.min(selectedValue, students.length)
      : Math.ceil(students.length / selectedValue);

  state.groups = createGroups(students, groupCount, strategy);
  renderGroups(strategy);
}

function parseNumericValue(value) {
  if (value === undefined || value === null || value.trim() === "") return null;
  const cleaned = value.replace(/[$,%\s]/g, "");
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function createGroups(students, groupCount, strategy) {
  const groups = Array.from({ length: groupCount }, () => []);

  if (strategy === "random") {
    shuffle([...students]).forEach((student, index) => {
      groups[index % groupCount].push(student);
    });
  } else if (strategy === "balanced") {
    const sorted = [...students].sort(
      (a, b) => b.performance - a.performance,
    );
    sorted.forEach((student, index) => {
      const round = Math.floor(index / groupCount);
      const position = index % groupCount;
      const groupIndex =
        round % 2 === 0 ? position : groupCount - position - 1;
      groups[groupIndex].push(student);
    });
  } else if (strategy === "high-low") {
    const sorted = [...students].sort(
      (a, b) => b.performance - a.performance,
    );
    const interleaved = [];
    let high = 0;
    let low = sorted.length - 1;

    while (high <= low) {
      interleaved.push(sorted[high]);
      high += 1;
      if (high <= low) {
        interleaved.push(sorted[low]);
        low -= 1;
      }
    }

    interleaved.forEach((student, index) => {
      groups[index % groupCount].push(student);
    });
  } else {
    const sorted = [...students].sort(
      (a, b) => b.performance - a.performance,
    );
    sorted.forEach((student, index) => {
      const groupIndex = Math.floor((index * groupCount) / sorted.length);
      groups[groupIndex].push(student);
    });
  }

  return groups;
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[randomIndex]] = [items[randomIndex], items[index]];
  }
  return items;
}

function renderGroups(strategy) {
  elements.groupsGrid.replaceChildren();
  elements.emptyState.hidden = true;
  elements.resultActions.hidden = false;
  elements.resultsSummary.hidden = false;

  const usedPerformance = strategy !== "random";
  elements.resultsSummary.textContent = `${state.groups.length} groups · ${state.rows.length} roster rows · ${elements.strategy.options[elements.strategy.selectedIndex].text}`;

  state.groups.forEach((group, index) => {
    const article = document.createElement("article");
    article.className = "group-card";

    const header = document.createElement("header");
    const title = document.createElement("h3");
    title.textContent = `Group ${index + 1}`;
    const meta = document.createElement("span");
    meta.textContent = usedPerformance
      ? `${group.length} students · avg ${average(group).toFixed(1)}`
      : `${group.length} students`;
    header.append(title, meta);

    const list = document.createElement("ol");
    list.className = "student-list";
    group.forEach((student) => {
      const item = document.createElement("li");
      item.textContent = student.name;
      list.append(item);
    });

    article.append(header, list);
    elements.groupsGrid.append(article);
  });
}

function average(group) {
  return (
    group.reduce((total, student) => total + student.performance, 0) /
    group.length
  );
}

function clearResults() {
  state.groups = [];
  elements.groupsGrid.replaceChildren();
  elements.emptyState.hidden = false;
  elements.resultActions.hidden = true;
  elements.resultsSummary.hidden = true;
}

async function copyGroups() {
  const text = state.groups
    .map(
      (group, index) =>
        `Group ${index + 1}\n${group.map((student) => `- ${student.name}`).join("\n")}`,
    )
    .join("\n\n");

  try {
    await navigator.clipboard.writeText(text);
    const originalText = elements.copyButton.textContent;
    elements.copyButton.textContent = "Copied!";
    window.setTimeout(() => {
      elements.copyButton.textContent = originalText;
    }, 1400);
  } catch {
    setMessage("Copy was blocked by the browser. Try printing instead.");
  }
}

function resetApp() {
  state.headers = [];
  state.rows = [];
  state.groups = [];
  state.fileName = "";
  elements.fileInput.value = "";
  elements.dropZone.hidden = false;
  elements.importSummary.hidden = true;
  elements.configuration.hidden = true;
  elements.clearButton.hidden = true;
  clearResults();
  setMessage("");
}

function setMessage(message) {
  elements.formMessage.textContent = message;
}
