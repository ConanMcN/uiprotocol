/**
 * Mock json-render specs that build a UI in a single declarative tree.
 * Each step sends one complete spec — json-render always creates a full surface.
 */

export const jsonRenderSteps = [
  {
    label: "1. Heading + card",
    messages: [
      {
        surfaceId: "profile-card",
        root: {
          type: "Container",
          direction: "column",
          gap: "16px",
          children: [
            {
              type: "Text",
              content: "User Profile",
              variant: "heading",
            },
            {
              type: "Card",
              children: [
                {
                  type: "Container",
                  direction: "column",
                  gap: "8px",
                  children: [
                    { type: "Text", content: "Jane Doe", variant: "body" },
                    {
                      type: "Badge",
                      label: "Active",
                      variant: "success",
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    ],
  },
  {
    label: "2. Add form fields",
    messages: [
      {
        surfaceId: "profile-card",
        state: { name: "Jane Doe", email: "jane@example.com" },
        root: {
          type: "Container",
          direction: "column",
          gap: "16px",
          children: [
            {
              type: "Text",
              content: "User Profile",
              variant: "heading",
            },
            {
              type: "Card",
              children: [
                {
                  type: "Container",
                  direction: "column",
                  gap: "12px",
                  children: [
                    {
                      type: "Container",
                      direction: "row",
                      gap: "8px",
                      children: [
                        { type: "Text", content: "Jane Doe", variant: "body" },
                        {
                          type: "Badge",
                          label: "Active",
                          variant: "success",
                        },
                      ],
                    },
                    {
                      type: "Input",
                      placeholder: "Full name",
                      bind: "/name",
                    },
                    {
                      type: "Input",
                      placeholder: "Email address",
                      bind: "/email",
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    ],
  },
  {
    label: "3. Add save button + status",
    messages: [
      {
        surfaceId: "profile-card",
        state: { name: "Jane Doe", email: "jane@example.com" },
        root: {
          type: "Container",
          direction: "column",
          gap: "16px",
          children: [
            {
              type: "Text",
              content: "User Profile",
              variant: "heading",
            },
            {
              type: "Card",
              children: [
                {
                  type: "Container",
                  direction: "column",
                  gap: "12px",
                  children: [
                    {
                      type: "Container",
                      direction: "row",
                      gap: "8px",
                      children: [
                        { type: "Text", content: "Jane Doe", variant: "body" },
                        {
                          type: "Badge",
                          label: "Active",
                          variant: "success",
                        },
                      ],
                    },
                    {
                      type: "Input",
                      placeholder: "Full name",
                      bind: "/name",
                    },
                    {
                      type: "Input",
                      placeholder: "Email address",
                      bind: "/email",
                    },
                    {
                      type: "Container",
                      direction: "row",
                      gap: "8px",
                      children: [
                        {
                          type: "Button",
                          label: "Save Changes",
                          action: { event: "save-profile" },
                        },
                        {
                          type: "Button",
                          label: "Cancel",
                          variant: "secondary",
                          action: { event: "cancel" },
                        },
                      ],
                    },
                    {
                      type: "Text",
                      content: "Last saved: just now",
                      variant: "caption",
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    ],
  },
];
