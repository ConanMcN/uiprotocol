/**
 * Mock A2UI agent messages that simulate an AI agent building a UI.
 * Each step sends one or more messages to construct a todo-list surface.
 */

export const steps = [
  {
    label: "1. Create surface + layout",
    messages: [
      {
        version: "v0.9",
        createSurface: {
          surfaceId: "todo-app",
        },
      },
      {
        version: "v0.9",
        updateComponents: {
          surfaceId: "todo-app",
          components: [
            {
              id: "root",
              component: "Container",
              children: ["header"],
              direction: "column",
              gap: "16px",
            },
            {
              id: "header",
              component: "Text",
              content: "Todo List",
              variant: "heading",
            },
          ],
        },
      },
    ],
  },
  {
    label: "2. Add input row",
    messages: [
      {
        version: "v0.9",
        updateComponents: {
          surfaceId: "todo-app",
          components: [
            {
              id: "root",
              component: "Container",
              children: ["header", "input-row", "list"],
              direction: "column",
              gap: "16px",
            },
            {
              id: "input-row",
              component: "Container",
              children: ["input", "add-btn"],
              direction: "row",
              gap: "8px",
            },
            {
              id: "input",
              component: "Input",
              placeholder: "What needs to be done?",
              bind: "/newItem",
            },
            {
              id: "add-btn",
              component: "Button",
              label: "Add",
              action: { event: "add-todo" },
            },
            {
              id: "list",
              component: "Container",
              children: [],
              direction: "column",
              gap: "4px",
            },
          ],
        },
      },
    ],
  },
  {
    label: "3. Add todo items",
    messages: [
      {
        version: "v0.9",
        updateDataModel: {
          surfaceId: "todo-app",
          path: "/",
          value: { newItem: "", items: ["Buy groceries", "Walk the dog"] },
        },
      },
      {
        version: "v0.9",
        updateComponents: {
          surfaceId: "todo-app",
          components: [
            {
              id: "list",
              component: "Container",
              children: ["item-0", "item-1"],
              direction: "column",
              gap: "4px",
            },
            {
              id: "item-0",
              component: "Text",
              content: { path: "/items/0" },
              variant: "body",
            },
            {
              id: "item-1",
              component: "Text",
              content: { path: "/items/1" },
              variant: "body",
            },
          ],
        },
      },
    ],
  },
  {
    label: "4. Add status bar",
    messages: [
      {
        version: "v0.9",
        updateComponents: {
          surfaceId: "todo-app",
          components: [
            {
              id: "root",
              component: "Container",
              children: ["header", "input-row", "list", "status"],
              direction: "column",
              gap: "16px",
            },
            {
              id: "status",
              component: "Text",
              content: "2 items",
              variant: "caption",
            },
          ],
        },
      },
    ],
  },
];
