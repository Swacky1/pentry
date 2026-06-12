# Pentry demo — rendered to docs/demo.gif automatically by
# .github/workflows/demo.yml using VHS (https://github.com/charmbracelet/vhs).
# To regenerate locally: `vhs demo.tape` (needs the `pentry` CLI on PATH and the
# example server running on :4000).

Output docs/demo.gif

Require pentry

Set Shell bash
Set FontSize 19
Set Width 1240
Set Height 820
Set Theme "Dracula"
Set Padding 24
Set TypingSpeed 45ms

Hide
Type "clear" Enter
Show

Sleep 700ms
Type "pentry scan --config examples/basic/pentry.config.json"
Sleep 500ms
Enter
Sleep 8s
