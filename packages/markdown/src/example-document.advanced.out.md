# An h1 header

Paragraphs are separated by a blank line.

2nd paragraph. _Italic_, **bold**, and `monospace`. Itemized lists<br />
look like:

- this one
- that one
- the other one

Note that — not considering the asterisk — the actual text<br />
content starts at 4-columns in.

> Block quotes are<br />
> written like so.
>
> They can span multiple paragraphs,<br />
> if you like.

Use 3 dashes for an em-dash. Use 2 dashes for ranges (ex., “it’s all<br />
in chapters 12–14”). Three dots … will be converted to an ellipsis.<br />
Unicode is supported. ☺

## An h2 header

Here’s a numbered list:

1. first item
2. second item
3. third item

Note again how the actual text starts at 4 columns in (4 characters<br />
from the left side). Here’s a code sample:

```
# Let me re-iterate ...
for i in 1 .. 10 { do-something(i) }
```

As you probably guessed, indented 4 spaces. By the way, instead of<br />
indenting the block, you can use delimited blocks, if you like:

```
define foobar() {
    print "Welcome to flavor country!";
}
```

(which makes copying & pasting easier). You can optionally mark the<br />
delimited block for Pandoc to syntax highlight it:

```python
import time
# Quick, count to ten!
for i in range(10):
    # (but not *too* quick)
    time.sleep(0.5)
    print i
```

### An h3 header

Now a nested list:

1. First, get these ingredients:
   - carrots
   - celery
   - lentils
2. Boil some water.
3. Dump everything in the pot and follow<br />
this algorithm:

```
find wooden spoon
uncover pot
stir
cover pot
balance wooden spoon precariously on pot handle
wait 10 minutes
goto first step (or shut off burner when done)
```

1. Do not bump wooden spoon or it will fall.

Notice again how text always lines up on 4-space indents (including<br />
that last line which continues item 3 above).

Here’s a link to [a website](http://foo.bar), to a [local<br />
doc](local-doc.html), and to a [section heading in the current<br />
doc](#an-h2-header). Here’s a footnote [^1].

[^1]: Footnote text goes here.

Tables can look like this:

size material color

---

9 leather brown<br />
10 hemp canvas natural<br />
11 glass transparent

Table: Shoes, their sizes, and what they’re made of

(The above is the caption for the table.) Pandoc also supports<br />
multi-line tables:

---

keyword text

---

red Sunsets, apples, and<br />
other red or reddish<br />
things.

green Leaves, grass, frogs<br />
and other things it’s<br />
not easy being.

---

A horizontal rule follows.

---

Here’s a definition list:

apples<br />
: Good for making applesauce.<br />
oranges<br />
: Citrus!<br />
tomatoes<br />
: There’s no “e” in tomatoe.

Again, text is indented 4 spaces. (Put a blank line between each<br />
term/definition pair to spread things out more.)

Here’s a “line block”:

| Line one<br />
| Line too<br />
| Line tree

and images can be specified like so:

![example image](example-image.jpg "An exemplary image")

Inline math equations go in like so: $\omega = d\phi / dt$. Display<br />
math should get its own line and be put in in double-dollarsigns:

$$I = \int \rho R^{2} dV$$

And note that you can backslash-escape any punctuation characters<br />
which you wish to be displayed literally, ex.: `foo`, *bar*, etc.
