# Field links

This note holds the field links followed from a note by the protocol of links. Each line names the form of its link.

1. Wikilink to a field: [[guidance.yml#subject.system]]
2. Wikilink to a row: [[guidance.yml#rows[1].name]]
3. Markdown link to a field: [system](guidance.yml#subject.system)
4. Markdown link to another folder: [aim](../gnomon/question.yml#task.epistemic_aim)
5. Markdown link with an encoded field path: [a key](links.yml#nested[%22a%20key%22])
6. Wikilink ending with a bracket: [[links.yml#foils[1]]]
7. Field absent from the record: [[guidance.yml#subject.missing]]
8. Malformed field path: [[guidance.yml#subject..system]]
9. Link by identifier: [aim by identifier](obsidian://ekphrasis?id=quest.pendulum.sustained-oscillation&field=task.epistemic_aim)
10. Link by identifier to an item: [foil](obsidian://ekphrasis?id=quest.pendulum.sustained-oscillation&field=subject.contrast.foil_set%5B1%5D)
11. Ambiguous identifier: [twin](obsidian://ekphrasis?id=scenario.twin)
12. Unknown identifier: [unknown](obsidian://ekphrasis?id=scenario.nobody)
13. URI without identifier: [missing identifier](obsidian://ekphrasis?field=task)
