// Retrieve the saved to-do items and projects from local storage
const items = JSON.parse(localStorage.getItem("items")) || [];
const projects = JSON.parse(localStorage.getItem("projects")) || [];

// Add a global variable to persist the clarification div
let clarificationDiv;

function downloadTodoListAsPDF(projectIndex = null) {
    const userInput = document.querySelector("input[type='text']").value.trim();
    const sourceItems = projectIndex === null ? items : projects[projectIndex].items;
    const filteredItems = sourceItems.filter(item => item).filter(item => !item.projectId);
    const title = projectIndex === null ? 'A to-do list' : `Project: ${projects[projectIndex].name}`;

    const itemRows = filteredItems.map((item, index) => {
        const itemText = `${index + 1}. ${item.text}`;
        if (item.done) {
            return [
                { text: itemText, decoration: 'lineThrough' }
            ];
        } else {
            return [itemText];
        }
    });

    const docDefinition = {
        content: [
            { text: 'Main To-Do List', fontSize: 14, bold: true, margin: [0, 0, 0, 10] },
            {
                table: {
                    body: itemRows,
                    widths: ['*'],
                    heights: 20
                },
                layout: 'noBorders'
            }
        ],
        defaultStyle: {
            fontSize: 12
        }
    };
    docDefinition.content[0].text = title;

    if (userInput) {
        docDefinition.content.push({ text: `Big task: ${userInput}`, fontSize: 12, margin: [0, 10, 0, 0] });
    }


    pdfMake.createPdf(docDefinition).open();
}

function renderProjects() {
    const projectContainer = document.querySelector(".project-container");
    projectContainer.innerHTML = '<button id="create-project">Create Project</button>';

    const projectList = document.createElement("ul");

    for (let i = 0; i < projects.length; i++) {
        const project = projects[i];
        const li = document.createElement("li");

        const projectWrapper = document.createElement("div");
        projectWrapper.className = "project-wrapper";
        li.appendChild(projectWrapper);

        const projectName = document.createElement("span");
        projectName.textContent = project.name;
        projectName.style.cursor = "pointer";
        projectName.classList.add("project-title");
        projectName.setAttribute("data-project-index", i);
        projectWrapper.appendChild(projectName);

        const nestedListContainer = document.createElement("div");
        nestedListContainer.style.display = project.expanded ? "block" : "none";
        nestedListContainer.classList.add("nested-list-container");
        projectWrapper.appendChild(nestedListContainer);

        const nestedList = document.createElement("ul");
        nestedListContainer.appendChild(nestedList);

        projectName.addEventListener("click", () => {
            project.expanded = !project.expanded;
            localStorage.setItem("projects", JSON.stringify(projects));
            renderProjects();
        });

        addProjectButtons(i, project, projectWrapper);
        addProjectDragAndDropHandlers(projectName, i);
        addDragAndDropFromMainListHandler(projectName, i);

        for (let j = 0; j < project.items.length; j++) {
            const item = project.items[j];
            if (!item) continue;
            const nestedLi = createProjectListItem(item, i, j);
            nestedList.appendChild(nestedLi);
        }
        projectList.appendChild(li);
    }

    projectContainer.appendChild(projectList);
    document.getElementById("create-project").addEventListener("click", () => {
        const projectName = prompt("Enter the project name:");
        if (projectName) {
            createProject(projectName);
        }
    });
}

function addProjectDragAndDropHandlers(projectName, i) {
    projectName.setAttribute("draggable", "true");

    projectName.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData("text/plain", JSON.stringify({ source: "project-title", projectIndex: i }));
    });

    projectName.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    });

    projectName.addEventListener("dragenter", (event) => {
        event.preventDefault();
        projectName.classList.add("drag-over");
    });

    projectName.addEventListener("dragleave", (event) => {
        projectName.classList.remove("drag-over");
    });

    projectName.addEventListener("drop", (event) => {
        event.preventDefault();
        event.stopPropagation();
        projectName.classList.remove("drag-over");
        const dataString = event.dataTransfer.getData("text/plain");
        const data = JSON.parse(dataString);
        if (data.source === "main") {
            addToProject(data.index, i);
        } else if (data.source === "project-title") {
            const draggedProject = projects[data.projectIndex];
            if (data.projectIndex !== i) {
                projects.splice(data.projectIndex, 1);
                projects.splice(i, 0, draggedProject);
                localStorage.setItem("projects", JSON.stringify(projects));
                renderProjects();
            }
        }
    });
}

function addDragAndDropFromMainListHandler(projectName, i) {
    projectName.setAttribute("draggable", "true");
    projectName.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData("text/plain", JSON.stringify({ source: "project-title", projectIndex: i }));
    });

    projectName.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    });

    projectName.addEventListener("dragenter", (event) => {
        event.preventDefault();
        if (event.target.classList.contains("project-title")) {
            event.target.classList.add("drag-over");
        }
    });

    projectName.addEventListener("dragleave", (event) => {
        event.preventDefault();
        projectName.classList.remove("drag-over");
    });

    projectName.addEventListener("drop", (event) => {
        event.stopPropagation();
        projectName.classList.remove("drag-over");
        const dataString = event.dataTransfer.getData("text/plain");
        const data = JSON.parse(dataString);

        if (data.source === "main") {
            addToProject(data.index, i);
        } else if (data.source === "project-title") {
            const draggedProject = projects[data.projectIndex];
            projects.splice(data.projectIndex, 1);
            projects.splice(i, 0, draggedProject);
            localStorage.setItem("projects", JSON.stringify(projects));
            renderProjects();
        } else if (data.source === "project") {
            const draggedItem = projects[data.projectIndex].items[data.itemIndex];
            projects[data.projectIndex].items.splice(data.itemIndex, 1);
            projects[i].items.push(draggedItem);
            localStorage.setItem("projects", JSON.stringify(projects));
            renderProjects();
        }
    });
}

function addProjectButtons(i, project, li) {
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "button-container";
    li.appendChild(buttonContainer);

    // Add Delete button
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.classList.add("delete-button");
    deleteButton.addEventListener("click", (event) => {
        // Stop event propagation to prevent expanding/collapsing the project
        event.stopPropagation();
        // Remove the project and its associated to-do items
        projects.splice(i, 1);
        items.forEach((item, index) => {
            if (item && item.projectId === project.id) {
                remove(index, false);
            }
        });
        localStorage.setItem("projects", JSON.stringify(projects));
        render();
    });
    buttonContainer.appendChild(deleteButton);

    // Add Edit button
    const editButton = document.createElement("button");
    editButton.textContent = "Edit";
    editButton.classList.add("project-edit-button");
    editButton.addEventListener("click", (event) => {
        // Stop event propagation to prevent expanding/collapsing the project
        event.stopPropagation();
        // Prompt the user to enter a new project name
        const newProjectName = prompt("Enter the new project name:");
        if (newProjectName) {
            project.name = newProjectName;
            localStorage.setItem("projects", JSON.stringify(projects));
            renderProjects();
        }
    });
    buttonContainer.appendChild(editButton);

    const downloadPDFButton = document.createElement("button");
    downloadPDFButton.textContent = "Download PDF";
    downloadPDFButton.classList.add("project-download-pdf-button");
    downloadPDFButton.addEventListener("click", (event) => {
        event.stopPropagation(); // Prevent expanding/collapsing the project
        downloadTodoListAsPDF(i);
    });
    buttonContainer.appendChild(downloadPDFButton);
}

function createProjectListItem(item, projectIndex, itemIndex) {
    const nestedLi = document.createElement("li");

    // Add a checkbox to mark the item as done
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = item.done;
    checkbox.addEventListener("change", (ev) => {
        ev.stopPropagation();
        item.done = checkbox.checked;
        localStorage.setItem("projects", JSON.stringify(projects));
        renderProjects();
    });
    nestedLi.appendChild(checkbox);

    const itemSpan = document.createElement("span");
    itemSpan.textContent = item.text;
    nestedLi.appendChild(itemSpan);

    const deleteButton = document.createElement("button");
    deleteButton.className = "prj-item-delete-btn";
    nestedLi.appendChild(deleteButton);

    const deleteIcon = document.createElement("i");
    deleteIcon.classList.add("fas", "fa-trash");
    deleteButton.appendChild(deleteIcon);

    deleteButton.addEventListener("click", () => {
        deleteProjectItem(projectIndex, itemIndex);
    });

    if (item.done) {
        nestedLi.classList.add("done");
    }

    addDragAndDropHandlers(nestedLi, itemIndex, projectIndex, true);
    return nestedLi;
}

function deleteProjectItem(projectIndex, itemIndex) {
    projects[projectIndex].items.splice(itemIndex, 1);
    localStorage.setItem("projects", JSON.stringify(projects));
    renderProjects();
}

function createProject(name) {
    const project = {
        name,
        items: [],
        expanded: false,
    };
    projects.push(project);
    localStorage.setItem("projects", JSON.stringify(projects));
    renderProjects();
}


// Function to create a new project
function createProject(name) {
    const project = {
        name,
        items: [],
        expanded: false,
    };
    projects.push(project);
    localStorage.setItem("projects", JSON.stringify(projects));
    renderProjects();
}

function addToProject(index, projectIndex) {
    if (projects[projectIndex]) {
        const item = items[index];
        projects[projectIndex].items.push(item);
        remove(index);
        console.log(projects);
        localStorage.setItem("projects", JSON.stringify(projects));
        renderProjects();
    }
}

// Function to render the to-do list
function render() {
    // Add the form to add a new to-do item at the top
    const form = document.createElement("form");
    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const input = event.target.querySelector("input[type='text']");
        const text = input.value.trim();

        if (text) {
            add(text);
            input.value = "";
            input.focus();
        }
    });

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Type your task here and Enter ...";
    form.appendChild(input);

    // Add the "Break it down" button
    const breakButton = document.createElement("button");
    breakButton.textContent = "Break it down to small steps?";
    breakButton.className = "main-list-btn";
    breakButton.setAttribute("title", "Use Chat GPT to break this down to small steps");
    breakButton.addEventListener("click", async () => {
        const text = input.value.trim();
        if (text) {

            // Show loading animation
            const loadingCircle = document.createElement("div");
            loadingCircle.classList.add("loading-circle");
            form.appendChild(loadingCircle);

            try {

                const response = await fetch("http://localhost:3000/api/generate", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ task: text })
                });
                const res = await response.json();
                let content = res.choices[0].message.content;
                const items = parseMarkdownNumberedList(content);
                items.forEach(item => add(item.text));
            } catch (error) {
                console.error(error);
                add("Sorry there is something wrong with the server, please try again later!");
            } finally {
                // Remove loading animation
                form.removeChild(loadingCircle);

            }
        }
    });

    // Add the to-do list to the app div
    const list = document.createElement("ul");
    list.style.maxHeight = "500px"; // Add a max-height to make the list scrollable
    list.style.overflow = "auto"; // Add overflow:auto to show scrollbar when list overflows

    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        if (!item) continue;

        const li = document.createElement("li");

        // Add a checkbox to mark the item as done
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = item.done;
        checkbox.addEventListener("change", (ev) => {
            ev.stopPropagation();
            item.done = checkbox.checked;
            localStorage.setItem("items", JSON.stringify(items));

            // Move done items to the "Default" project
            if (item.done && !item.projectId) {
                const defaultProject = projects.find(project => project.name === "Default");
                if (!defaultProject) {
                    createProject("Default");
                }

                const projectId = projects.findIndex(project => project.name === "Default");
                projects[projectId].items.push(item);
                remove(i);
                localStorage.setItem("projects", JSON.stringify(projects));
                renderProjects();
            }

            render();
        });
        li.appendChild(checkbox);

        const span = document.createElement("span");
        span.textContent = item.text;
        li.appendChild(span);

        const button = document.createElement("button");
        button.textContent = "Delete";
        button.className = "delete-button";
        button.addEventListener("click", () => {
            remove(i);
        });
        li.appendChild(button);

        if (item.done) {
            li.classList.add("done"); // Add "done" class to completed items
        }

        addDragAndDropHandlers(li, i);

        list.appendChild(li);
    }

    // Add "Download PDF" button
    const downloadPDFButton = document.createElement("button");
    downloadPDFButton.textContent = "Download PDF";
    downloadPDFButton.className = "main-list-btn";
    downloadPDFButton.addEventListener("click", () => {
        downloadTodoListAsPDF();
    });


    // Add the form, "Break it down" button, and to-do list to the app div
    const app = document.querySelector("#app");
    app.innerHTML = "";
    app.appendChild(form);
    app.appendChild(breakButton);
    app.appendChild(downloadPDFButton);
    app.appendChild(list);

    // Scroll the list to the bottom
    list.scrollTop = list.scrollHeight;

    renderProjects();
}

function addDragAndDropHandlers(li, i, projectIndex, isProject = false) {
    // Set the draggable attribute for the list item
    li.setAttribute("draggable", "true");

    li.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData("text/plain", JSON.stringify({ source: isProject ? projectIndex : "main", index: i }));
        li.classList.add("draggable");
    });

    li.addEventListener("dragover", (event) => {
        event.preventDefault();
        let data = event.dataTransfer.getData("text/plain");
        if (data) {
            const draggingElementIndex = JSON.parse(data).index;
            const targetElementIndex = i;
            handleDragOver(event, draggingElementIndex, targetElementIndex);
        }
    });

    li.addEventListener("drop", (event) => {
        event.preventDefault();
        const source = JSON.parse(event.dataTransfer.getData("text/plain")).source;
        const fromIndex = JSON.parse(event.dataTransfer.getData("text/plain")).index;
        const toIndex = i;
        if (isProject) {
            handleDrop(event, source, fromIndex, projectIndex, isProject);
        } else {
            handleDrop(event, source, toIndex, projectIndex);
        }
    });
}

function handleDragOver(event, draggingElementIndex, targetElementIndex) {
    const listItems = document.querySelectorAll("ul li");
    const draggingElement = listItems[draggingElementIndex];
    const targetElement = listItems[targetElementIndex];

    listItems.forEach((listItem, index) => {
        if (index === draggingElementIndex) {
            listItem.style.transform = "translateY(0)";
        } else if (index >= targetElementIndex) {
            listItem.style.transform = `translateY(${draggingElement.offsetHeight}px)`;
        } else {
            listItem.style.transform = "translateY(0)";
        }
    });
}

function handleDrop(event, source, fromIndex, toIndex, isProject = false) {
    if (source == "main" && isProject) {
        addToProject(fromIndex, toIndex);
        render();
    } else
        if (source === "main") {
            const movedItem = items.splice(fromIndex, 1)[0];
            items.splice(toIndex, 0, movedItem);
            localStorage.setItem("items", JSON.stringify(items));
        } else {
            const fromProjectIndex = source;
            const toProjectIndex = source;
            const movedItem = projects[fromProjectIndex].items.splice(fromIndex, 1)[0];
            projects[toProjectIndex].items.splice(toIndex, 0, movedItem);
            console.log(fromProjectIndex, toProjectIndex, fromIndex, toIndex);
            console.log(movedItem);
            localStorage.setItem("projects", JSON.stringify(projects));
        }
    render();
}

// Function to display the clarification
function displayClarification(text) {
    const appDiv = document.querySelector("#app");

    if (clarificationDiv) {
        clarificationDiv.remove();
    }

    clarificationDiv = document.createElement("div");
    clarificationDiv.style.backgroundColor = "#f8f9fa";
    clarificationDiv.style.borderRadius = "5px";
    clarificationDiv.style.padding = "10px";
    clarificationDiv.style.marginTop = "10px";
    clarificationDiv.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.1)";

    // Use marked library to render the markdown content as HTML
    const renderedMarkdown = marked.parse(text);
    clarificationDiv.innerHTML = renderedMarkdown;

    const removeButton = document.createElement("button");
    removeButton.textContent = "Remove";
    removeButton.style.backgroundColor = "#e74c3c";
    removeButton.style.color = "#fff";
    removeButton.style.border = "none";
    removeButton.style.padding = "5px 10px";
    removeButton.style.fontSize = "14px";
    removeButton.style.borderRadius = "5px";
    removeButton.style.cursor = "pointer";
    removeButton.style.float = "right";
    removeButton.addEventListener("click", () => {
        clarificationDiv.remove();
        clarificationDiv = null;
    });
    clarificationDiv.appendChild(removeButton);

    appDiv.appendChild(clarificationDiv);
}

// Function to add a new to-do item
function add(text) {
    const item = {
        text,
    };
    items.push(item);
    localStorage.setItem("items", JSON.stringify(items));
    render();
    document.querySelector("input[type='text']").focus();
}

function remove(index, shouldRender = true) {
    items.splice(index, 1);
    localStorage.setItem("items", JSON.stringify(items));
    if (shouldRender) {
        render();
    }
}

// Render the initial to-do list
render();

function parseMarkdownNumberedList(text) {
    const items = [];

    // Split the text into lines
    const lines = text.split("\n");

    // Regex pattern to match numbered list items
    const pattern = /^\d+\. (.*)$/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // If the line matches the pattern, extract the text
        const match = line.match(pattern);
        if (match) {
            const text = match[1].trim();
            items.push({ text, done: false });
        }
    }

    return items;
}
