## Summary

- 

## Validation

- [ ] `npm ci`
- [ ] `npm run lint`
- [ ] `npm run build-dev`
- [ ] `npm run test:unit`
- [ ] `npm run test:export-project`
- [ ] `npm run dist-preview`

## Dependency Update Checklist

- [ ] This PR does not auto-merge a major dependency update.
- [ ] Major updates are split into isolated reviewable PRs.
- [ ] Electron updates were validated with app launch, menus, dialogs, drag/drop, resources, `.fspy` open/save and JSON export.
- [ ] React/Konva updates were validated visually for vanishing points, horizon, origin, reference distance, overlay 3D and zoom/magnifying glass.
- [ ] React Redux updates keep `connect` unless a separate Redux migration is explicitly planned.
