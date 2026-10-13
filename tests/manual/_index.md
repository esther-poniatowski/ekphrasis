---
tags:
  - index
aliases:
  - Manual tests
---
# Manual tests

The manual tests of ekphrasis verify inside Obsidian the behaviours that unit tests cannot reach, such as focus, rendering and changes made by other applications. Each protocol runs in the test vault built by `npm run test-vault`, and its ticks and observations record the outcome of each run.

- [Protocol of the bound form](protocols/bound-form.md): to verify the controls, the binding and the switch between views inside Obsidian.
- [Protocol of saving](protocols/saving.md): to verify the commits, the scalar styles and the changes made outside while a field holds the focus.
- [Protocol of validation](protocols/validation.md): to verify the issues displayed at fields and in group headings, their update after each commit, and the command *Validate instance*.
- [Scenario records](scenarios): to find the records and schemas written for the protocols, which the test vault copies at each build.
- [Settings of the test vault](vault-settings.json): to know the path rules and the commit delay from which every protocol starts.
