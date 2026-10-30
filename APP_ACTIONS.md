# Browser actions

When adding or changing a form, import `registerAppAction` from
`src/lib/app-actions`. The helper has no model, browser automation or framework
dependency. It feature-detects WebMCP and leaves ordinary UI behavior intact.

Share validation and the real handler between the form and tool:

```tsx
const parseProfile = (input: unknown) => profileSchema.parse(input);
const saveProfile = async (input: ProfileInput) => {
  const saved = await authenticatedApi.saveProfile(input);
  setProfile(saved); // update the same visible UI
  return saved;
};
// Form: await saveProfile(parseProfile(formValues));
useEffect(() => {
  const registration = registerAppAction({
    name: 'save_profile',
    description: 'Save the current profile name.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', title: 'Name', minLength: 1 } },
      required: ['name'],
      additionalProperties: false,
    },
    parse: parseProfile,
    execute: saveProfile,
  });
  return registration.dispose;
}, [saveProfile]); // use stable callbacks; include every handler dependency
```

The schema describes inputs; `parse` and the server enforce them. Preserve
confirmation dialogs, authentication and authorization in the shared handler.
Register only currently available UI actions. Unmount aborts the registration;
it cannot undo a submitted write. Never retry a mutation after an unknown result.

Contract checks: reject invalid inputs before calling the handler; compare a
normal click and a registered call on separate disposable records; confirm the
visible result and persistence after reload; abort/unmount and prove the action
disappears. Test the UI in a browser without WebMCP too. A returned success string
is not evidence that the application saved anything.
