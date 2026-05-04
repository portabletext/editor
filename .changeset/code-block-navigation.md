---
"@portabletext/editor": patch
---

fix: let arrow keys and character delete navigate inside editable containers

Arrow keys (left, right, up, down) and character delete (Backspace, Delete) used to skip over the inside of an editable container's content, jumping past it to the next root-level block. They now navigate through container content the same way they navigate through root-level content: arrow keys move character by character through every line, Backspace and Delete remove one character at a time.
