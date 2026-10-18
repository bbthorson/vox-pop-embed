# Contributing

Thanks for looking. This repository is a **one-way mirror** of Vox Pop's private
monorepo, so a little works differently from a normal project.

- **Issues are welcome**: bugs, accessibility problems, browser quirks, ideas.
- **Pull requests are welcome too, but they aren't merged here.** If a change is
  accepted, it's re-applied in the monorepo with you credited as co-author
  (`Co-authored-by:`). It then comes back to this repository in the next sync,
  and the pull request is closed with a link to it.
- Anything pushed directly to this repository is overwritten by the next sync.

Before opening a pull request, please run:

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

The widget may only call endpoints in Vox Pop's public API contract
([voxpop.audio/developers](https://voxpop.audio/developers)). A change that needs
a new endpoint starts as an issue.

By contributing, you agree that your contribution is licensed under the
[MIT licence](LICENSE).
