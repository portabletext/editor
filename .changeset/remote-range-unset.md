---
'@portabletext/editor': patch
---

fix: preserve arrays in deep unsets and expand tuple ranges

A remote unset whose path continues past an array with a property name, such as `marks` followed by `"1:"`, turned the array into an object, and the editor crashed when it rendered the span. The array is now left unchanged. A remote unset whose last segment is an index range, such as `[1, '']`, removes the items it covers the way Content Lake does.
